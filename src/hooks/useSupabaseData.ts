import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/types/portfolio';

export function useSupabaseData() {
  const { user } = useAuth();

  const fetchAssets = async (): Promise<Asset[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching assets:', error);
      return [];
    }
  };

  const addAsset = async (asset: Omit<Asset, 'id'>) => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      const { data, error } = await supabase
        .from('assets')
        .insert({
          ...asset,
          user_id: user.id,
          id: crypto.randomUUID(),
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding asset:', error);
      throw error;
    }
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      const { data, error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  };

  const deleteAsset = async (id: string) => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  };

  return {
    fetchAssets,
    addAsset,
    updateAsset,
    deleteAsset,
  };
}
