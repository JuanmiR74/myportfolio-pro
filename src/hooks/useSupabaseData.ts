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
      return (data || []).map((r: any) => ({
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
      }));
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
          name: asset.name,
          ticker: asset.ticker,
          type: asset.type,
          shares: asset.shares,
          buy_price: asset.buyPrice,
          current_price: asset.currentPrice,
          user_id: user.id,
        } as any)
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
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.ticker !== undefined) dbUpdates.ticker = updates.ticker;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.shares !== undefined) dbUpdates.shares = updates.shares;
      if (updates.buyPrice !== undefined) dbUpdates.buy_price = updates.buyPrice;
      if (updates.currentPrice !== undefined) dbUpdates.current_price = updates.currentPrice;

      const { data, error } = await (supabase
        .from('assets')
        .update(dbUpdates)
        .eq('id', id) as any)
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
