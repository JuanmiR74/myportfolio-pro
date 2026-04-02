
-- Add user_id column to all tables
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.robo_advisors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.portfolio_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all on assets" ON public.assets;
DROP POLICY IF EXISTS "Allow all on robo_advisors" ON public.robo_advisors;
DROP POLICY IF EXISTS "Allow all on portfolio_settings" ON public.portfolio_settings;

-- Assets RLS
CREATE POLICY "Users can view own assets" ON public.assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON public.assets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON public.assets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Robo advisors RLS
CREATE POLICY "Users can view own robos" ON public.robo_advisors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own robos" ON public.robo_advisors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own robos" ON public.robo_advisors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own robos" ON public.robo_advisors FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Portfolio settings RLS
CREATE POLICY "Users can view own settings" ON public.portfolio_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.portfolio_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.portfolio_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON public.portfolio_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
