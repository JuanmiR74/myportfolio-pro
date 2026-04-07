import { useState, useCallback, useEffect } from 'react';
import { PortfolioState } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

  // --- 1. CARGAR DATOS (Lectura única del "fichero" JSON) ---
  const loadPortfolio = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('user_portfolio')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setState(data.data as PortfolioState);
      }
    } catch (err) {
      console.error("Error al cargar desde user_portfolio:", err);
      toast.error("Error al cargar tu cartera");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  // --- 2. GUARDAR DATOS (Sincronización del objeto completo) ---
  const savePortfolio = async (newState: PortfolioState) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_portfolio')
      .upsert({ 
        user_id: user.id, 
        data: newState, 
        updated_at: new Date().toISOString() 
      });
    
    if (error) {
      console.error('Error al guardar:', error);
      toast.error("Error al sincronizar datos");
    }
  };

  // --- 3. ACCIONES QUE ACTUALIZAN EL ESTADO Y GUARDAN EL "FICHERO" ---
  const addAsset = useCallback((asset: any) => {
    setState(prev => {
      const newState = { ...prev, assets: [...prev.assets, { ...asset, id: crypto.randomUUID() }] };
      savePortfolio(newState);
      return newState;
    });
  }, []);

  const updateRoboAdvisor = useCallback((id: string, updates: any) => {
    setState(prev => {
      const newState = { 
        ...prev, 
        roboAdvisors: prev.roboAdvisors.map(r => r.id === id ? { ...r, ...updates } : r) 
      };
      savePortfolio(newState);
      return newState;
    });
  }, []);

  // Puedes añadir el resto de funciones (removeAsset, etc.) siguiendo este patrón:
  // setState -> newState -> savePortfolio(newState)

  return {
    ...state,
    loading,
    addAsset,
    updateRoboAdvisor,
    refresh: loadPortfolio
  };
}
