import { useState, useCallback, useMemo } from 'react';
import { Asset, RoboAdvisor, PortfolioState, FundClassification } from '@/types/portfolio';

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
    id: '1', name: 'Fidelity MSCI World', ticker: 'IE00BYX5NX33', type: 'Fondos MyInvestor',
    shares: 38.91, buyPrice: 25.70, currentPrice: 27.15,
    classification: {
      assetClass: 'Renta Variable',
      sectors: [
        { name: 'EEUU', weight: 60 },
        { name: 'Europa', weight: 20 },
        { name: 'Global', weight: 20 },
      ],
    },
  },
  {
    id: '2', name: 'Vanguard Emergentes', ticker: 'IE0031786696', type: 'Fondos MyInvestor',
    shares: 5.68, buyPrice: 176.05, currentPrice: 169.80,
    classification: {
      assetClass: 'Renta Variable',
      sectors: [{ name: 'Emergentes', weight: 100 }],
    },
  },
  {
    id: '3', name: 'BGF World Healthscience', ticker: 'LU0171307068', type: 'Fondos BBK',
    shares: 18.52, buyPrice: 54.00, currentPrice: 56.30,
    classification: {
      assetClass: 'Renta Variable',
      sectors: [{ name: 'Salud', weight: 100 }],
    },
  },
  {
    id: '4', name: 'KBI Global Infrastructure', ticker: 'IE00BKPVHQ28', type: 'Fondos BBK',
    shares: 62.11, buyPrice: 16.10, currentPrice: 16.85,
    classification: {
      assetClass: 'Renta Variable',
      sectors: [{ name: 'Infraestructuras', weight: 100 }],
    },
  },
  {
    id: '5', name: 'Vontobel Commodity H (EURHDG)', ticker: 'LU0415415636', type: 'Fondos BBK',
    shares: 5.49, buyPrice: 182.15, currentPrice: 178.40,
    classification: {
      assetClass: 'Commodities',
      sectors: [{ name: 'Commodities', weight: 100 }],
    },
  },
];

const defaultRobos: RoboAdvisor[] = [
  {
    id: '1', name: 'MyInvestor - Cartera Metal', totalValue: 1000, investedValue: 1000, lastUpdated: '2026-03-01',
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
  },
  {
    id: '2', name: 'Openbank - Cartera Taipei', totalValue: 1000, investedValue: 1000, lastUpdated: '2026-03-01',
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
  },
];

