import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface RoboConstituent {
  id: string;
  roboId: string;
  isin: string;
  weightPercentage: number;
}

function rowToConstituent(r: any): RoboConstituent {
  return {
    id: r.id,
    roboId: r.robo_id,
    isin: r.isin,
    weightPercentage: Number(r.weight_percentage),
  };
}

export function useRoboConstituents() {
  const { user } = useAuth();
  const [constituents, setConstituents] = useState<RoboConstituent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConstituents = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase.from('robo_constituents').select('*') as any).eq('user_id', user.id);
      if (error) { toast.error(`Error cargando constituents: ${error.message}`); return; }
      setConstituents((data || []).map(rowToConstituent));
    } catch (err: any) {
      toast.error(`Error: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchConstituents(); }, [fetchConstituents]);

  const getByRoboId = useCallback((roboId: string): RoboConstituent[] => {
    return constituents.filter(c => c.roboId === roboId);
  }, [constituents]);

  const upsertConstituent = useCallback(async (roboId: string, isin: string, weightPercentage: number) => {
    if (!user) return;
    const existing = constituents.find(c => c.roboId === roboId && c.isin === isin);

    try {
      if (existing) {
        const { error } = await supabase.from('robo_constituents').update({ weight_percentage: weightPercentage } as any).eq('id', existing.id).eq('user_id', user.id);
        if (error) throw error;
        setConstituents(prev => prev.map(c => c.id === existing.id ? { ...c, weightPercentage } : c));
      } else {
        const { data, error } = await (supabase.from('robo_constituents').insert({
          robo_id: roboId,
          isin,
          weight_percentage: weightPercentage,
          user_id: user.id,
        } as any) as any).select().maybeSingle();
        if (error) throw error;
        if (data) setConstituents(prev => [...prev, rowToConstituent(data)]);
      }
    } catch (err: any) {
      toast.error(`Error guardando constituent: ${err?.message}`);
    }
  }, [user, constituents]);

  const deleteConstituent = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('robo_constituents').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      setConstituents(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      toast.error(`Error eliminando constituent: ${err?.message}`);
    }
  }, [user]);

  const saveRoboConstituents = useCallback(async (roboId: string, items: { isin: string; weightPercentage: number }[]) => {
    if (!user) return;
    try {
      // Delete existing for this robo
      await (supabase.from('robo_constituents').delete() as any).eq('robo_id', roboId).eq('user_id', user.id);

      // Insert new
      if (items.length > 0) {
        const rows = items.map(item => ({
          robo_id: roboId,
          isin: item.isin,
          weight_percentage: item.weightPercentage,
          user_id: user.id,
        }));
        const { error } = await supabase.from('robo_constituents').insert(rows as any);
        if (error) throw error;
      }

      await fetchConstituents();
      toast.success('Composición del robo-advisor actualizada');
    } catch (err: any) {
      toast.error(`Error guardando composición: ${err?.message}`);
    }
  }, [user, fetchConstituents]);

  return { constituents, loading, getByRoboId, upsertConstituent, deleteConstituent, saveRoboConstituents, refetch: fetchConstituents };
}
