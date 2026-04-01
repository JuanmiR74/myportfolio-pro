/*
  # Add User ID to Robo Advisors Table

  1. New Columns
    - Add user_id (uuid) foreign key to robo_advisors table
  2. Security
    - Update RLS policies to check user_id
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE robo_advisors ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE robo_advisors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own robo advisors" ON robo_advisors;
DROP POLICY IF EXISTS "Users can create own robo advisors" ON robo_advisors;
DROP POLICY IF EXISTS "Users can update own robo advisors" ON robo_advisors;
DROP POLICY IF EXISTS "Users can delete own robo advisors" ON robo_advisors;

CREATE POLICY "Users can view own robo advisors"
  ON robo_advisors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own robo advisors"
  ON robo_advisors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own robo advisors"
  ON robo_advisors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own robo advisors"
  ON robo_advisors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