const loadState = (): PortfolioState => {
  try {
    const saved = localStorage.getItem('portfolio-state');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    assets: defaultAssets,
    roboAdvisors: defaultRobos,
    cashBalance: 5000,
    apiKey: '9JQOWFM3S0MQJZHX',
    historicalData: generateHistoricalData(),
  };
};

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState>(loadState);

  const save = useCallback((newState: PortfolioState) => {
    setState(newState);
    localStorage.setItem('portfolio-state', JSON.stringify(newState));
  }, []);

  const addAsset = useCallback((asset: Omit<Asset, 'id'>) => {
    save({ ...state, assets: [...state.assets, { ...asset, id: crypto.randomUUID() }] });
  }, [state, save]);

  const removeAsset = useCallback((id: string) => {
    save({ ...state, assets: state.assets.filter(a => a.id !== id) });
  }, [state, save]);

  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    save({ ...state, assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a) });
  }, [state, save]);

  const updateAssetClassification = useCallback((id: string, classification: FundClassification) => {
    save({ ...state, assets: state.assets.map(a => a.id === id ? { ...a, classification } : a) });
  }, [state, save]);

  const addRoboAdvisor = useCallback((robo: Omit<RoboAdvisor, 'id'>) => {
    save({ ...state, roboAdvisors: [...state.roboAdvisors, { ...robo, id: crypto.randomUUID() }] });
  }, [state, save]);

  const updateRoboAdvisor = useCallback((id: string, updates: Partial<RoboAdvisor>) => {
    save({ ...state, roboAdvisors: state.roboAdvisors.map(r => r.id === id ? { ...r, ...updates } : r) });
  }, [state, save]);

  const removeRoboAdvisor = useCallback((id: string) => {
    save({ ...state, roboAdvisors: state.roboAdvisors.filter(r => r.id !== id) });
  }, [state, save]);

  const setApiKey = useCallback((apiKey: string) => {
    save({ ...state, apiKey });
  }, [state, save]);

  const setCashBalance = useCallback((cashBalance: number) => {
    save({ ...state, cashBalance });
  }, [state, save]);

  const updatePrices = useCallback((prices: Record<string, number>) => {
    const updated = state.assets.map(a => prices[a.ticker] ? { ...a, currentPrice: prices[a.ticker] } : a);
    save({ ...state, assets: updated });
  }, [state, save]);

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

  // X-Ray: Asset class distribution across all holdings
  const xrayAssetClass = useMemo(() => {
    const totals: Record<string, number> = {};
    
    // Funds with classification
    state.assets.forEach(a => {
      const value = a.shares * a.currentPrice;
      if (a.classification) {
        const cls = a.classification.assetClass;
        totals[cls] = (totals[cls] || 0) + value;
      } else {
        totals['Sin clasificar'] = (totals['Sin clasificar'] || 0) + value;
      }
    });

    // Robo-advisors with allocations
    state.roboAdvisors.forEach(r => {
      if (r.allocations && r.allocations.length > 0) {
        r.allocations.forEach(alloc => {
          totals[alloc.assetClass] = (totals[alloc.assetClass] || 0) + (r.totalValue * alloc.weight / 100);
        });
      } else {
        totals['Sin clasificar'] = (totals['Sin clasificar'] || 0) + r.totalValue;
      }
    });

    // Cash
    if (state.cashBalance > 0) {
      totals['Monetario'] = (totals['Monetario'] || 0) + state.cashBalance;
    }

    const colorMap: Record<string, string> = {
      'Renta Variable': 'hsl(25, 95%, 53%)',   // orange
      'Renta Fija': 'hsl(217, 91%, 60%)',       // blue
      'Monetario': 'hsl(160, 84%, 39%)',        // green
      'Commodities': 'hsl(47, 96%, 53%)',       // gold
      'Mixto': 'hsl(280, 65%, 60%)',            // purple
      'Sin clasificar': 'hsl(0, 0%, 50%)',
    };

    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, fill: colorMap[name] || 'hsl(0, 0%, 50%)' }));
  }, [state]);

  // X-Ray: Sector/Geography distribution
  const xraySectorGeo = useMemo(() => {
    const totals: Record<string, number> = {};

    state.assets.forEach(a => {
      const value = a.shares * a.currentPrice;
      if (a.classification?.sectors) {
        a.classification.sectors.forEach(s => {
          totals[s.name] = (totals[s.name] || 0) + (value * s.weight / 100);
        });
      } else {
        totals['Sin clasificar'] = (totals['Sin clasificar'] || 0) + value;
      }
    });

    state.roboAdvisors.forEach(r => {
      if (r.sectorAllocations && r.sectorAllocations.length > 0) {
        r.sectorAllocations.forEach(s => {
          totals[s.sector] = (totals[s.sector] || 0) + (r.totalValue * s.weight / 100);
        });
      } else {
        totals['Sin clasificar'] = (totals['Sin clasificar'] || 0) + r.totalValue;
      }
    });

    const colorMap: Record<string, string> = {
      'Global': 'hsl(217, 91%, 60%)',
      'EEUU': 'hsl(210, 80%, 50%)',
      'Europa': 'hsl(160, 84%, 39%)',
      'Emergentes': 'hsl(25, 95%, 53%)',
      'Salud': 'hsl(340, 75%, 55%)',
      'Tecnología': 'hsl(260, 70%, 60%)',
      'Infraestructuras': 'hsl(190, 70%, 45%)',
      'Commodities': 'hsl(47, 96%, 53%)',
      'Otro': 'hsl(0, 0%, 60%)',
      'Sin clasificar': 'hsl(0, 0%, 50%)',
    };

    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, fill: colorMap[name] || 'hsl(0, 0%, 50%)' }));
  }, [state]);

  // Filtered X-Ray by entity
  const getXrayByEntity = useCallback((entity: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors') => {
    const assetClassTotals: Record<string, number> = {};
    const sectorTotals: Record<string, number> = {};

    const filteredAssets = entity === 'all'
      ? state.assets
      : entity === 'MyInvestor'
        ? state.assets.filter(a => a.type === 'Fondos MyInvestor')
        : entity === 'BBK'
          ? state.assets.filter(a => a.type === 'Fondos BBK')
          : [];

    filteredAssets.forEach(a => {
      const value = a.shares * a.currentPrice;
      if (a.classification) {
        assetClassTotals[a.classification.assetClass] = (assetClassTotals[a.classification.assetClass] || 0) + value;
        a.classification.sectors.forEach(s => {
          sectorTotals[s.name] = (sectorTotals[s.name] || 0) + (value * s.weight / 100);
        });
      } else {
        assetClassTotals['Sin clasificar'] = (assetClassTotals['Sin clasificar'] || 0) + value;
        sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + value;
      }
    });

    const filteredRobos = (entity === 'all' || entity === 'Robo-Advisors') ? state.roboAdvisors : [];
    filteredRobos.forEach(r => {
      if (r.allocations?.length) {
        r.allocations.forEach(alloc => {
          assetClassTotals[alloc.assetClass] = (assetClassTotals[alloc.assetClass] || 0) + (r.totalValue * alloc.weight / 100);
        });
      } else {
        assetClassTotals['Sin clasificar'] = (assetClassTotals['Sin clasificar'] || 0) + r.totalValue;
      }
      if (r.sectorAllocations?.length) {
        r.sectorAllocations.forEach(s => {
          sectorTotals[s.sector] = (sectorTotals[s.sector] || 0) + (r.totalValue * s.weight / 100);
        });
      } else {
        sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + r.totalValue;
      }
    });

    if (entity === 'all' && state.cashBalance > 0) {
      assetClassTotals['Monetario'] = (assetClassTotals['Monetario'] || 0) + state.cashBalance;
    }

    const acColorMap: Record<string, string> = {
      'Renta Variable': 'hsl(25, 95%, 53%)',
      'Renta Fija': 'hsl(217, 91%, 60%)',
      'Monetario': 'hsl(160, 84%, 39%)',
      'Commodities': 'hsl(47, 96%, 53%)',
      'Mixto': 'hsl(280, 65%, 60%)',
      'Sin clasificar': 'hsl(0, 0%, 50%)',
    };
    const sColorMap: Record<string, string> = {
      'Global': 'hsl(217, 91%, 60%)',
      'EEUU': 'hsl(210, 80%, 50%)',
      'Europa': 'hsl(160, 84%, 39%)',
      'Emergentes': 'hsl(25, 95%, 53%)',
      'Salud': 'hsl(340, 75%, 55%)',
      'Tecnología': 'hsl(260, 70%, 60%)',
      'Infraestructuras': 'hsl(190, 70%, 45%)',
      'Commodities': 'hsl(47, 96%, 53%)',
      'Otro': 'hsl(0, 0%, 60%)',
      'Sin clasificar': 'hsl(0, 0%, 50%)',
    };

    return {
      assetClass: Object.entries(assetClassTotals).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, fill: acColorMap[name] || 'hsl(0,0%,50%)' })),
      sectorGeo: Object.entries(sectorTotals).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, fill: sColorMap[name] || 'hsl(0,0%,50%)' })),
    };
  }, [state]);

  return {
    ...state,
    summary,
    distribution,
    xrayAssetClass,
    xraySectorGeo,
    getXrayByEntity,
    addAsset,
    removeAsset,
    updateAsset,
    updateAssetClassification,
    addRoboAdvisor,
    updateRoboAdvisor,
    removeRoboAdvisor,
    setApiKey,
    setCashBalance,
    updatePrices,
  };
}
