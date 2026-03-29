export type AssetType = 'Fondos MyInvestor' | 'Fondos BBK' | 'Acciones' | 'Efectivo';

export interface Asset {
  id: string;
  name: string;
  ticker: string;
  type: AssetType;
  shares: number;
  buyPrice: number;
  currentPrice: number;
}

export interface RoboAdvisor {
  id: string;
  name: string;
  totalValue: number;
  investedValue: number;
  lastUpdated: string;
}

export interface PortfolioState {
  assets: Asset[];
  roboAdvisors: RoboAdvisor[];
  cashBalance: number;
  apiKey: string;
  historicalData: { date: string; value: number }[];
}
