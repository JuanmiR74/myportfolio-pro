import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Asset, RoboAdvisor, PortfolioState, FundClassification, ThreeDimensionClassification } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const generateHistoricalData = () => {
  const data: { date: string; value: number }[] = [];
  let value = 45000;
  const now = new Date();
  for (let i = 365; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    value += (Math.random() - 0.45) * 800;
    value = Math.max(30000, value);
    data.push({ date: d.toISOString().split('T')[0], value: Math.round(value * 100) / 100 });
  }
  return data;
};

const defaultAssets: Asset[] = [
  {
    id: crypto.randomUUID(), name: 'Fidelity MSCI World', ticker: 'IE00BYX5NX33', type: 'Fondos MyInvestor',
    shares: 38.91, buyPrice: 25.70, currentPrice: 27.15,
    threeDim: {
      geography: [{ name: 'EEUU', weight: 60 }, { name: 'Europa', weight: 20 }, { name: 'Global', weight: 20 }],
      sectors: [{ name: 'Tecnología', weight: 30 }, { name: 'Financiero', weight: 20 }, { name: 'Salud', weight: 15 }, { name: 'Consumo', weight: 15 }, { name: 'Industria', weight: 20 }],
      assetClassPro: [{ name: 'RV - Blend', weight: 100 }],
    },
  },
  {
    id: crypto.randomUUID(), name: 'Vanguard Emergentes', ticker: 'IE0031786696', type: 'Fondos MyInvestor',
    shares: 5.68, buyPrice: 176.05, currentPrice: 169.80,
    threeDim: {
      geography: [{ name: 'Emergentes', weight: 100 }],
      sectors: [{ name: 'Tecnología', weight: 25 }, { name: 'Financiero', weight: 25 }, { name: 'Consumo', weight: 20 }, { name: 'Energía', weight: 15 }, { name: 'Otro', weight: 15 }],
      assetClassPro: [{ name: 'RV - Blend', weight: 100 }],
    },
  },
  {
    id: crypto.randomUUID(), name: 'BGF World Healthscience', ticker: 'LU0171307068', type: 'Fondos BBK',
    shares: 18.52, buyPrice: 54.00, currentPrice: 56.30,
    threeDim: {
      geography: [{ name: 'EEUU', weight: 65 }, { name: 'Europa', weight: 25 }, { name: 'Global', weight: 10 }],
      sectors: [{ name: 'Salud', weight: 100 }],
      assetClassPro: [{ name: 'RV - Growth', weight: 100 }],
    },
  },
  {
    id: crypto.randomUUID(), name: 'KBI Global Infrastructure', ticker: 'IE00BKPVHQ28', type: 'Fondos BBK',
    shares: 62.11, buyPrice: 16.10, currentPrice: 16.85,
    threeDim: {
      geography: [{ name: 'EEUU', weight: 45 }, { name: 'Europa', weight: 35 }, { name: 'Global', weight: 20 }],
      sectors: [{ name: 'Infraestructuras', weight: 100 }],
      assetClassPro: [{ name: 'RV - Value', weight: 100 }],
    },
  },
  {
    id: crypto.randomUUID(), name: 'Vontobel Commodity H (EURHDG)', ticker: 'LU0415415636', type: 'Fondos BBK',
    shares: 5.49, buyPrice: 182.15, currentPrice: 178.40,
    threeDim: {
      geography: [{ name: 'Global', weight: 100 }],
      sectors: [{ name: 'Commodities', weight: 100 }],
      assetClassPro: [{ name: 'Commodities', weight: 100 }],
    },
  },
];

