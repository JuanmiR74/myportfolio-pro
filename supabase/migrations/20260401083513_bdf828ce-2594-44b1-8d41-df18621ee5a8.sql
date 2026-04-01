
-- Assets table (funds)
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  type TEXT NOT NULL,
  shares NUMERIC NOT NULL DEFAULT 0,
  buy_price NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC NOT NULL DEFAULT 0,
  geography JSONB DEFAULT '[]'::jsonb,
  sectors JSONB DEFAULT '[]'::jsonb,
  asset_class_pro JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Robo-advisors table
CREATE TABLE public.robo_advisors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total_value NUMERIC NOT NULL DEFAULT 0,
  invested_value NUMERIC NOT NULL DEFAULT 0,
  last_updated TEXT,
  allocations JSONB DEFAULT '[]'::jsonb,
  sector_allocations JSONB DEFAULT '[]'::jsonb,
  movements JSONB DEFAULT '[]'::jsonb,
  geography JSONB DEFAULT '[]'::jsonb,
  sectors JSONB DEFAULT '[]'::jsonb,
  asset_class_pro JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Portfolio settings (singleton row)
CREATE TABLE public.portfolio_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  cash_balance NUMERIC NOT NULL DEFAULT 0,
  api_key TEXT DEFAULT '',
  historical_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Disable RLS (single-user app, no auth)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robo_advisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon and authenticated
CREATE POLICY "Allow all on assets" ON public.assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on robo_advisors" ON public.robo_advisors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on portfolio_settings" ON public.portfolio_settings FOR ALL USING (true) WITH CHECK (true);
