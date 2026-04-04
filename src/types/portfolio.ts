export type AssetType = 'Fondos MyInvestor' | 'Fondos BBK' | 'Acciones' | 'Efectivo';

// 3 independent classification dimensions
export type GeoZone = 'EEUU' | 'Europa' | 'Emergentes' | 'Japón' | 'Asia-Pacífico' | 'Global' | 'Otro';
export type SectorName = 'Tecnología' | 'Salud' | 'Financiero' | 'Energía' | 'Consumo' | 'Industria' | 'Infraestructuras' | 'Commodities' | 'Inmobiliario' | 'Telecomunicaciones' | 'Otro';
export type AssetClassPro =
  | 'RV - Growth' | 'RV - Value' | 'RV - Large Cap' | 'RV - Mid/Small Cap' | 'RV - Blend'
  | 'RF - Sovereign' | 'RF - Corporate' | 'RF - High Yield' | 'RF - Corto Plazo' | 'RF - Largo Plazo'
  | 'Monetario'
  | 'Commodities'
  | 'Mixto';

export interface WeightedItem<T extends string = string> {
  name: T;
  weight: number; // percentage, all items in a dimension sum to 100
}

export interface ThreeDimensionClassification {
  geography: WeightedItem<GeoZone>[];
  sectors: WeightedItem<SectorName>[];
  assetClassPro: WeightedItem<AssetClassPro>[];
}

// Legacy compat
export type AssetClass = 'Renta Variable' | 'Renta Fija' | 'Monetario' | 'Commodities' | 'Mixto';
export type SectorGeo = 'Global' | 'EEUU' | 'Europa' | 'Emergentes' | 'Salud' | 'Tecnología' | 'Infraestructuras' | 'Commodities' | 'Otro';

export interface FundClassification {
  assetClass: AssetClass;
  sectors: { name: SectorGeo; weight: number }[];
}

export interface Asset {
  id: string;
  name: string;
  ticker: string;
  type: AssetType;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  classification?: FundClassification; // legacy, kept for compat
  threeDim?: ThreeDimensionClassification;
}

export interface RoboAdvisorAllocation {
  assetClass: AssetClass;
  weight: number;
}

export interface RoboAdvisorSectorAllocation {
  sector: SectorGeo;
  weight: number;
}

export interface RoboMovement {
  id: string;
  date: string;
  description: string;
  amount: number;
  commission: number;
  category: 'aportacion' | 'comision' | 'fondo' | 'intereses' | 'otro';
  fundName?: string;
  isin?: string;
}

export interface RoboSubFund {
  id: string;
  isin: string;
  name: string;
  weightPct: number; // % of the robo-advisor's total value
  threeDim?: ThreeDimensionClassification;
}

export interface RoboAdvisor {
  id: string;
  name: string;
  entity: string;
  totalValue: number;
  investedValue: number;
  lastUpdated: string;
  allocations?: RoboAdvisorAllocation[];
  sectorAllocations?: RoboAdvisorSectorAllocation[];
  movements?: RoboMovement[];
  threeDim?: ThreeDimensionClassification;
  subFunds?: RoboSubFund[];
}

export interface PortfolioState {
  assets: Asset[];
  roboAdvisors: RoboAdvisor[];
  cashBalance: number;
  apiKey: string;
  historicalData: { date: string; value: number }[];
}
