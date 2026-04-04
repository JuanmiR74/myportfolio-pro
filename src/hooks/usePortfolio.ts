import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Asset, RoboAdvisor, PortfolioState, FundClassification, ThreeDimensionClassification } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Convert Asset to DB row


function assetToRow(a: Asset, userId: string): Record<string, unknown> {
  return {
    id: a.id,
    name: a.name,
    ticker: a.ticker, //
    type: a.type,
    shares: a.shares,
    buy_price: a.buyPrice,
    current_price: a.currentPrice,
    geography: a.threeDim?.geography || [],
    sectors: a.threeDim?.sectors || [],
    asset_class_pro: a.threeDim?.assetClassPro || [],
    user_id: userId,
  };
}

// Convert DB row to Asset

function rowToAsset(r: any): Asset {
  return {
    id: r.id,
    name: r.name,
    ticker: r.ticker, 
    type: r.type,
    shares: Number(r.shares),
    buyPrice: Number(r.buy_price),
    currentPrice: Number(r.current_price),
    threeDim: {
      geography: (r.geography as any[]) || [],
      sectors: (r.sectors as any[]) || [],
      assetClassPro: (r.asset_class_pro as any[]) || [],
    },
  };
}



function roboToRow(r: RoboAdvisor, userId: string): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    entity: r.entity,
    total_value: r.totalValue,
    invested_value: r.investedValue,
    last_updated: r.lastUpdated,
    allocations: JSON.parse(JSON.stringify(r.allocations || [])),
    sector_allocations: JSON.parse(JSON.stringify(r.sectorAllocations || [])),
    movements: JSON.parse(JSON.stringify(r.movements || [])),
    geography: JSON.parse(JSON.stringify(r.threeDim?.geography || [])),
    sectors: JSON.parse(JSON.stringify(r.threeDim?.sectors || [])),
    asset_class_pro: JSON.parse(JSON.stringify(r.threeDim?.assetClassPro || [])),
    sub_funds: JSON.parse(JSON.stringify(r.subFunds || [])),
    user_id: userId,
  };
}

function rowToRobo(r: any): RoboAdvisor {
  return {
    id: r.id,
    name: r.name,
    entity: r.entity,
    totalValue: Number(r.total_value),
    investedValue: Number(r.invested_value),
    lastUpdated: r.last_updated || '',
    allocations: (r.allocations as any[]) || [],
    sectorAllocations: (r.sector_allocations as any[]) || [],
    movements: (r.movements as any[]) || [],
    threeDim: {
      geography: (r.geography as any[]) || [],
      sectors: (r.sectors as any[]) || [],
      assetClassPro: (r.asset_class_pro as any[]) || [],
    },
    subFunds: (r.sub_funds as any[]) || [],
  };
}

