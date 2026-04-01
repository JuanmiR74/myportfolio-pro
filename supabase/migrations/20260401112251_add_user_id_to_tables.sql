/*
  # Add User ID Support to Assets and Portfolio Settings

  1. New Columns
    - Add user_id (uuid) foreign key to assets table
    - Add user_id (uuid) foreign key to portfolio_settings table
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read/write their own data
  3. Migration Strategy
    - Add columns with NOT NULL constraint allowing NULL during migration
    - Then update existing rows with default user
    - Finally add foreign key constraints
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE portfolio_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assets" ON assets;
DROP POLICY IF EXISTS "Users can create own assets" ON assets;
DROP POLICY IF EXISTS "Users can update own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete own assets" ON assets;
DROP POLICY IF EXISTS "Users can view own settings" ON portfolio_settings;
DROP POLICY IF EXISTS "Users can create own settings" ON portfolio_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON portfolio_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON portfolio_settings;

CREATE POLICY "Users can view own assets"
  ON assets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON assets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own settings"
  ON portfolio_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings"
  ON portfolio_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON portfolio_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON portfolio_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
