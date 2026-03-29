export type AssetType = 'Fondos MyInvestor' | 'Fondos BBK' | 'Acciones' | 'Efectivo';

export type AssetClass = 'Renta Variable' | 'Renta Fija' | 'Monetario' | 'Commodities' | 'Mixto';

export type SectorGeo = 'Global' | 'EEUU' | 'Europa' | 'Emergentes' | 'Salud' | 'Tecnología' | 'Infraestructuras' | 'Commodities' | 'Otro';

export interface FundClassification {
  assetClass: AssetClass;
  sectors: { name: SectorGeo; weight: number }[]; // weights sum to 100
}

export interface Asset {
  id: string;
  name: string;
  ticker: string;
  type: AssetType;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  classification?: FundClassification;
}

export interface RoboAdvisorAllocation {
  assetClass: AssetClass;
  weight: number; // percentage
}

export interface RoboAdvisorSectorAllocation {
  sector: SectorGeo;
  weight: number;
}

export interface RoboAdvisor {
  id: string;
  name: string;
  totalValue: number;
  investedValue: number;
  lastUpdated: string;
  allocations?: RoboAdvisorAllocation[];
  sectorAllocations?: RoboAdvisorSectorAllocation[];
}

export interface PortfolioState {
  assets: Asset[];
  roboAdvisors: RoboAdvisor[];
  cashBalance: number;
  apiKey: string;
  historicalData: { date: string; value: number }[];
}
