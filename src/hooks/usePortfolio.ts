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

// ---- DB row <-> domain converters ----

function rowToAsset(row: any): Asset {
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker,
    isin: row.isin || undefined,
    entity: row.entity || undefined,
    type: row.type as Asset['type'],
    shares: Number(row.shares),
    buyPrice: Number(row.buy_price),
    currentPrice: Number(row.current_price),
    threeDim: {
      geography: Array.isArray(row.geography) ? row.geography : [],
      sectors: Array.isArray(row.sectors) ? row.sectors : [],
      assetClassPro: Array.isArray(row.asset_class_pro) ? row.asset_class_pro : [],
    },
  };
}

function assetToRow(a: Asset, userId: string) {
  return {
    id: a.id,
    user_id: userId,
    name: a.name,
    ticker: a.ticker,
    isin: a.isin || null,
    entity: a.entity || '',
    type: a.type,
    shares: a.shares,
    buy_price: a.buyPrice,
    current_price: a.currentPrice,
    geography: a.threeDim?.geography || [],
    sectors: a.threeDim?.sectors || [],
    asset_class_pro: a.threeDim?.assetClassPro || [],
  };
}

function rowToRobo(row: any): RoboAdvisor {
  return {
    id: row.id,
    name: row.name,
    entity: row.entity || '',
    totalValue: Number(row.total_value),
    investedValue: Number(row.invested_value),
    lastUpdated: row.last_updated || '',
    allocations: Array.isArray(row.allocations) ? row.allocations : [],
    sectorAllocations: Array.isArray(row.sector_allocations) ? row.sector_allocations : [],
    movements: Array.isArray(row.movements) ? row.movements : [],
    subFunds: Array.isArray(row.sub_funds) ? row.sub_funds : [],
    threeDim: {
      geography: Array.isArray(row.geography) ? row.geography : [],
      sectors: Array.isArray(row.sectors) ? row.sectors : [],
      assetClassPro: Array.isArray(row.asset_class_pro) ? row.asset_class_pro : [],
    },
  };
}

function roboToRow(r: RoboAdvisor, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    name: r.name,
    entity: r.entity,
    total_value: r.totalValue,
    invested_value: r.investedValue,
    last_updated: r.lastUpdated || null,
    allocations: r.allocations || [],
    sector_allocations: r.sectorAllocations || [],
    movements: r.movements || [],
    sub_funds: r.subFunds || [],
    geography: r.threeDim?.geography || [],
    sectors: r.threeDim?.sectors || [],
    asset_class_pro: r.threeDim?.assetClassPro || [],
  };
}

