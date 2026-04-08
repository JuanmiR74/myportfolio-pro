-- Single-document portfolio table
-- Replaces multi-table approach with a single JSONB document per user

CREATE TABLE IF NOT EXISTS public.user_portfolio (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_portfolio_select" ON public.user_portfolio
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_portfolio_insert" ON public.user_portfolio
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_portfolio_update" ON public.user_portfolio
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_portfolio_delete" ON public.user_portfolio
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