const defaultRobos: RoboAdvisor[] = [
  {
    id: crypto.randomUUID(), name: 'MyInvestor - Cartera Metal', totalValue: 1000, investedValue: 1000, lastUpdated: '2026-03-01',
    allocations: [
      { assetClass: 'Renta Variable', weight: 80 },
      { assetClass: 'Renta Fija', weight: 15 },
      { assetClass: 'Commodities', weight: 5 },
    ],
    sectorAllocations: [
      { sector: 'Global', weight: 60 },
      { sector: 'EEUU', weight: 25 },
      { sector: 'Emergentes', weight: 15 },
    ],
    threeDim: {
      geography: [{ name: 'EEUU', weight: 45 }, { name: 'Europa', weight: 25 }, { name: 'Emergentes', weight: 20 }, { name: 'Global', weight: 10 }],
      sectors: [{ name: 'Tecnología', weight: 30 }, { name: 'Financiero', weight: 20 }, { name: 'Consumo', weight: 20 }, { name: 'Commodities', weight: 10 }, { name: 'Otro', weight: 20 }],
      assetClassPro: [{ name: 'RV - Blend', weight: 60 }, { name: 'RF - Sovereign', weight: 15 }, { name: 'Commodities', weight: 5 }, { name: 'RV - Large Cap', weight: 20 }],
    },
  },
  {
    id: crypto.randomUUID(), name: 'Openbank - Cartera Taipei', totalValue: 1000, investedValue: 1000, lastUpdated: '2026-03-01',
    allocations: [
      { assetClass: 'Renta Variable', weight: 70 },
      { assetClass: 'Renta Fija', weight: 25 },
      { assetClass: 'Monetario', weight: 5 },
    ],
    sectorAllocations: [
      { sector: 'Global', weight: 50 },
      { sector: 'Europa', weight: 30 },
      { sector: 'Emergentes', weight: 20 },
    ],
    threeDim: {
      geography: [{ name: 'Europa', weight: 40 }, { name: 'EEUU', weight: 30 }, { name: 'Emergentes', weight: 20 }, { name: 'Global', weight: 10 }],
      sectors: [{ name: 'Financiero', weight: 25 }, { name: 'Consumo', weight: 25 }, { name: 'Industria', weight: 20 }, { name: 'Tecnología', weight: 15 }, { name: 'Otro', weight: 15 }],
      assetClassPro: [{ name: 'RV - Blend', weight: 50 }, { name: 'RF - Corporate', weight: 15 }, { name: 'RF - Sovereign', weight: 10 }, { name: 'Monetario', weight: 5 }, { name: 'RV - Large Cap', weight: 20 }],
    },
  },
];

// Convert Asset to DB row
function assetToRow(a: Asset): Record<string, unknown> {
  return {
    id: a.id,
    name: a.name,
    ticker: a.ticker,
    type: a.type,
    shares: a.shares,
    buy_price: a.buyPrice,
    current_price: a.currentPrice,
    geography: JSON.parse(JSON.stringify(a.threeDim?.geography || [])),
    sectors: JSON.parse(JSON.stringify(a.threeDim?.sectors || [])),
    asset_class_pro: JSON.parse(JSON.stringify(a.threeDim?.assetClassPro || [])),
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

function roboToRow(r: RoboAdvisor): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    total_value: r.totalValue,
    invested_value: r.investedValue,
    last_updated: r.lastUpdated,
    allocations: JSON.parse(JSON.stringify(r.allocations || [])),
    sector_allocations: JSON.parse(JSON.stringify(r.sectorAllocations || [])),
    movements: JSON.parse(JSON.stringify(r.movements || [])),
    geography: JSON.parse(JSON.stringify(r.threeDim?.geography || [])),
    sectors: JSON.parse(JSON.stringify(r.threeDim?.sectors || [])),
    asset_class_pro: JSON.parse(JSON.stringify(r.threeDim?.assetClassPro || [])),
  };
}

