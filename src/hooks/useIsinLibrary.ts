import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ThreeDimensionClassification } from '@/types/portfolio';

export interface IsinEntry {
  id: string;
  isin: string;
  name: string;
  assetType: string;
  geography: { name: string; weight: number }[];
  sectors: { name: string; weight: number }[];
  assetClassPro: { name: string; weight: number }[];
}

function rowToEntry(r: any): IsinEntry {
  return {
    id: r.id,
    isin: r.isin,
    name: r.name,
    assetType: r.asset_type,
    geography: (r.geography as any[]) || [],
    sectors: (r.sectors as any[]) || [],
    assetClassPro: (r.asset_class_pro as any[]) || [],
  };
}

export function useIsinLibrary() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<IsinEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase.from('isin_library').select('*') as any).eq('user_id', user.id);
      if (error) { toast.error(`Error cargando ISIN library: ${error.message}`); return; }
      setEntries((data || []).map(rowToEntry));
    } catch (err: any) {
      toast.error(`Error: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const getByIsin = useCallback((isin: string): IsinEntry | undefined => {
    return entries.find(e => e.isin === isin);
  }, [entries]);

  const upsertIsin = useCallback(async (isin: string, name: string, assetType: string, threeDim?: ThreeDimensionClassification) => {
    if (!user) return;
    const existing = entries.find(e => e.isin === isin);
    const row: Record<string, any> = {
      isin,
      name,
      asset_type: assetType,
      geography: threeDim?.geography || [],
      sectors: threeDim?.sectors || [],
      asset_class_pro: threeDim?.assetClassPro || [],
      user_id: user.id,
    };

    try {
      if (existing) {
        const { error } = await supabase.from('isin_library').update(row).eq('id', existing.id).eq('user_id', user.id);
        if (error) throw error;
        setEntries(prev => prev.map(e => e.id === existing.id ? { ...e, name, assetType, geography: row.geography, sectors: row.sectors, assetClassPro: row.asset_class_pro } : e));
      } else {
        const { data, error } = await (supabase.from('isin_library').insert(row) as any).select().maybeSingle();
        if (error) throw error;
        if (data) setEntries(prev => [...prev, rowToEntry(data)]);
      }
    } catch (err: any) {
      toast.error(`Error guardando ISIN: ${err?.message}`);
    }
  }, [user, entries]);

  const updateIsinClassification = useCallback(async (isin: string, threeDim: ThreeDimensionClassification) => {
    if (!user) return;
    const existing = entries.find(e => e.isin === isin);
    if (!existing) return;

    try {
      const { error } = await supabase.from('isin_library').update({
        geography: threeDim.geography as any,
        sectors: threeDim.sectors as any,
        asset_class_pro: threeDim.assetClassPro as any,
      }).eq('id', existing.id).eq('user_id', user.id);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === existing.id ? { ...e, geography: threeDim.geography, sectors: threeDim.sectors, assetClassPro: threeDim.assetClassPro } : e));
    } catch (err: any) {
      toast.error(`Error actualizando clasificación: ${err?.message}`);
    }
  }, [user, entries]);

  const deleteIsin = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('isin_library').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      toast.error(`Error eliminando ISIN: ${err?.message}`);
    }
  }, [user]);

  return { entries, loading, getByIsin, upsertIsin, updateIsinClassification, deleteIsin, refetch: fetchEntries };
}