export function usePortfolio() {
  const { user } = useAuth();
  const [state, setState] = useState<PortfolioState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  // Load from relational tables on mount
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      try {
        const [assetsRes, robosRes, settingsRes, isinRes] = await Promise.all([
          supabase.from('assets').select('*').eq('user_id', user.id),
          supabase.from('robo_advisors').select('*').eq('user_id', user.id),
          supabase.from('portfolio_settings').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('isin_library').select('*').eq('user_id', user.id),
        ]);

        setState({
          assets: (assetsRes.data || []).map(rowToAsset),
          roboAdvisors: (robosRes.data || []).map(rowToRobo),
          cashBalance: Number(settingsRes.data?.cash_balance ?? 0),
          apiKey: settingsRes.data?.api_key || '',
          historicalData: Array.isArray(settingsRes.data?.historical_data) ? settingsRes.data.historical_data as any : [],
          isinLibrary: (isinRes.data || []).map((r: any): IsinEntry => ({
            id: r.id,
            isin: r.isin,
            name: r.name,
            assetType: r.asset_type,
            geography: Array.isArray(r.geography) ? r.geography : [],
            sectors: Array.isArray(r.sectors) ? r.sectors : [],
            assetClassPro: Array.isArray(r.asset_class_pro) ? r.asset_class_pro : [],
          })),
        });
      } catch (err: any) {
        toast.error(`Error cargando cartera: ${err?.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // ---- Asset CRUD ----

  const addAsset = useCallback(async (asset: Omit<Asset, 'id'>) => {
    if (!user) return;
    const newAsset: Asset = { ...asset, id: crypto.randomUUID(), threeDim: asset.threeDim || emptyThreeDim() };
    setState(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
    const { error } = await supabase.from('assets').insert(assetToRow(newAsset, user.id) as any);
    if (error) toast.error(`Error guardando activo: ${error.message}`);
  }, [user]);

  const removeAsset = useCallback(async (id: string) => {
    if (!user) return;
    setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
    const { error } = await supabase.from('assets').delete().eq('id', id).eq('user_id', user.id);
    if (error) toast.error(`Error eliminando activo: ${error.message}`);
  }, [user]);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    if (!user) return;
    setState(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? { ...a, ...updates } : a) }));
    // Build DB-level updates
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.ticker !== undefined) dbUpdates.ticker = updates.ticker;
    if (updates.isin !== undefined) dbUpdates.isin = updates.isin;
    if (updates.entity !== undefined) dbUpdates.entity = updates.entity;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.shares !== undefined) dbUpdates.shares = updates.shares;
    if (updates.buyPrice !== undefined) dbUpdates.buy_price = updates.buyPrice;
    if (updates.currentPrice !== undefined) dbUpdates.current_price = updates.currentPrice;
    if (updates.threeDim) {
      dbUpdates.geography = updates.threeDim.geography || [];
      dbUpdates.sectors = updates.threeDim.sectors || [];
      dbUpdates.asset_class_pro = updates.threeDim.assetClassPro || [];
    }
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('assets').update(dbUpdates as any).eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Error actualizando activo: ${error.message}`);
    }
  }, [user]);

  const updateAssetClassification = useCallback((id: string, classification: FundClassification) => {
    updateAsset(id, { classification });
  }, [updateAsset]);

  const updateAssetThreeDim = useCallback((id: string, threeDim: ThreeDimensionClassification) => {
    updateAsset(id, { threeDim });
  }, [updateAsset]);

  const updatePrices = useCallback((prices: Record<string, number>) => {
    if (!user) return;
    setState(prev => {
      const updated = prev.assets.map(a => prices[a.ticker] !== undefined ? { ...a, currentPrice: prices[a.ticker] } : a);
      // Fire-and-forget individual updates
      updated.forEach(a => {
        if (prices[a.ticker] !== undefined) {
          supabase.from('assets').update({ current_price: prices[a.ticker] } as any).eq('id', a.id).eq('user_id', user.id);
        }
      });
      return { ...prev, assets: updated };
    });
  }, [user]);

  // ---- RoboAdvisor CRUD ----

  const addRoboAdvisor = useCallback(async (robo: Omit<RoboAdvisor, 'id'>) => {
    if (!user) return;
    const newRobo: RoboAdvisor = { ...robo, id: crypto.randomUUID(), threeDim: robo.threeDim || emptyThreeDim() };
    setState(prev => ({ ...prev, roboAdvisors: [...prev.roboAdvisors, newRobo] }));
    const { error } = await supabase.from('robo_advisors').insert(roboToRow(newRobo, user.id) as any);
    if (error) toast.error(`Error guardando robo: ${error.message}`);
  }, [user]);

  const updateRoboAdvisor = useCallback(async (id: string, updates: Partial<RoboAdvisor>) => {
    if (!user) return;
    setState(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.map(r => r.id === id ? { ...r, ...updates } : r) }));
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.entity !== undefined) dbUpdates.entity = updates.entity;
    if (updates.totalValue !== undefined) dbUpdates.total_value = updates.totalValue;
    if (updates.investedValue !== undefined) dbUpdates.invested_value = updates.investedValue;
    if (updates.lastUpdated !== undefined) dbUpdates.last_updated = updates.lastUpdated;
    if (updates.allocations !== undefined) dbUpdates.allocations = updates.allocations;
    if (updates.sectorAllocations !== undefined) dbUpdates.sector_allocations = updates.sectorAllocations;
    if (updates.movements !== undefined) dbUpdates.movements = updates.movements;
    if (updates.subFunds !== undefined) dbUpdates.sub_funds = updates.subFunds;
    if (updates.threeDim) {
      dbUpdates.geography = updates.threeDim.geography || [];
      dbUpdates.sectors = updates.threeDim.sectors || [];
      dbUpdates.asset_class_pro = updates.threeDim.assetClassPro || [];
    }
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('robo_advisors').update(dbUpdates as any).eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Error actualizando robo: ${error.message}`);
    }
  }, [user]);

  const updateRoboThreeDim = useCallback((id: string, threeDim: ThreeDimensionClassification) => {
    updateRoboAdvisor(id, { threeDim });
  }, [updateRoboAdvisor]);

  const updateRoboSubFunds = useCallback((id: string, subFunds: RoboSubFund[]) => {
    updateRoboAdvisor(id, { subFunds });
  }, [updateRoboAdvisor]);

  const removeRoboAdvisor = useCallback(async (id: string) => {
    if (!user) return;
    setState(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.filter(r => r.id !== id) }));
    const { error } = await supabase.from('robo_advisors').delete().eq('id', id).eq('user_id', user.id);
    if (error) toast.error(`Error eliminando robo: ${error.message}`);
  }, [user]);

  // ---- Settings ----

  const saveSettings = useCallback(async (patch: Record<string, any>) => {
    if (!user) return;
    const { error } = await supabase.from('portfolio_settings').upsert({ id: 'default', user_id: user.id, ...patch } as any);
    if (error) console.error('Error saving settings:', error.message);
  }, [user]);

  const setApiKey = useCallback((apiKey: string) => {
    if (!user) return;
    setState(prev => ({ ...prev, apiKey }));
    saveSettings({ api_key: apiKey });
  }, [user, saveSettings]);

  const setCashBalance = useCallback((cashBalance: number) => {
    if (!user) return;
    setState(prev => ({ ...prev, cashBalance }));
    saveSettings({ cash_balance: cashBalance });
  }, [user, saveSettings]);

  // ---- ISIN Library ----

  const getByIsin = useCallback((isin: string): IsinEntry | undefined => {
    return state.isinLibrary.find(e => e.isin === isin);
  }, [state.isinLibrary]);

  const upsertIsin = useCallback(async (entry: Omit<IsinEntry, 'id'> & { id?: string }) => {
    if (!user) return;
    const existing = state.isinLibrary.find(e => e.isin === entry.isin);
    if (existing) {
      setState(prev => ({
        ...prev,
        isinLibrary: prev.isinLibrary.map(e => e.isin === entry.isin ? { ...e, ...entry, id: e.id } : e),
      }));
      await supabase.from('isin_library').update({
        name: entry.name,
        asset_type: entry.assetType,
        geography: entry.geography,
        sectors: entry.sectors,
        asset_class_pro: entry.assetClassPro,
      } as any).eq('isin', entry.isin).eq('user_id', user.id);
    } else {
      const newEntry: IsinEntry = { ...entry, id: entry.id || crypto.randomUUID() };
      setState(prev => ({ ...prev, isinLibrary: [...prev.isinLibrary, newEntry] }));
      await supabase.from('isin_library').insert({
        id: newEntry.id,
        user_id: user.id,
        isin: newEntry.isin,
        name: newEntry.name,
        asset_type: newEntry.assetType,
        geography: newEntry.geography,
        sectors: newEntry.sectors,
        asset_class_pro: newEntry.assetClassPro,
      } as any);
    }
  }, [user, state.isinLibrary]);

  const updateIsinClassification = useCallback(async (isin: string, threeDim: ThreeDimensionClassification) => {
    if (!user) return;
    setState(prev => ({
      ...prev,
      isinLibrary: prev.isinLibrary.map(e =>
        e.isin === isin
          ? { ...e, geography: threeDim.geography, sectors: threeDim.sectors, assetClassPro: threeDim.assetClassPro }
          : e
      ),
    }));
    await supabase.from('isin_library').update({
      geography: threeDim.geography,
      sectors: threeDim.sectors,
      asset_class_pro: threeDim.assetClassPro,
    } as any).eq('isin', isin).eq('user_id', user.id);
  }, [user]);

  const deleteIsin = useCallback(async (id: string) => {
    if (!user) return;
    setState(prev => ({ ...prev, isinLibrary: prev.isinLibrary.filter(e => e.id !== id) }));
    await supabase.from('isin_library').delete().eq('id', id).eq('user_id', user.id);
  }, [user]);

  // ---- Computed: summary ----

  const summary = useMemo(() => {
    const assetsValue = state.assets.reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const assetsCost = state.assets.reduce((s, a) => s + a.shares * a.buyPrice, 0);
    const robosValue = state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0);
    const robosInvested = state.roboAdvisors.reduce((s, r) => s + r.investedValue, 0);
    const totalValue = assetsValue + robosValue + state.cashBalance;
    const totalInvested = assetsCost + robosInvested + state.cashBalance;
    const totalPL = totalValue - totalInvested;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    const dayChange = totalValue * (Math.random() * 0.02 - 0.005);
    const investmentDate = new Date('2026-01-01');
    const today = new Date();
    const daysDiff = Math.max(1, (today.getTime() - investmentDate.getTime()) / (1000 * 60 * 60 * 24));
    const xirr = totalInvested > 0 ? (Math.pow(totalValue / totalInvested, 365 / daysDiff) - 1) * 100 : 0;
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

  // ---- X-Ray aggregation ----

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
        r.subFunds!.forEach(sf => {
          const sfValue = value * sf.weightPct / 100;
          const entry = sf.isin ? isinMap.get(sf.isin.toUpperCase()) : undefined;
          applyEntry(entry, sfValue);
        });
      } else {
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