export function usePortfolio() {
  const { user } = useAuth();
  const [state, setState] = useState<PortfolioState>({
    assets: [],
    roboAdvisors: [],
    cashBalance: 0,
    apiKey: '',
    historicalData: [],
  });
  const [loading, setLoading] = useState(true);

  // Load from Supabase on mount
  useEffect(() => {
    const init = async () => {
      if (!user) { setLoading(false); return; }

      try {
        const [assetsRes, robosRes, settingsRes] = await Promise.all([
          (supabase.from('assets').select('*') as any).eq('user_id', user.id),
          (supabase.from('robo_advisors').select('*') as any).eq('user_id', user.id),
          (supabase.from('portfolio_settings').select('*') as any).eq('user_id', user.id).maybeSingle(),
        ]);

        if (assetsRes.error) toast.error(`Error cargando activos: ${assetsRes.error.message}`);
        if (robosRes.error) toast.error(`Error cargando robo-advisors: ${robosRes.error.message}`);
        if (settingsRes.error) toast.error(`Error cargando ajustes: ${settingsRes.error.message}`);

        setState({
          assets: (assetsRes.data || []).map(rowToAsset),
          roboAdvisors: (robosRes.data || []).map(rowToRobo),
          cashBalance: settingsRes.data ? Number(settingsRes.data.cash_balance) : 0,
          apiKey: settingsRes.data?.api_key || '',
          historicalData: (settingsRes.data?.historical_data as any[]) || [],
        });

        localStorage.removeItem('portfolio-state');
      } catch (err: any) {
        console.error('Error loading portfolio from Supabase:', err);
        toast.error(`Error cargando cartera: ${err?.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const addAsset = useCallback(async (asset: Omit<Asset, 'id'>) => {
    if (!user) return;
    const newAsset: Asset = { ...asset, id: crypto.randomUUID(), threeDim: asset.threeDim || emptyThreeDim() };
    await supabase.from('assets').insert(assetToRow(newAsset, user.id) as any);
    setState(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
  }, [user]);

  const removeAsset = useCallback(async (id: string) => {
    if (!user) return;
    await (supabase.from('assets').delete().eq('id', id) as any).eq('user_id', user.id);
    setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  }, [user]);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    if (!user) return;
    setState(prev => {
      const newAssets = prev.assets.map(a => a.id === id ? { ...a, ...updates } : a);
      const updated = newAssets.find(a => a.id === id);
      if (updated) {
        const { user_id, ...row } = assetToRow(updated, user.id) as any;
        supabase.from('assets').update(row).eq('id', id).eq('user_id', user.id).then();
      }
      return { ...prev, assets: newAssets };
    });
  }, [user]);

  const updateAssetClassification = useCallback(async (id: string, classification: FundClassification) => {
    updateAsset(id, { classification });
  }, [updateAsset]);

  const updateAssetThreeDim = useCallback(async (id: string, threeDim: ThreeDimensionClassification) => {
    if (!user) return;
    setState(prev => {
      const newAssets = prev.assets.map(a => a.id === id ? { ...a, threeDim } : a);
      const updated = newAssets.find(a => a.id === id);
      if (updated) {
        supabase.from('assets').update({
          geography: threeDim.geography as any,
          sectors: threeDim.sectors as any,
          asset_class_pro: threeDim.assetClassPro as any,
        }).eq('id', id).eq('user_id', user.id).then();
      }
      return { ...prev, assets: newAssets };
    });
  }, [user]);

  const addRoboAdvisor = useCallback(async (robo: Omit<RoboAdvisor, 'id'>) => {
    if (!user) return;
    const newRobo: RoboAdvisor = { ...robo, id: crypto.randomUUID(), threeDim: robo.threeDim || emptyThreeDim() };
    await supabase.from('robo_advisors').insert(roboToRow(newRobo, user.id) as any);
    setState(prev => ({ ...prev, roboAdvisors: [...prev.roboAdvisors, newRobo] }));
  }, [user]);

  const updateRoboAdvisor = useCallback(async (id: string, updates: Partial<RoboAdvisor>) => {
    if (!user) return;
    setState(prev => {
      const newRobos = prev.roboAdvisors.map(r => r.id === id ? { ...r, ...updates } : r);
      const updated = newRobos.find(r => r.id === id);
      if (updated) {
        const { user_id, ...row } = roboToRow(updated, user.id) as any;
        supabase.from('robo_advisors').update(row).eq('id', id).eq('user_id', user.id).then();
      }
      return { ...prev, roboAdvisors: newRobos };
    });
  }, [user]);

  const updateRoboThreeDim = useCallback(async (id: string, threeDim: ThreeDimensionClassification) => {
    if (!user) return;
    setState(prev => {
      const newRobos = prev.roboAdvisors.map(r => r.id === id ? { ...r, threeDim } : r);
      const updated = newRobos.find(r => r.id === id);
      if (updated) {
        supabase.from('robo_advisors').update({
          geography: threeDim.geography as any,
          sectors: threeDim.sectors as any,
          asset_class_pro: threeDim.assetClassPro as any,
        }).eq('id', id).eq('user_id', user.id).then();
      }
      return { ...prev, roboAdvisors: newRobos };
    });
  }, [user]);

  const updateRoboSubFunds = useCallback(async (id: string, subFunds: import('@/types/portfolio').RoboSubFund[]) => {
    if (!user) return;
    setState(prev => {
      const newRobos = prev.roboAdvisors.map(r => r.id === id ? { ...r, subFunds } : r);
      supabase.from('robo_advisors').update({
        sub_funds: JSON.parse(JSON.stringify(subFunds)) as any,
      }).eq('id', id).eq('user_id', user.id).then();
      return { ...prev, roboAdvisors: newRobos };
    });
  }, [user]);

  const removeRoboAdvisor = useCallback(async (id: string) => {
    if (!user) return;
    await (supabase.from('robo_advisors').delete().eq('id', id) as any).eq('user_id', user.id);
    setState(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.filter(r => r.id !== id) }));
  }, [user]);

  const setApiKey = useCallback(async (apiKey: string) => {
    if (!user) return;
    await supabase.from('portfolio_settings').upsert({ user_id: user.id, api_key: apiKey } as any);
    setState(prev => ({ ...prev, apiKey }));
  }, [user]);

  const setCashBalance = useCallback(async (cashBalance: number) => {
    if (!user) return;
    await supabase.from('portfolio_settings').upsert({ user_id: user.id, cash_balance: cashBalance } as any);
    setState(prev => ({ ...prev, cashBalance }));
  }, [user]);

  const updatePrices = useCallback(async (prices: Record<string, number>) => {
    if (!user) return;
    setState(prev => {
      const updated = prev.assets.map(a => {
        if (prices[a.ticker]) {
          const newA = { ...a, currentPrice: prices[a.ticker] };
          supabase.from('assets').update({ current_price: prices[a.ticker] } as any).eq('id', a.id).eq('user_id', user.id).then();
          return newA;
        }
        return a;
      });
      return { ...prev, assets: updated };
    });
  }, [user]);

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

  // X-Ray using threeDim
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

    const filteredRobos = (entity === 'all' || entity === 'Robo-Advisors') ? state.roboAdvisors : [];
    filteredRobos.forEach(r => {
      const value = r.totalValue;
      const hasSubFunds = r.subFunds && r.subFunds.length > 0;

      if (hasSubFunds) {
        // Use sub-funds for granular X-Ray: each sub-fund has its own threeDim
        r.subFunds!.forEach(sf => {
          const sfValue = value * sf.weightPct / 100;
          const td = sf.threeDim;
          if (td?.geography?.length) {
            td.geography.forEach(g => { geoTotals[g.name] = (geoTotals[g.name] || 0) + sfValue * g.weight / 100; });
          } else { geoTotals['Sin clasificar'] = (geoTotals['Sin clasificar'] || 0) + sfValue; }
          if (td?.sectors?.length) {
            td.sectors.forEach(s => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + sfValue * s.weight / 100; });
          } else { sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + sfValue; }
          if (td?.assetClassPro?.length) {
            td.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + sfValue * ac.weight / 100; });
          } else { acpTotals['Sin clasificar'] = (acpTotals['Sin clasificar'] || 0) + sfValue; }
        });
      } else {
        // Fallback: use robo-level threeDim
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
      'Japón': 'hsl(0, 70%, 55%)', 'Asia-Pacífico': 'hsl(280, 65%, 60%)', 'Global': 'hsl(217, 91%, 60%)', 'Otro': 'hsl(0, 0%, 60%)', 'Sin clasificar': 'hsl(0, 0%, 50%)',
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
  };
}

function emptyThreeDim(): ThreeDimensionClassification {
  return { geography: [], sectors: [], assetClassPro: [] };
}

function legacyToThreeDim(c: FundClassification): ThreeDimensionClassification {
  const geoMap: Record<string, string> = { 'Global': 'Global', 'EEUU': 'EEUU', 'Europa': 'Europa', 'Emergentes': 'Emergentes' };
  const sectorMap: Record<string, string> = { 'Salud': 'Salud', 'Tecnología': 'Tecnología', 'Infraestructuras': 'Infraestructuras', 'Commodities': 'Commodities' };
  
  const geo: any[] = [];
  const sec: any[] = [];
  c.sectors.forEach(s => {
    if (geoMap[s.name]) geo.push({ name: geoMap[s.name], weight: s.weight });
    else if (sectorMap[s.name]) sec.push({ name: sectorMap[s.name], weight: s.weight });
    else geo.push({ name: 'Otro', weight: s.weight });
  });

  const acpMap: Record<string, string> = {
    'Renta Variable': 'RV - Blend', 'Renta Fija': 'RF - Sovereign', 'Monetario': 'Monetario',
    'Commodities': 'Commodities', 'Mixto': 'Mixto',
  };

  return {
    geography: geo.length ? geo : [{ name: 'Global', weight: 100 }],
    sectors: sec.length ? sec : [{ name: 'Otro', weight: 100 }],
    assetClassPro: [{ name: (acpMap[c.assetClass] || 'RV - Blend') as any, weight: 100 }],
  };
}
