import { useState, useCallback, useMemo, useEffect } from 'react';
import { Asset, RoboAdvisor, PortfolioState, ThreeDimensionClassification, RoboMovement } from '@/types/portfolio';
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

// Helper para asegurar formato fecha YYYY-MM-DD
const ensureIsoDate = (dateStr: any) => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  return dateStr; // Asumimos YYYY-MM-DD
};

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

  const fetchPortfolio = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [assetsRes, robosRes, settingsRes, transRes] = await Promise.all([
        supabase.from('assets').select('*').eq('user_id', user.id),
        supabase.from('robo_advisors').select('*').eq('user_id', user.id),
        supabase.from('portfolio_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('transactions').select('*').eq('user_id', user.id),
      ]);

      const robosConMovimientos = (robosRes.data || []).map(r => {
        const roboBase = rowToRobo(r);
        const misMovimientos = (transRes.data || [])
          .filter(t => t.robo_id === r.id)
          .map(t => ({
            id: t.id,
            date: t.fecha_operacion,
            description: t.movimiento,
            amount: Number(t.importe),
            commission: Number(t.comision),
            isin: t.isin || '',
            category: t.categoria || 'otro',
            // Mantenemos compatibilidad con nombres en español si el componente los usa
            Fecha: t.fecha_operacion,
            Concepto: t.movimiento,
            Importe: Number(t.importe),
            Comisión: Number(t.comision),
            ISIN: t.isin || '',
            Saldo: Number(t.saldo_resultante)
          }));
        
        return { ...roboBase, movements: misMovimientos };
      });

      setState({
        assets: (assetsRes.data || []).map(rowToAsset),
        roboAdvisors: robosConMovimientos,
        cashBalance: settingsRes.data ? Number(settingsRes.data.cash_balance) : 0,
        apiKey: settingsRes.data?.api_key || '',
        historicalData: (settingsRes.data?.historical_data as any[]) || [],
      });
    } catch (err: any) {
      console.error('Error loading portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Gestión de Activos
  const addAsset = useCallback(async (asset: Omit<Asset, 'id'>) => {
    if (!user) return;
    const newAsset: Asset = { ...asset, id: crypto.randomUUID(), threeDim: asset.threeDim || emptyThreeDim() };
    const { error } = await supabase.from('assets').insert(assetToRow(newAsset, user.id));
    if (error) toast.error("Error al añadir activo");
    else {
      setState(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
      toast.success("Activo añadido");
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
        supabase.from('assets').update(row).eq('id', id).eq('user_id', user.id).then();
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
      const { error: roboError } = await supabase.from('robo_advisors').insert(roboToRow(newRobo, user.id));
      if (roboError) throw roboError;

      if (newRobo.movements && newRobo.movements.length > 0) {
        const txs = newRobo.movements.map(m => ({
          user_id: user.id,
          robo_id: roboId,
          fecha_operacion: ensureIsoDate(m.date || m.Fecha || m.fecha_operacion),
          movimiento: m.description || m.Concepto || m.movimiento || 'Aportación',
          importe: Number(m.amount || m.Importe || m.importe) || 0,
          comision: Number(m.commission || m.Comisión || m.comision) || 0,
          isin: m.isin || m.ISIN || null,
          saldo_resultante: Number(m.Saldo || 0)
        }));
        await supabase.from('transactions').insert(txs);
      }
      fetchPortfolio();
      toast.success("Robo-Advisor guardado");
    } catch (err: any) {
      toast.error(`Error al guardar: ${err.message}`);
    }
  }, [user, fetchPortfolio]);

  const updateRoboAdvisor = useCallback(async (id: string, updates: Partial<RoboAdvisor>) => {
    if (!user) return;

    try {
      // 1. Actualizar Datos Maestro
      const { user_id, ...row } = roboToRow({ ...updates, id } as RoboAdvisor, user.id) as any;
      // Eliminamos movimientos del objeto maestro para que no choque con la columna jsonb si no existe
      delete row.movements; 
      
      const { error: roboError } = await supabase.from('robo_advisors').update(row).eq('id', id);
      if (roboError) throw roboError;

      // 2. Sincronizar Transacciones
      if (updates.movements) {
        await supabase.from('transactions').delete().eq('robo_id', id);
        
        const txs = updates.movements.map(m => ({
          user_id: user.id,
          robo_id: id,
          fecha_operacion: ensureIsoDate(m.date || m.Fecha || m.fecha_operacion),
          movimiento: m.description || m.Concepto || m.movimiento || 'Movimiento',
          importe: Number(m.amount || m.Importe || m.importe) || 0,
          comision: Number(m.commission || m.Comisión || m.comision) || 0,
          isin: m.isin || m.ISIN || null,
          saldo_resultante: Number(m.Saldo || m.saldo_resultante || 0)
        }));

        if (txs.length > 0) {
          const { error: txError } = await supabase.from('transactions').insert(txs);
          if (txError) throw txError;
        }
      }

      fetchPortfolio();
      toast.success("Actualizado correctamente");
    } catch (err: any) {
      toast.error("Error al actualizar: " + err.message);
    }
  }, [user, fetchPortfolio]);

  const removeRoboAdvisor = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('robo_advisors').delete().eq('id', id);
    if (error) toast.error("Error al eliminar");
    else {
      setState(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.filter(r => r.id !== id) }));
      toast.success("Eliminado");
    }
  }, [user]);

  // Otros métodos
  const setCashBalance = useCallback(async (val: number) => {
    if (!user) return;
    await supabase.from('portfolio_settings').upsert({ user_id: user.id, cash_balance: val });
    setState(prev => ({ ...prev, cashBalance: val }));
  }, [user]);

  const updatePrices = useCallback(async (prices: Record<string, number>) => {
    if (!user) return;
    setState(prev => {
      const updated = prev.assets.map(a => {
        if (prices[a.ticker]) {
          const newPrice = prices[a.ticker];
          supabase.from('assets').update({ current_price: newPrice }).eq('id', a.id).then();
          return { ...a, currentPrice: newPrice };
        }
        return a;
      });
      return { ...prev, assets: updated };
    });
  }, [user]);

  // Memorización de cálculos
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
    };
  }, [state]);

  const distribution = useMemo(() => {
    const dist = state.assets.reduce((acc: any[], a) => {
      const existing = acc.find(x => x.name === a.type);
      if (existing) existing.value += a.shares * a.currentPrice;
      else acc.push({ name: a.type, value: a.shares * a.currentPrice });
      return acc;
    }, []);
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

    state.assets.filter(a => entity === 'all' || a.type.includes(entity)).forEach(a => processItem(a.shares * a.currentPrice, a.threeDim));
    state.roboAdvisors.filter(r => entity === 'all' || entity === 'Robo-Advisors').forEach(r => processItem(r.totalValue, r.threeDim));

    return { 
      geography: Object.entries(geoTotals).map(([name, value]) => ({ name, value })),
      sector: Object.entries(sectorTotals).map(([name, value]) => ({ name, value })),
      assetClassPro: Object.entries(acpTotals).map(([name, value]) => ({ name, value }))
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
    addRoboAdvisor,
    updateRoboAdvisor,
    removeRoboAdvisor,
    setCashBalance,
    updatePrices,
    refresh: fetchPortfolio
  };
}
