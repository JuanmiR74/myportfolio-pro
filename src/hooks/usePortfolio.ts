import { useState, useCallback, useMemo, useEffect } from 'react';
import { Asset, RoboAdvisor, PortfolioState, ThreeDimensionClassification } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// --- HELPERS DE CONVERSIÓN ---

function assetToRow(a: Asset, userId: string): Record<string, unknown> {
  return {
    id: a.id,
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
    user_id: userId,
  };
}

function rowToAsset(r: any): Asset {
  return {
    id: r.id,
    name: r.name,
    ticker: r.ticker,
    isin: r.isin || undefined,
    entity: r.entity || '',
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
  const now = new Date().toISOString();
  return {
    id: r.id,
    name: r.name,
    entity: r.entity || '',
    total_value: Number(r.totalValue) || 0,
    invested_value: Number(r.investedValue) || 0,
    last_updated: r.lastUpdated || now,
    allocations: r.allocations || [],
    sector_allocations: r.sectorAllocations || [],
    movements: r.movements || [],
    geography: r.threeDim?.geography || [],
    sectors: r.threeDim?.sectors || [],
    asset_class_pro: r.threeDim?.assetClassPro || [],
    sub_funds: r.subFunds || [],
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

const emptyThreeDim = (): ThreeDimensionClassification => ({
  geography: [],
  sectors: [],
  assetClassPro: []
});

// --- HOOK PRINCIPAL ---

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

  // Carga inicial
  useEffect(() => {
    const init = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const [assetsRes, robosRes, settingsRes] = await Promise.all([
          supabase.from('assets').select('*').eq('user_id', user.id),
          supabase.from('robo_advisors').select('*').eq('user_id', user.id),
          supabase.from('portfolio_settings').select('*').eq('user_id', user.id).maybeSingle(),
        ]);

        if (assetsRes.error) throw assetsRes.error;
        if (robosRes.error) throw robosRes.error;

        setState({
          assets: (assetsRes.data || []).map(rowToAsset),
          roboAdvisors: (robosRes.data || []).map(rowToRobo),
          cashBalance: settingsRes.data ? Number(settingsRes.data.cash_balance) : 0,
          apiKey: settingsRes.data?.api_key || '',
          historicalData: (settingsRes.data?.historical_data as any[]) || [],
        });
      } catch (err: any) {
        console.error('Error loading portfolio:', err);
        toast.error(`Error cargando cartera: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  // Gestión de Activos
  const addAsset = useCallback(async (asset: Omit<Asset, 'id'>) => {
    if (!user) return;
    const newAsset: Asset = { ...asset, id: crypto.randomUUID(), threeDim: asset.threeDim || emptyThreeDim() };
    const { error } = await supabase.from('assets').insert(assetToRow(newAsset, user.id));
    if (error) {
      toast.error("Error al añadir activo: " + error.message);
    } else {
      setState(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
      toast.success("Activo añadido correctamente");
    }
  }, [user]);

  const removeAsset = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('assets').delete().eq('id', id).eq('user_id', user.id);
    if (error) toast.error("Error al eliminar");
    else setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  }, [user]);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    if (!user) return;
    setState(prev => {
      const newAssets = prev.assets.map(a => a.id === id ? { ...a, ...updates } : a);
      const updated = newAssets.find(a => a.id === id);
      if (updated) {
        const { user_id, ...row } = assetToRow(updated, user.id) as any;
        supabase.from('assets').update(row).eq('id', id).eq('user_id', user.id)
          .then(({ error }) => error && toast.error("Error al actualizar en BD"));
      }
      return { ...prev, assets: newAssets };
    });
  }, [user]);

  // Gestión de Robo-Advisors
  const addRoboAdvisor = useCallback(async (robo: Omit<RoboAdvisor, 'id'>) => {
    if (!user) return;
    const roboId = crypto.randomUUID();
    const newRobo: RoboAdvisor = { ...robo, id: roboId, threeDim: robo.threeDim || emptyThreeDim() };

    try {
      // 1. Guardar el Robo
      const { error: roboError } = await supabase.from('robo_advisors').insert(roboToRow(newRobo, user.id));
      if (roboError) throw roboError;

      // 2. Guardar movimientos en la tabla transactions
if (newRobo.movements && newRobo.movements.length > 0) {
  const formatDate = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('/')) return null;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const txs = newRobo.movements.map(m => ({
    user_id: user.id,
    robo_id: roboId,
    // Mapeo exacto a tus campos locales
    fecha_operacion: formatDate(m.date || m.fecha_operacion || m.Fecha),
    movimiento: m.movement || m.movimiento || m.Concepto || '', 
    importe: Number(m.amount || m.importe || m.Importe) || 0,
    comision: Number(m.comision || m.Comisión) || 0,
    isin: m.isin || m.ISIN || null,
    // Campos extra para lógica interna (opcionales según tu DB)
    type: (m.movement || m.Concepto || '').toLowerCase().includes('reemb') ? 'sell' : 'buy',
    saldo: Number(m.saldo) || 0,
  }));
  
  const { error: txError } = await supabase.from('transactions').insert(txs);
  if (txError) throw txError;
}

      setState(prev => ({ ...prev, roboAdvisors: [...prev.roboAdvisors, newRobo] }));
      toast.success("Robo-Advisor y movimientos guardados");
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al guardar: ${err.message}`);
    }
  }, [user]);

  const updateRoboAdvisor = useCallback(async (id: string, updates: Partial<RoboAdvisor>) => {
    if (!user) return;
    setState(prev => {
      const newRobos = prev.roboAdvisors.map(r => r.id === id ? { ...r, ...updates } : r);
      const updated = newRobos.find(r => r.id === id);
      if (updated) {
        const { user_id, ...row } = roboToRow(updated, user.id) as any;
        supabase.from('robo_advisors').update(row).eq('id', id).eq('user_id', user.id)
          .then(({ error }) => error && toast.error("Error al actualizar Robo-Advisor"));
      }
      return { ...prev, roboAdvisors: newRobos };
    });
  }, [user]);

  const updateRoboSubFunds = useCallback(async (id: string, subFunds: any[]) => {
    if (!user) return;
    setState(prev => {
      const newRobos = prev.roboAdvisors.map(r => r.id === id ? { ...r, subFunds } : r);
      supabase.from('robo_advisors').update({ sub_funds: subFunds }).eq('id', id).eq('user_id', user.id)
        .then(({ error }) => error && toast.error("Error al actualizar sub-fondos"));
      return { ...prev, roboAdvisors: newRobos };
    });
  }, [user]);

  const removeRoboAdvisor = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('robo_advisors').delete().eq('id', id).eq('user_id', user.id);
    if (error) toast.error("Error al eliminar Robo-Advisor");
    else setState(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.filter(r => r.id !== id) }));
  }, [user]);

  const setApiKey = useCallback(async (apiKey: string) => {
    if (!user) return;
    await supabase.from('portfolio_settings').upsert({ user_id: user.id, api_key: apiKey });
    setState(prev => ({ ...prev, apiKey }));
  }, [user]);

  const setCashBalance = useCallback(async (cash_balance: number) => {
    if (!user) return;
    await supabase.from('portfolio_settings').upsert({ user_id: user.id, cash_balance });
    setState(prev => ({ ...prev, cashBalance: cash_balance }));
  }, [user]);

  const updatePrices = useCallback(async (prices: Record<string, number>) => {
    if (!user) return;
    setState(prev => {
      const updated = prev.assets.map(a => {
        if (prices[a.ticker]) {
          const newPrice = prices[a.ticker];
          supabase.from('assets').update({ current_price: newPrice }).eq('id', a.id).eq('user_id', user.id).then();
          return { ...a, currentPrice: newPrice };
        }
        return a;
      });
      return { ...prev, assets: updated };
    });
  }, [user]);

  // --- CÁLCULOS ---

  const summary = useMemo(() => {
    const assetsValue = state.assets.reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const assetsCost = state.assets.reduce((s, a) => s + a.shares * a.buyPrice, 0);
    const robosValue = state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0);
    const robosInvested = state.roboAdvisors.reduce((s, r) => s + r.investedValue, 0);
    
    const totalValue = assetsValue + robosValue + state.cashBalance;
    const totalInvested = assetsCost + robosInvested + state.cashBalance;
    
    return {
      totalValue,
      totalInvested,
      totalPL: totalValue - totalInvested,
      totalPLPercent: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
      assetsValue,
      robosValue,
      cashBalance: state.cashBalance,
      xirr: 0 
    };
  }, [state]);

  const distribution = useMemo(() => {
    const types = ['Fondos MyInvestor', 'Fondos BBK', 'Acciones'];
    const dist = types.map(t => ({
      name: t,
      value: state.assets.filter(a => a.type === t).reduce((s, a) => s + a.shares * a.currentPrice, 0)
    }));
    dist.push({ name: 'Robo-Advisors', value: state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0) });
    dist.push({ name: 'Efectivo', value: state.cashBalance });
    return dist.filter(d => d.value > 0);
  }, [state]);

  const getXrayByEntity = useCallback((entity: string) => {
    const geoTotals: Record<string, number> = {};
    const sectorTotals: Record<string, number> = {};
    const acpTotals: Record<string, number> = {};

    const processItem = (value: number, td: ThreeDimensionClassification) => {
      td.geography?.forEach(g => geoTotals[g.name] = (geoTotals[g.name] || 0) + (value * g.weight / 100));
      td.sectors?.forEach(s => sectorTotals[s.name] = (sectorTotals[s.name] || 0) + (value * s.weight / 100));
      td.assetClassPro?.forEach(a => acpTotals[a.name] = (acpTotals[a.name] || 0) + (value * a.weight / 100));
    };

    state.assets
      .filter(a => entity === 'all' || a.type.includes(entity))
      .forEach(a => processItem(a.shares * a.currentPrice, a.threeDim));

    state.roboAdvisors
      .filter(r => entity === 'all' || entity === 'Robo-Advisors')
      .forEach(r => {
        if (r.subFunds?.length) {
          r.subFunds.forEach(sf => processItem(r.totalValue * sf.weightPct / 100, sf.threeDim));
        } else {
          processItem(r.totalValue, r.threeDim);
        }
      });

    const toItems = (totals: Record<string, number>) => 
      Object.entries(totals).map(([name, value]) => ({ name, value }));

    return { geography: toItems(geoTotals), sector: toItems(sectorTotals), assetClassPro: toItems(acpTotals) };
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
    addRoboAdvisor,
    updateRoboAdvisor,
    updateRoboSubFunds,
    removeRoboAdvisor,
    setApiKey,
    setCashBalance,
    updatePrices,
  };
}
