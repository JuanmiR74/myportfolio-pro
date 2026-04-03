/*
  # Cleanup Duplicate RLS Policies

  Clean up old/duplicate policies to allow fresh policy creation
*/

-- Clean up assets table policies - remove all duplicates
DO $$
BEGIN
  -- Try to drop each policy, ignore if not exists
  EXECUTE 'DROP POLICY IF EXISTS "Permitir insercion autenticada" ON assets';
  EXECUTE 'DROP POLICY IF EXISTS "Permitir lectura propia" ON assets';
  EXECUTE 'DROP POLICY IF EXISTS "Solo el dueño accede a sus assets" ON assets';
  EXECUTE 'DROP POLICY IF EXISTS "Dueño Assets" ON assets';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own assets" ON assets';
  EXECUTE 'DROP POLICY IF EXISTS "Users can create own assets" ON assets';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own assets" ON assets';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own assets" ON assets';
END $$;

-- Clean up portfolio_settings table policies
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Solo el dueño accede a sus settings" ON portfolio_settings';
  EXECUTE 'DROP POLICY IF EXISTS "Dueño Settings" ON portfolio_settings';
  EXECUTE 'DROP POLICY IF EXISTS "Individual user access settings" ON portfolio_settings';
  EXECUTE 'DROP POLICY IF EXISTS "Acceso total usuario settings" ON portfolio_settings';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own settings" ON portfolio_settings';
  EXECUTE 'DROP POLICY IF EXISTS "Users can create own settings" ON portfolio_settings';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own settings" ON portfolio_settings';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own settings" ON portfolio_settings';
END $$;

-- Clean up robo_advisors table policies
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Solo el dueño accede a sus roboadvisors" ON robo_advisors';
  EXECUTE 'DROP POLICY IF EXISTS "Dueño Robo" ON robo_advisors';
  EXECUTE 'DROP POLICY IF EXISTS "Acceso total usuario robo" ON robo_advisors';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own robo advisors" ON robo_advisors';
  EXECUTE 'DROP POLICY IF EXISTS "Users can create own robo advisors" ON robo_advisors';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own robo advisors" ON robo_advisors';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own robo advisors" ON robo_advisors';
END $$;

-- Clean up transactions table policies
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions';
  EXECUTE 'DROP POLICY IF EXISTS "Users can create own transactions" ON transactions';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own transactions" ON transactions';
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own transactions" ON transactions';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions';
END $$;

-- Now create clean policies for assets
CREATE POLICY "assets_select" ON assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "assets_insert" ON assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets_update" ON assets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets_delete" ON assets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create clean policies for portfolio_settings
CREATE POLICY "settings_select" ON portfolio_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "settings_insert" ON portfolio_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update" ON portfolio_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_delete" ON portfolio_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create clean policies for robo_advisors
CREATE POLICY "robo_select" ON robo_advisors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "robo_insert" ON robo_advisors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "robo_update" ON robo_advisors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "robo_delete" ON robo_advisors FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create clean policies for transactions
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
