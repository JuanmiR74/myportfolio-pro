// =============================================================================
// usePriceUpdater.ts
//
// Hook reutilizable que encapsula toda la lógica de actualización de precios
// via Alpha Vantage. Puede usarse desde FundsTable, SettingsPanel o cualquier
// otro componente que necesite actualizar currentPrice de los assets.
//
// Alpha Vantage soporta búsqueda por ISIN a través del endpoint GLOBAL_QUOTE
// usando el símbolo. Primero hace SYMBOL_SEARCH con el ISIN para obtener el
// símbolo de mercado, luego GLOBAL_QUOTE para el precio.
//
// Plan gratuito: 25 req/día, 5 req/min → procesamos de 1 en 1 con pausa.
// =============================================================================

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Asset } from '@/types/portfolio';

interface PriceResult {
  ticker: string;   // ISIN / ticker del asset
  price:  number;
  symbol: string;   // símbolo de mercado encontrado (e.g. "VWCE.DEX")
}

interface UsePriceUpdaterOptions {
  apiKey:        string;
  assets:        Asset[];
  onUpdatePrices: (prices: Record<string, number>) => void;
}

export function usePriceUpdater({ apiKey, assets, onUpdatePrices }: UsePriceUpdaterOptions) {
  const [isUpdating,   setIsUpdating]   = useState(false);
  const [progress,     setProgress]     = useState(0);   // 0-100
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [errors,       setErrors]       = useState<string[]>([]);

  // ── Paso 1: buscar símbolo de mercado a partir de ISIN ──────────────────
  const searchSymbol = async (isin: string): Promise<string | null> => {
    try {
      const url =
        `https://www.alphavantage.co/query?function=SYMBOL_SEARCH` +
        `&keywords=${encodeURIComponent(isin)}` +
        `&apikey=${apiKey}`;
      const res  = await fetch(url);
      const data = await res.json();

      if (data['Note'] || data['Information']) {
        // Rate limit alcanzado
        throw new Error('rate_limit');
      }

      const matches = data['bestMatches'] ?? [];
      if (matches.length === 0) return null;

      // Preferir mercados europeos (LSE, Xetra, Euronext) para fondos UCITS
      const preferred = matches.find((m: any) =>
        /\.DEX|\.LON|\.EPA|\.AMS|\.MIL|\.PAR/i.test(m['1. symbol'] ?? '')
      );
      return (preferred ?? matches[0])['1. symbol'] ?? null;
    } catch (err: any) {
      if (err.message === 'rate_limit') throw err;
      return null;
    }
  };

  // ── Paso 2: obtener precio actual del símbolo ────────────────────────────
  const fetchPrice = async (symbol: string): Promise<number | null> => {
    try {
      const url =
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE` +
        `&symbol=${encodeURIComponent(symbol)}` +
        `&apikey=${apiKey}`;
      const res  = await fetch(url);
      const data = await res.json();

      if (data['Note'] || data['Information']) throw new Error('rate_limit');

      const quote = data['Global Quote'] ?? {};
      const price = parseFloat(quote['05. price'] ?? '');
      return isNaN(price) ? null : price;
    } catch (err: any) {
      if (err.message === 'rate_limit') throw err;
      return null;
    }
  };

  // ── Pausa entre requests para respetar el límite de 5 req/min ───────────
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ── Función principal: actualizar todos los assets con ISIN ──────────────
  const updatePrices = useCallback(async () => {
    if (!apiKey || apiKey.trim() === '') {
      toast.error('Configura tu API Key de Alpha Vantage en Configuración');
      return;
    }

    // Solo assets que tienen ISIN (los fondos) y shares > 0
    const fundAssets = assets.filter(a => a.isin && a.isin.length > 0 && a.shares > 0);

    if (fundAssets.length === 0) {
      toast.info('No hay fondos con ISIN para actualizar');
      return;
    }

    setIsUpdating(true);
    setProgress(0);
    setErrors([]);

    const results: PriceResult[] = [];
    const newErrors:  string[]   = [];
    const total = fundAssets.length;

    // Deduplicar por ISIN para no llamar dos veces al mismo fondo
    const uniqueIsins = [...new Map(fundAssets.map(a => [a.isin!, a])).values()];

    for (let i = 0; i < uniqueIsins.length; i++) {
      const asset = uniqueIsins[i];
      const isin  = asset.isin!;

      try {
        // Paso 1: buscar símbolo
        const symbol = await searchSymbol(isin);
        await sleep(1200); // respetar 5 req/min (12s entre pares de llamadas)

        if (!symbol) {
          newErrors.push(`${asset.name || isin}: símbolo no encontrado`);
          setProgress(Math.round(((i + 1) / uniqueIsins.length) * 100));
          continue;
        }

        // Paso 2: obtener precio
        const price = await fetchPrice(symbol);
        await sleep(1200);

        if (price === null || price <= 0) {
          newErrors.push(`${asset.name || isin}: precio no disponible (${symbol})`);
        } else {
          results.push({ ticker: asset.ticker, price, symbol });
        }
      } catch (err: any) {
        if (err.message === 'rate_limit') {
          toast.error('Límite de API alcanzado. Espera un minuto e inténtalo de nuevo.');
          break;
        }
        newErrors.push(`${asset.name || isin}: error de conexión`);
      }

      setProgress(Math.round(((i + 1) / uniqueIsins.length) * 100));
    }

    // Aplicar todos los precios de golpe
    if (results.length > 0) {
      const priceMap: Record<string, number> = {};
      results.forEach(r => { priceMap[r.ticker] = r.price; });
      onUpdatePrices(priceMap);

      setLastUpdated(new Date());
      toast.success(
        `${results.length} precio${results.length !== 1 ? 's' : ''} actualizado${results.length !== 1 ? 's' : ''}` +
        (newErrors.length > 0 ? ` · ${newErrors.length} sin datos` : '')
      );
    } else if (newErrors.length > 0) {
      toast.error('No se pudo obtener ningún precio. Revisa tu API Key.');
    }

    setErrors(newErrors);
    setIsUpdating(false);
    setProgress(0);
  }, [apiKey, assets, onUpdatePrices]);

  return {
    updatePrices,
    isUpdating,
    progress,
    lastUpdated,
    errors,
  };
}
