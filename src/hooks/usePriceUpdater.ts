// =============================================================================
// usePriceUpdater.ts
// =============================================================================

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Asset } from '@/types/portfolio';

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------
export interface PriceUpdateResult {
  assetId:      string;
  name:         string;
  ticker:       string;
  marketSymbol: string;
  oldPrice:     number;
  newPrice:     number;
  change:       number;
  changePct:    number;
  ok:           true;
}

export interface PriceUpdateError {
  assetId: string;
  name:    string;
  ticker:  string;
  reason:  string;
  ok:      false;
}

export type PriceUpdateItem = PriceUpdateResult | PriceUpdateError;

export interface UsePriceUpdaterReturn {
  updatePrices: () => Promise<void>;
  isUpdating:   boolean;
  progress:     number;
  lastUpdated:  Date | null;
  lastResults:  PriceUpdateItem[];
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

  // Alpha Vantage: buscar símbolo desde ISIN
  const searchSymbol = async (isin: string): Promise<string | null> => {
    const url =
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH` +
      `&keywords=${encodeURIComponent(isin)}&apikey=${apiKey}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data['Note'] || data['Information']) throw new Error('rate_limit');
    const matches = (data['bestMatches'] ?? []) as any[];
    if (!matches.length) return null;
    const pref = matches.find((m: any) =>
      /\.DEX|\.LON|\.EPA|\.AMS|\.MIL|\.PAR|\.STO/i.test(m['1. symbol'] ?? '')
    );
    return ((pref ?? matches[0])['1. symbol'] ?? null) as string | null;
  };

  // Alpha Vantage: precio actual
  const fetchPrice = async (symbol: string): Promise<number | null> => {
    const url =
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE` +
      `&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data['Note'] || data['Information']) throw new Error('rate_limit');
    const price = parseFloat(data['Global Quote']?.['05. price'] ?? '');
    return isNaN(price) || price <= 0 ? null : price;
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Función principal
  const updatePrices = useCallback(async () => {
    if (!apiKey?.trim()) {
      toast.error('Configura tu Alpha Vantage API Key en Configuración');
      return;
    }

    // Filtrar solo fondos (MyInvestor/BBK) con ISIN, deduplicados por ISIN
    const fundTypes = new Set(['Fondos MyInvestor', 'Fondos BBK']);
    const toUpdate = [
      ...new Map(
        assets
          .filter(a => fundTypes.has(a.type) && a.isin && a.isin.trim() && a.shares > 0)
          .map(a => [a.isin!, a])
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
    let rateLimitHit = false;

    try {
      for (let i = 0; i < toUpdate.length; i++) {
        if (rateLimitHit) {
          const a = toUpdate[i];
          results.push({ assetId: a.id, name: a.name || a.isin!, ticker: a.ticker, reason: 'No procesado (límite de API alcanzado)', ok: false });
          continue;
        }

        const asset    = toUpdate[i];
        const isin     = asset.isin!;
        const name     = asset.name || isin;
        const savedSym = (asset as any).marketSymbol as string | undefined;

        try {
          let symbol = savedSym || '';

          if (!symbol) {
            symbol = (await searchSymbol(isin)) ?? '';
            await sleep(1300);
          }

          if (!symbol) {
            results.push({ assetId: asset.id, name, ticker: asset.ticker, reason: 'Símbolo de mercado no encontrado. Edita el fondo y añádelo manualmente.', ok: false });
            setProgress(Math.round(((i + 1) / toUpdate.length) * 100));
            continue;
          }

          const newPrice = await fetchPrice(symbol);
          if (!savedSym) await sleep(1300);

          if (newPrice === null) {
            results.push({ assetId: asset.id, name, ticker: asset.ticker, reason: `Precio no disponible para el símbolo ${symbol}`, ok: false });
          } else {
            const oldPrice  = asset.currentPrice ?? 0;
            priceMap[asset.ticker]  = newPrice;
            symbolMap[asset.ticker] = symbol;
            results.push({
              assetId: asset.id, name, ticker: asset.ticker,
              marketSymbol: symbol, oldPrice, newPrice,
              change:    newPrice - oldPrice,
              changePct: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0,
              ok: true,
            });
          }
        } catch (err: any) {
          if (err.message === 'rate_limit') {
            rateLimitHit = true;
            results.push({ assetId: asset.id, name, ticker: asset.ticker, reason: 'Límite de API alcanzado (25 req/día en plan gratuito). Espera un minuto.', ok: false });
          } else {
            results.push({ assetId: asset.id, name, ticker: asset.ticker, reason: `Error de red: ${err.message}`, ok: false });
          }
        }

        setProgress(Math.round(((i + 1) / toUpdate.length) * 100));
      }

      if (Object.keys(priceMap).length > 0) {
        onUpdatePrices(priceMap, symbolMap);
        setLastUpdated(new Date());
      }

      setLastResults(results);

      const okCount  = results.filter(r => r.ok).length;
      const errCount = results.filter(r => !r.ok).length;
      if (okCount > 0) {
        toast.success(`${okCount} precio${okCount !== 1 ? 's' : ''} actualizado${okCount !== 1 ? 's' : ''}${errCount > 0 ? ` · ${errCount} con errores` : ''}`);
      } else {
        toast.error('No se pudo actualizar ningún precio. Revisa tu API Key o los símbolos de mercado.');
      }

    } finally {
      setIsUpdating(false);
      setProgress(0);
    }
  }, [apiKey, assets, onUpdatePrices]);

  return { updatePrices, isUpdating, progress, lastUpdated, lastResults };
}
