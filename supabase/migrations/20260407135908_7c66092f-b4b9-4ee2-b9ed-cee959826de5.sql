
-- 1. Add entity column to robo_advisors
ALTER TABLE public.robo_advisors ADD COLUMN IF NOT EXISTS entity text NOT NULL DEFAULT '';

-- 2. Add entity and isin columns to assets
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS entity text NOT NULL DEFAULT '';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS isin text;

-- 3. Create isin_library table (per-user ISIN catalog)
CREATE TABLE IF NOT EXISTS public.isin_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isin text NOT NULL,
  name text NOT NULL DEFAULT '',
  asset_type text NOT NULL DEFAULT '',
  geography jsonb DEFAULT '[]'::jsonb,
  sectors jsonb DEFAULT '[]'::jsonb,
  asset_class_pro jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(isin, user_id)
);

ALTER TABLE public.isin_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own isin_library" ON public.isin_library FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own isin_library" ON public.isin_library FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own isin_library" ON public.isin_library FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own isin_library" ON public.isin_library FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Create robo_constituents table
CREATE TABLE IF NOT EXISTS public.robo_constituents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robo_id uuid NOT NULL REFERENCES public.robo_advisors(id) ON DELETE CASCADE,
  isin text NOT NULL,
  weight_percentage numeric NOT NULL DEFAULT 0,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(robo_id, isin)
);

ALTER TABLE public.robo_constituents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own robo_constituents" ON public.robo_constituents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own robo_constituents" ON public.robo_constituents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own robo_constituents" ON public.robo_constituents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own robo_constituents" ON public.robo_constituents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Add type and isin columns to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'buy';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS isin text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS robo_id uuid REFERENCES public.robo_advisors(id) ON DELETE CASCADE;

-- 6. Enable realtime for robo_constituents
ALTER PUBLICATION supabase_realtime ADD TABLE public.isin_library;
ALTER PUBLICATION supabase_realtime ADD TABLE public.robo_constituents;
