# PortfolioX - Investment Portfolio Tracker

## Overview
A React/TypeScript investment portfolio tracker built with Vite, Tailwind CSS, and shadcn/ui. Users can track funds, stocks, and robo-advisors with multi-dimensional X-Ray analysis (Geography, Sector, Asset Class). Imported from Lovable.

## Architecture

### Frontend Only
This is a **pure frontend application** — there is no backend server. All data persistence and authentication is handled by Supabase.

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI)
- **State/Data**: TanStack Query + custom hooks
- **Auth & DB**: Supabase (auth + PostgreSQL with RLS)
- **Charts**: Recharts
- **Routing**: React Router v6

### Key Directories
- `src/pages/` — Main views (Index dashboard, Login, NotFound)
- `src/components/portfolio/` — Domain-specific UI components (charts, tables, X-Ray)
- `src/components/ui/` — shadcn/ui reusable components
- `src/hooks/` — Business logic (usePortfolio, useTransactions, useRoboConstituents, useIsinLibrary)
- `src/contexts/` — AuthContext (Supabase auth state)
- `src/integrations/supabase/` — Supabase client + auto-generated TypeScript types
- `src/types/` — TypeScript data models
- `src/lib/` — Utilities + bank-specific data parsers (MyInvestor, Openbank)
- `supabase/migrations/` — Database schema SQL files

## Environment Variables
Required in `.env` (never committed to git):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

## Running the App
```bash
npm run dev   # Dev server on port 5000
npm run build # Production build to dist/
```

## Database
Managed entirely through Supabase (external). Tables:
- `assets` — Investment funds/stocks
- `robo_advisors` — Robo-advisor accounts
- `portfolio_settings` — Cash balance, historical data
- `transactions` — Buy/sell transaction history
- `isin_library` — Per-user ISIN catalog
- `robo_constituents` — Robo-advisor fund constituents

All tables use Row Level Security (RLS) scoped to `auth.uid()`.

## Notable Features
- Multi-dimension X-Ray portfolio analysis (Geography / Sector / Asset Class Pro)
- Import parsers for Spanish brokers (MyInvestor, Openbank)
- XIRR return calculation
- Historical portfolio value tracking
- Dark mode support
