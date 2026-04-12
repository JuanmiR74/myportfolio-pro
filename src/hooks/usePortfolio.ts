import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Asset, RoboAdvisor, PortfolioState, FundClassification, ThreeDimensionClassification, RoboSubFund, IsinEntry } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const EMPTY_STATE: PortfolioState = {
  assets: [],
  roboAdvisors: [],
  cashBalance: 0,
  apiKey: '',
  historicalData: [],
  isinLibrary: [],
};

function emptyThreeDim(): ThreeDimensionClassification {
  return { geography: [], sectors: [], assetClassPro: [] };
}

export function usePortfolio() {
  const { user } = useAuth();
  const [state, setState] = useState<PortfolioState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load full portfolio document on mount
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      try {
        const { data, error } = await (supabase
          .from('user_portfolio')
          .select('data')
          .eq('user_id', user.id)
          .maybeSingle() as any);

        if (error) {
          toast.error(`Error cargando cartera: ${error.message}`);
          return;
        }

        if (data?.data) {
          const parsed = data.data as Partial<PortfolioState>;
          setState({
            assets: parsed.assets || [],
            roboAdvisors: parsed.roboAdvisors || [],
            cashBalance: parsed.cashBalance ?? 0,
            apiKey: parsed.apiKey || '',
            historicalData: parsed.historicalData || [],
            isinLibrary: parsed.isinLibrary || [],
          });
        }
      } catch (err: any) {
        toast.error(`Error cargando cartera: ${err?.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // Persist the full state document to Supabase (debounced)
  const savePortfolio = useCallback((newState: PortfolioState) => {
    if (!user) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const { error } = await (supabase
        .from('user_portfolio')
        .upsert({ user_id: user.id, data: newState as any, updated_at: new Date().toISOString() }) as any);

      if (error) {
        console.error('Error saving portfolio:', error.message);
      }
    }, 600);
  }, [user]);

  // Helper: update state and schedule a save
  const mutate = useCallback((updater: (prev: PortfolioState) => PortfolioState) => {
    setState(prev => {
      const next = updater(prev);
      savePortfolio(next);
      return next;
    });
  }, [savePortfolio]);

  const addAsset = useCallback((asset: Omit<Asset, 'id'>) => {
    if (!user) return;
    const newAsset: Asset = { ...asset, id: crypto.randomUUID(), threeDim: asset.threeDim || emptyThreeDim() };
    mutate(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
  }, [user, mutate]);

  const removeAsset = useCallback((id: string) => {
    if (!user) return;
    mutate(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  }, [user, mutate]);

  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    if (!user) return;
    mutate(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? { ...a, ...updates } : a) }));
  }, [user, mutate]);

  const updateAssetClassification = useCallback((id: string, classification: FundClassification) => {
    updateAsset(id, { classification });
  }, [updateAsset]);

  const updateAssetThreeDim = useCallback((id: string, threeDim: ThreeDimensionClassification) => {
    updateAsset(id, { threeDim });
  }, [updateAsset]);

  const addRoboAdvisor = useCallback((robo: Omit<RoboAdvisor, 'id'>) => {
    if (!user) return;
    const newRobo: RoboAdvisor = { ...robo, id: crypto.randomUUID(), threeDim: robo.threeDim || emptyThreeDim() };
    mutate(prev => ({ ...prev, roboAdvisors: [...prev.roboAdvisors, newRobo] }));
  }, [user, mutate]);

  const updateRoboAdvisor = useCallback((id: string, updates: Partial<RoboAdvisor>) => {
    if (!user) return;
    mutate(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.map(r => r.id === id ? { ...r, ...updates } : r) }));
  }, [user, mutate]);

  const updateRoboThreeDim = useCallback((id: string, threeDim: ThreeDimensionClassification) => {
    updateRoboAdvisor(id, { threeDim });
  }, [updateRoboAdvisor]);

  const updateRoboSubFunds = useCallback((id: string, subFunds: RoboSubFund[]) => {
    updateRoboAdvisor(id, { subFunds });
  }, [updateRoboAdvisor]);

  const removeRoboAdvisor = useCallback((id: string) => {
    if (!user) return;
    mutate(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.filter(r => r.id !== id) }));
  }, [user, mutate]);

  const setApiKey = useCallback((apiKey: string) => {
    if (!user) return;
    mutate(prev => ({ ...prev, apiKey }));
  }, [user, mutate]);

  const setCashBalance = useCallback((cashBalance: number) => {
    if (!user) return;
    mutate(prev => ({ ...prev, cashBalance }));
  }, [user, mutate]);

  const getByIsin = useCallback((isin: string): IsinEntry | undefined => {
    return state.isinLibrary.find(e => e.isin === isin);
  }, [state.isinLibrary]);

  const upsertIsin = useCallback((entry: Omit<IsinEntry, 'id'> & { id?: string }) => {
    if (!user) return;
    mutate(prev => {
      const existing = prev.isinLibrary.find(e => e.isin === entry.isin);
      if (existing) {
        return {
          ...prev,
          isinLibrary: prev.isinLibrary.map(e =>
            e.isin === entry.isin ? { ...e, ...entry, id: e.id } : e
          ),
        };
      }
      const newEntry: IsinEntry = { ...entry, id: entry.id || crypto.randomUUID() };
      return { ...prev, isinLibrary: [...prev.isinLibrary, newEntry] };
    });
  }, [user, mutate]);

  const updateIsinClassification = useCallback((isin: string, threeDim: ThreeDimensionClassification) => {
    if (!user) return;
    mutate(prev => ({
      ...prev,
      isinLibrary: prev.isinLibrary.map(e =>
        e.isin === isin
          ? { ...e, geography: threeDim.geography, sectors: threeDim.sectors, assetClassPro: threeDim.assetClassPro }
          : e
      ),
    }));
  }, [user, mutate]);

  const deleteIsin = useCallback((id: string) => {
    if (!user) return;
    mutate(prev => ({ ...prev, isinLibrary: prev.isinLibrary.filter(e => e.id !== id) }));
  }, [user, mutate]);

  const updatePrices = useCallback((prices: Record<string, number>) => {
    if (!user) return;
    mutate(prev => ({
      ...prev,
      assets: prev.assets.map(a => prices[a.ticker] !== undefined ? { ...a, currentPrice: prices[a.ticker] } : a),
    }));
  }, [user, mutate]);

  const summary = useMemo(() => {
    const assetsValue = state.assets.reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const assetsCost = state.assets.reduce((s, a) => s + a.shares * a.buyPrice, 0);
    const robosValue = state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0);
    const robosInvested = state.roboAdvisors.reduce((s, r) => s + r.investedValue, 0);
    const totalValue = assetsValue + robosValue + state.cashBalance;
    const totalInvested = assetsCost + robosInvested + state.cashBalance;
    const totalPL = totalValue - totalInvested;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    
    // CORRECCIÓN 1: Eliminar dayChange aleatorio
    // En el futuro se puede calcular con datos reales de API de mercado
    const dayChange = 0;
    
    // CORRECCIÓN 2: Calcular XIRR usando fechas reales de compra
    // Se usa un enfoque simplificado: promedio ponderado de días desde cada compra
    let xirr = 0;
    if (totalInvested > 0 && state.assets.length > 0) {
      const today = new Date();
      let weightedDays = 0;
      let totalWeight = 0;
      
      state.assets.forEach(asset => {
        const investmentAmount = asset.shares * asset.buyPrice;
        if (asset.buyDate) {
          const purchaseDate = new Date(asset.buyDate);
          const daysSincePurchase = Math.max(1, (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
          weightedDays += daysSincePurchase * investmentAmount;
          totalWeight += investmentAmount;
        }
      });
      
      // Si no hay fechas, usar fecha por defecto (1 año atrás)
      const avgDays = totalWeight > 0 ? weightedDays / totalWeight : 365;
      xirr = avgDays > 0 ? (Math.pow(totalValue / totalInvested, 365 / avgDays) - 1) * 100 : 0;
    } else if (totalInvested > 0) {
      // Sin activos individuales (solo robos/cash), asumir 1 año
      xirr = (Math.pow(totalValue / totalInvested, 1) - 1) * 100;
    }
    
    return { totalValue, totalInvested, totalPL, totalPLPercent, dayChange, assetsValue, robosValue, cashBalance: state.cashBalance, xirr };
  }, [state]);

  const distribution = useMemo(() => {
    const fondosMyInvestor = state.assets.filter(a => a.type === 'Fondos MyInvestor').reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const fondosBBK = state.assets.filter(a => a.type === 'Fondos BBK').reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const robos = state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0);
    const acciones = state.assets.filter(a => a.type === 'Acciones').reduce((s, a) => s + a.shares * a.currentPrice, 0);
    return [
      { name: 'Fondos MyInvestor', value: fondosMyInvestor, fill: 'hsl(160, 84%, 39%)' },
      { name: 'Fondos BBK', value: fondosBBK, fill: 'hsl(217, 91%, 60%)' },
      { name: 'Robo-Advisors', value: robos, fill: 'hsl(47, 96%, 53%)' },
      { name: 'Acciones', value: acciones, fill: 'hsl(280, 65%, 60%)' },
      { name: 'Efectivo', value: state.cashBalance, fill: 'hsl(0, 0%, 60%)' },
    ].filter(d => d.value > 0);
  }, [state]);

  const getXrayByEntity = useCallback((entity: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors') => {
    const geoTotals: Record<string, number> = {};
    const sectorTotals: Record<string, number> = {};
    const acpTotals: Record<string, number> = {};

    const filteredAssets = entity === 'all' ? state.assets
      : entity === 'MyInvestor' ? state.assets.filter(a => a.type === 'Fondos MyInvestor')
      : entity === 'BBK' ? state.assets.filter(a => a.type === 'Fondos BBK')
      : [];

    filteredAssets.forEach(a => {
      const value = a.shares * a.currentPrice;
      const td = a.threeDim;
      if (td?.geography?.length) {
        td.geography.forEach(g => { geoTotals[g.name] = (geoTotals[g.name] || 0) + value * g.weight / 100; });
      } else { geoTotals['Sin clasificar'] = (geoTotals['Sin clasificar'] || 0) + value; }
      if (td?.sectors?.length) {
        td.sectors.forEach(s => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + value * s.weight / 100; });
      } else { sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + value; }
      if (td?.assetClassPro?.length) {
        td.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + value * ac.weight / 100; });
      } else { acpTotals['Sin clasificar'] = (acpTotals['Sin clasificar'] || 0) + value; }
    });

    // Build a fast lookup for the ISIN library
    const isinMap = new Map(state.isinLibrary.map(e => [e.isin, e]));

    const applyEntry = (entry: typeof state.isinLibrary[0] | undefined, amount: number) => {
      if (entry?.geography?.length) {
        entry.geography.forEach(g => { geoTotals[g.name] = (geoTotals[g.name] || 0) + amount * g.weight / 100; });
      } else { geoTotals['Sin clasificar'] = (geoTotals['Sin clasificar'] || 0) + amount; }
      if (entry?.sectors?.length) {
        entry.sectors.forEach(s => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + amount * s.weight / 100; });
      } else { sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + amount; }
      if (entry?.assetClassPro?.length) {
        entry.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + amount * ac.weight / 100; });
      } else { acpTotals['Sin clasificar'] = (acpTotals['Sin clasificar'] || 0) + amount; }
    };

    const filteredRobos = (entity === 'all' || entity === 'Robo-Advisors') ? state.roboAdvisors : [];
    filteredRobos.forEach(r => {
      const value = r.totalValue;
      const hasSubFunds = r.subFunds && r.subFunds.length > 0;

      if (hasSubFunds) {
        // Always use isinLibrary for subFund classification — ignore legacy threeDim on the subFund
        r.subFunds!.forEach(sf => {
          const sfValue = value * sf.weightPct / 100;
          const entry = sf.isin ? isinMap.get(sf.isin.toUpperCase()) : undefined;
          applyEntry(entry, sfValue);
        });
      } else {
        // No subFunds: fall back to robo-level threeDim classification
        const td = r.threeDim;
        if (td?.geography?.length) {
          td.geography.forEach(g => { geoTotals[g.name] = (geoTotals[g.name] || 0) + value * g.weight / 100; });
        } else { geoTotals['Sin clasificar'] = (geoTotals['Sin clasificar'] || 0) + value; }
        if (td?.sectors?.length) {
          td.sectors.forEach(s => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + value * s.weight / 100; });
        } else { sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + value; }
        if (td?.assetClassPro?.length) {
          td.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + value * ac.weight / 100; });
        } else { acpTotals['Sin clasificar'] = (acpTotals['Sin clasificar'] || 0) + value; }
      }
    });

    if (entity === 'all' && state.cashBalance > 0) {
      acpTotals['Monetario'] = (acpTotals['Monetario'] || 0) + state.cashBalance;
    }

    const geoColors: Record<string, string> = {
      'EEUU': 'hsl(210, 80%, 50%)', 'Europa': 'hsl(160, 84%, 39%)', 'Emergentes': 'hsl(25, 95%, 53%)',
      'Japón': 'hsl(0, 70%, 55%)', 'Asia-Pacífico': 'hsl(280, 65%, 60%)', 'Global': 'hsl(217, 91%, 60%)',
      'Otro': 'hsl(0, 0%, 60%)', 'Sin clasificar': 'hsl(0, 0%, 50%)',
    };
    const sectorColors: Record<string, string> = {
      'Tecnología': 'hsl(260, 70%, 60%)', 'Salud': 'hsl(340, 75%, 55%)', 'Financiero': 'hsl(210, 80%, 50%)',
      'Energía': 'hsl(30, 90%, 50%)', 'Consumo': 'hsl(160, 70%, 45%)', 'Industria': 'hsl(190, 70%, 45%)',
      'Infraestructuras': 'hsl(180, 60%, 40%)', 'Commodities': 'hsl(47, 96%, 53%)', 'Inmobiliario': 'hsl(15, 70%, 50%)',
      'Telecomunicaciones': 'hsl(240, 60%, 55%)', 'Otro': 'hsl(0, 0%, 60%)', 'Sin clasificar': 'hsl(0, 0%, 50%)',
    };
    const acpColors: Record<string, string> = {
      'RV - Growth': 'hsl(25, 95%, 53%)', 'RV - Value': 'hsl(35, 90%, 50%)', 'RV - Large Cap': 'hsl(15, 85%, 55%)',
      'RV - Mid/Small Cap': 'hsl(45, 90%, 50%)', 'RV - Blend': 'hsl(20, 95%, 53%)',
      'RF - Sovereign': 'hsl(217, 91%, 60%)', 'RF - Corporate': 'hsl(200, 80%, 55%)', 'RF - High Yield': 'hsl(230, 70%, 55%)',
      'RF - Corto Plazo': 'hsl(195, 75%, 50%)', 'RF - Largo Plazo': 'hsl(210, 85%, 50%)',
      'Monetario': 'hsl(160, 84%, 39%)', 'Commodities': 'hsl(47, 96%, 53%)', 'Mixto': 'hsl(280, 65%, 60%)',
      'Sin clasificar': 'hsl(0, 0%, 50%)',
    };

    const toItems = (totals: Record<string, number>, colors: Record<string, string>) =>
      Object.entries(totals).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, fill: colors[name] || 'hsl(0,0%,50%)' }));

    return {
      geography: toItems(geoTotals, geoColors),
      sector: toItems(sectorTotals, sectorColors),
      assetClassPro: toItems(acpTotals, acpColors),
    };
  }, [state]);

  return {
    ...state,
    loading,
    summary,
    distribution,
    getXrayByEntity,
    addAsset,
    removeAsset,
    updateAsset,
    updateAssetClassification,
    updateAssetThreeDim,
    addRoboAdvisor,
    updateRoboAdvisor,
    updateRoboThreeDim,
    updateRoboSubFunds,
    removeRoboAdvisor,
    setApiKey,
    setCashBalance,
    updatePrices,
    getByIsin,
    upsertIsin,
    updateIsinClassification,
    deleteIsin,
  };
}
