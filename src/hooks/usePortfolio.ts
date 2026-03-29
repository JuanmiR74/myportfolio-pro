import { useState, useCallback, useMemo } from 'react';
import { Asset, RoboAdvisor, PortfolioState } from '@/types/portfolio';

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
  { id: '1', name: 'Apple Inc.', ticker: 'AAPL', type: 'Acciones', shares: 15, buyPrice: 150.0, currentPrice: 178.5 },
  { id: '2', name: 'Microsoft Corp.', ticker: 'MSFT', type: 'Acciones', shares: 10, buyPrice: 280.0, currentPrice: 415.2 },
  { id: '3', name: 'Vanguard S&P 500', ticker: 'VOO', type: 'Fondos', shares: 8, buyPrice: 380.0, currentPrice: 452.8 },
  { id: '4', name: 'iShares MSCI World', ticker: 'IWDA', type: 'Fondos', shares: 50, buyPrice: 72.0, currentPrice: 85.3 },
];

const defaultRobos: RoboAdvisor[] = [
  { id: '1', name: 'Indexa Capital', totalValue: 12500, investedValue: 11000, lastUpdated: '2026-03-01' },
  { id: '2', name: 'Finizens', totalValue: 8200, investedValue: 7500, lastUpdated: '2026-03-01' },
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

    return { totalValue, totalInvested, totalPL, totalPLPercent, dayChange, assetsValue, robosValue, cashBalance: state.cashBalance };
  }, [state]);

  const distribution = useMemo(() => {
    const acciones = state.assets.filter(a => a.type === 'Acciones').reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const fondos = state.assets.filter(a => a.type === 'Fondos').reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const robos = state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0);
    return [
      { name: 'Acciones', value: acciones, fill: 'hsl(var(--chart-1))' },
      { name: 'Fondos', value: fondos, fill: 'hsl(var(--chart-2))' },
      { name: 'Robo-Advisors', value: robos, fill: 'hsl(var(--chart-3))' },
      { name: 'Efectivo', value: state.cashBalance, fill: 'hsl(var(--chart-4))' },
    ].filter(d => d.value > 0);
  }, [state]);

  return {
    ...state,
    summary,
    distribution,
    addAsset,
    removeAsset,
    updateAsset,
    addRoboAdvisor,
    updateRoboAdvisor,
    removeRoboAdvisor,
    setApiKey,
    setCashBalance,
    updatePrices,
  };
}
