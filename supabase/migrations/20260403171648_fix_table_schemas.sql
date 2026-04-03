/*
  # Fix Table Schemas to Match Application Code

  1. Update assets table
    - Add missing columns for threeDim classification
  
  2. Update portfolio_settings table
    - Add missing columns for cash balance and historical data
  
  3. Update robo_advisors table
    - Add missing columns for allocations and threeDim
*/

-- Fix assets table
DO $$
BEGIN
  -- Add threeDim columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'geography'
  ) THEN
    ALTER TABLE assets ADD COLUMN geography jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'sectors'
  ) THEN
    ALTER TABLE assets ADD COLUMN sectors jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'asset_class_pro'
  ) THEN
    ALTER TABLE assets ADD COLUMN asset_class_pro jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add legacy classification for backward compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'classification'
  ) THEN
    ALTER TABLE assets ADD COLUMN classification jsonb;
  END IF;
END $$;

-- Fix portfolio_settings table
DO $$
BEGIN
  -- Add cash_balance if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_settings' AND column_name = 'cash_balance'
  ) THEN
    ALTER TABLE portfolio_settings ADD COLUMN cash_balance numeric DEFAULT 0;
  END IF;
  
  -- Add historical_data if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_settings' AND column_name = 'historical_data'
  ) THEN
    ALTER TABLE portfolio_settings ADD COLUMN historical_data jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Fix robo_advisors table
DO $$
BEGIN
  -- Add allocations column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'allocations'
  ) THEN
    ALTER TABLE robo_advisors ADD COLUMN allocations jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add sector_allocations column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'sector_allocations'
  ) THEN
    ALTER TABLE robo_advisors ADD COLUMN sector_allocations jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add movements column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'movements'
  ) THEN
    ALTER TABLE robo_advisors ADD COLUMN movements jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add geography, sectors, asset_class_pro for threeDim
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'geography'
  ) THEN
    ALTER TABLE robo_advisors ADD COLUMN geography jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'sectors'
  ) THEN
    ALTER TABLE robo_advisors ADD COLUMN sectors jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'asset_class_pro'
  ) THEN
    ALTER TABLE robo_advisors ADD COLUMN asset_class_pro jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  -- Rename invested_amount and current_value to match app code
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'invested_amount'
  ) THEN
    ALTER TABLE robo_advisors RENAME COLUMN invested_amount TO invested_value;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'current_value'
  ) THEN
    ALTER TABLE robo_advisors RENAME COLUMN current_value TO total_value;
  END IF;
  
  -- Add last_updated column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'robo_advisors' AND column_name = 'last_updated'
  ) THEN
    ALTER TABLE robo_advisors ADD COLUMN last_updated text;
  END IF;
END $$;