function rowToRobo(r: any): RoboAdvisor {
  return {
    id: r.id,
    name: r.name,
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
  };
}

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState>({
    assets: [],
    roboAdvisors: [],
    cashBalance: 5000,
    apiKey: '9JQOWFM3S0MQJZHX',
    historicalData: generateHistoricalData(),
  });
  const [loading, setLoading] = useState(true);
  const migrated = useRef(false);

  // Load from Supabase on mount, with one-time localStorage migration
  useEffect(() => {
    const init = async () => {
      try {
        // Check if DB has data
        const { data: dbAssets } = await supabase.from('assets').select('*');
        const { data: dbRobos } = await supabase.from('robo_advisors').select('*');
        const { data: dbSettings } = await supabase.from('portfolio_settings').select('*').eq('id', 'default').single();

        if (dbAssets && dbAssets.length > 0) {
          // DB has data, use it
          setState({
            assets: dbAssets.map(rowToAsset),
            roboAdvisors: (dbRobos || []).map(rowToRobo),
            cashBalance: dbSettings ? Number(dbSettings.cash_balance) : 5000,
            apiKey: dbSettings?.api_key || '9JQOWFM3S0MQJZHX',
            historicalData: (dbSettings?.historical_data as any[]) || generateHistoricalData(),
          });
          // Clean localStorage if exists
          if (localStorage.getItem('portfolio-state')) {
            localStorage.removeItem('portfolio-state');
          }
        } else {
          // No DB data: check localStorage for migration
          const saved = localStorage.getItem('portfolio-state');
          let assetsToSeed: Asset[];
          let robosToSeed: RoboAdvisor[];
          let cash = 5000;
          let apiKey = '9JQOWFM3S0MQJZHX';
          let hist = generateHistoricalData();

          if (saved && !migrated.current) {
            migrated.current = true;
            const parsed = JSON.parse(saved) as PortfolioState;
            // Convert legacy classification to threeDim
            assetsToSeed = parsed.assets.map(a => ({
              ...a,
              id: a.id || crypto.randomUUID(),
              threeDim: a.threeDim || (a.classification ? legacyToThreeDim(a.classification) : emptyThreeDim()),
            }));
            robosToSeed = parsed.roboAdvisors.map(r => ({
              ...r,
              id: r.id || crypto.randomUUID(),
              threeDim: r.threeDim || emptyThreeDim(),
            }));
            cash = parsed.cashBalance;
            apiKey = parsed.apiKey;
            hist = parsed.historicalData;
            toast.info('Migrando datos de localStorage a la nube...');
          } else {
            assetsToSeed = defaultAssets;
            robosToSeed = defaultRobos;
          }

          // Seed to DB
          for (const a of assetsToSeed) {
            await supabase.from('assets').upsert(assetToRow(a) as any);
          }
          for (const r of robosToSeed) {
            await supabase.from('robo_advisors').upsert(roboToRow(r) as any);
          }
          await supabase.from('portfolio_settings').upsert({
            id: 'default',
            cash_balance: cash,
            api_key: apiKey,
            historical_data: hist as any,
          });

          setState({ assets: assetsToSeed, roboAdvisors: robosToSeed, cashBalance: cash, apiKey, historicalData: hist });
          localStorage.removeItem('portfolio-state');
          if (saved) toast.success('Datos migrados a Lovable Cloud');
        }
      } catch (err) {
        console.error('Error loading portfolio from Supabase:', err);
        // Fallback
        setState(prev => ({ ...prev, assets: defaultAssets, roboAdvisors: defaultRobos }));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Helper to sync state + DB
  const syncState = useCallback((newState: PortfolioState) => {
    setState(newState);
  }, []);

  const addAsset = useCallback(async (asset: Omit<Asset, 'id'>) => {
    const newAsset: Asset = { ...asset, id: crypto.randomUUID(), threeDim: asset.threeDim || emptyThreeDim() };
    await supabase.from('assets').insert(assetToRow(newAsset) as any);
    setState(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
  }, []);

  const removeAsset = useCallback(async (id: string) => {
    await supabase.from('assets').delete().eq('id', id);
    setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  }, []);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    setState(prev => {
      const newAssets = prev.assets.map(a => a.id === id ? { ...a, ...updates } : a);
      const updated = newAssets.find(a => a.id === id);
      if (updated) {
        supabase.from('assets').update(assetToRow(updated) as any).eq('id', id).then();
      }
      return { ...prev, assets: newAssets };
    });
  }, []);

  const updateAssetClassification = useCallback(async (id: string, classification: FundClassification) => {
    updateAsset(id, { classification });
  }, [updateAsset]);

  const updateAssetThreeDim = useCallback(async (id: string, threeDim: ThreeDimensionClassification) => {
    setState(prev => {
      const newAssets = prev.assets.map(a => a.id === id ? { ...a, threeDim } : a);
      const updated = newAssets.find(a => a.id === id);
      if (updated) {
        supabase.from('assets').update({
          geography: threeDim.geography as any,
          sectors: threeDim.sectors as any,
          asset_class_pro: threeDim.assetClassPro as any,
        }).eq('id', id).then();
      }
      return { ...prev, assets: newAssets };
    });
  }, []);

  const addRoboAdvisor = useCallback(async (robo: Omit<RoboAdvisor, 'id'>) => {
    const newRobo: RoboAdvisor = { ...robo, id: crypto.randomUUID(), threeDim: robo.threeDim || emptyThreeDim() };
    await supabase.from('robo_advisors').insert(roboToRow(newRobo) as any);
    setState(prev => ({ ...prev, roboAdvisors: [...prev.roboAdvisors, newRobo] }));
  }, []);

  const updateRoboAdvisor = useCallback(async (id: string, updates: Partial<RoboAdvisor>) => {
    setState(prev => {
      const newRobos = prev.roboAdvisors.map(r => r.id === id ? { ...r, ...updates } : r);
      const updated = newRobos.find(r => r.id === id);
      if (updated) {
        supabase.from('robo_advisors').update(roboToRow(updated)).eq('id', id).then();
      }
      return { ...prev, roboAdvisors: newRobos };
    });
  }, []);

  const updateRoboThreeDim = useCallback(async (id: string, threeDim: ThreeDimensionClassification) => {
    setState(prev => {
      const newRobos = prev.roboAdvisors.map(r => r.id === id ? { ...r, threeDim } : r);
      const updated = newRobos.find(r => r.id === id);
      if (updated) {
        supabase.from('robo_advisors').update({
          geography: threeDim.geography as any,
          sectors: threeDim.sectors as any,
          asset_class_pro: threeDim.assetClassPro as any,
        }).eq('id', id).then();
      }
      return { ...prev, roboAdvisors: newRobos };
    });
  }, []);

  const removeRoboAdvisor = useCallback(async (id: string) => {
    await supabase.from('robo_advisors').delete().eq('id', id);
    setState(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.filter(r => r.id !== id) }));
  }, []);

  const setApiKey = useCallback(async (apiKey: string) => {
    await supabase.from('portfolio_settings').update({ api_key: apiKey }).eq('id', 'default');
    setState(prev => ({ ...prev, apiKey }));
  }, []);

  const setCashBalance = useCallback(async (cashBalance: number) => {
    await supabase.from('portfolio_settings').update({ cash_balance: cashBalance }).eq('id', 'default');
    setState(prev => ({ ...prev, cashBalance }));
  }, []);

  const updatePrices = useCallback(async (prices: Record<string, number>) => {
    setState(prev => {
      const updated = prev.assets.map(a => {
        if (prices[a.ticker]) {
          const newA = { ...a, currentPrice: prices[a.ticker] };
          supabase.from('assets').update({ current_price: prices[a.ticker] }).eq('id', a.id).then();
          return newA;
        }
        return a;
      });
      return { ...prev, assets: updated };
    });
  }, []);

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
    assetClassPro: [{ name: acpMap[c.assetClass] || 'RV - Blend', weight: 100 }],
  };
}
