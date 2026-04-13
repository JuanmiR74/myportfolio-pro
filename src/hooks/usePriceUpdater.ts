// =============================================================================
// usePriceUpdater.ts
//
// Cambios respecto a la versión anterior:
// 1. Si el asset ya tiene marketSymbol → salta SYMBOL_SEARCH, va directo a GLOBAL_QUOTE
// 2. Persiste el marketSymbol encontrado en el asset (via symbols map)
// 3. Devuelve resultados detallados para mostrar en modal
// =============================================================================

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Asset } from '@/types/portfolio';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface PriceUpdateResult {
  assetId:       string;
  name:          string;
  ticker:        string;
  marketSymbol:  string;
  oldPrice:      number;
  newPrice:      number;
  change:        number;    // absoluto
  changePct:     number;    // %
  ok:            true;
}

export interface PriceUpdateError {
  assetId:  string;
  name:     string;
  ticker:   string;
  reason:   string;
  ok:       false;
}

export type PriceUpdateItem = PriceUpdateResult | PriceUpdateError;

export interface UsePriceUpdaterReturn {
  updatePrices:  () => Promise<void>;
  isUpdating:    boolean;
  progress:      number;
  lastUpdated:   Date | null;
  lastResults:   PriceUpdateItem[];
}

interface Options {
  apiKey:         string;
  assets:         Asset[];
  onUpdatePrices: (prices: Record<string, number>, symbols: Record<string, string>) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function usePriceUpdater({ apiKey, assets, onUpdatePrices }: Options): UsePriceUpdaterReturn {
  const [isUpdating,  setIsUpdating]  = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastResults, setLastResults] = useState<PriceUpdateItem[]>([]);

  // ── Alpha Vantage: buscar símbolo desde ISIN ────────────────────────────
  const searchSymbol = async (isin: string): Promise<string | null> => {
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(isin)}&apikey=${apiKey}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data['Note'] || data['Information']) throw new Error('rate_limit');

    const matches = (data['bestMatches'] ?? []) as any[];
    if (!matches.length) return null;

    // Preferir mercados europeos para fondos UCITS
    const pref = matches.find(m => /\.DEX|\.LON|\.EPA|\.AMS|\.MIL|\.PAR|\.STO/i.test(m['1. symbol'] ?? ''));
    return ((pref ?? matches[0])['1. symbol'] ?? null) as string | null;
  };

  // ── Alpha Vantage: obtener precio actual ────────────────────────────────
  const fetchPrice = async (symbol: string): Promise<number | null> => {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data['Note'] || data['Information']) throw new Error('rate_limit');

    const price = parseFloat(data['Global Quote']?.['05. price'] ?? '');
    return isNaN(price) || price <= 0 ? null : price;
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ── Función principal ────────────────────────────────────────────────────
  const updatePrices = useCallback(async () => {
    if (!apiKey?.trim()) {
      toast.error('Configura tu Alpha Vantage API Key en Configuración');
      return;
    }

    // Fondos con ISIN (deduplicados por ISIN)
    const toUpdate = [
      ...new Map(
        assets.filter(a => a.isin && a.shares > 0).map(a => [a.isin, a])
      ).values(),
    ];

    if (!toUpdate.length) {
      toast.info('No hay fondos con ISIN para actualizar');
      return;
    }

    setIsUpdating(true);
    setProgress(0);
    setLastResults([]);

    const priceMap:  Record<string, number> = {};
    const symbolMap: Record<string, string> = {};
    const results:   PriceUpdateItem[]      = [];

    for (let i = 0; i < toUpdate.length; i++) {
      const asset = toUpdate[i];
      const isin  = asset.isin!;
      const name  = asset.name || isin;

      try {
        // Si ya tiene símbolo guardado → no buscar, usar directamente
        let symbol = (asset as any).marketSymbol as string | undefined;

        if (!symbol) {
          symbol = await searchSymbol(isin) ?? undefined;
          await sleep(1300); // respetar 5 req/min
        }

        if (!symbol) {
          results.push({ assetId: asset.id, name, ticker: asset.ticker, reason: 'Símbolo de mercado no encontrado para este ISIN', ok: false });
          setProgress(Math.round(((i + 1) / toUpdate.length) * 100));
          continue;
        }

        const newPrice = await fetchPrice(symbol);
        if (symbol !== (asset as any).marketSymbol) await sleep(1300); // solo si hicimos 2 llamadas

        if (newPrice === null) {
          results.push({ assetId: asset.id, name, ticker: asset.ticker, reason: `Precio no disponible (símbolo: ${symbol})`, ok: false });
        } else {
          const oldPrice  = asset.currentPrice ?? 0;
          const change    = newPrice - oldPrice;
          const changePct = oldPrice > 0 ? (change / oldPrice) * 100 : 0;
          priceMap[asset.ticker]  = newPrice;
          symbolMap[asset.ticker] = symbol;
          results.push({ assetId: asset.id, name, ticker: asset.ticker, marketSymbol: symbol, oldPrice, newPrice, change, changePct, ok: true });
        }
      } catch (err: any) {
        if (err.message === 'rate_limit') {
          results.push({ assetId: asset.id, name, ticker: asset.ticker, reason: 'Límite de API alcanzado (25 req/día en plan gratuito)', ok: false });
          // Marcar el resto como no procesados
          for (let j = i + 1; j < toUpdate.length; j++) {
            const a = toUpdate[j];
            results.push({ assetId: a.id, name: a.name || a.isin!, ticker: a.ticker, reason: 'No procesado (límite de API)', ok: false });
          }
          break;
        }
        results.push({ assetId: asset.id, name, ticker: asset.ticker, reason: `Error de red: ${err.message}`, ok: false });
      }

      setProgress(Math.round(((i + 1) / toUpdate.length) * 100));
    }

    // Aplicar precios y símbolos
    if (Object.keys(priceMap).length > 0) {
      onUpdatePrices(priceMap, symbolMap);
      setLastUpdated(new Date());
    }

    setLastResults(results);
    setIsUpdating(false);
    setProgress(0);

    // Toast resumen
    const ok  = results.filter(r => r.ok).length;
    const err = results.filter(r => !r.ok).length;
    if (ok > 0) {
      toast.success(`${ok} precio${ok !== 1 ? 's' : ''} actualizado${ok !== 1 ? 's' : ''}${err > 0 ? ` · ${err} con errores` : ''}`);
    } else {
      toast.error('No se pudo actualizar ningún precio');
    }
  }, [apiKey, assets, onUpdatePrices]);

  return { updatePrices, isUpdating, progress, lastUpdated, lastResults };
}
