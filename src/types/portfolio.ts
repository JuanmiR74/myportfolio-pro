// =============================================================================
// types/portfolio.ts — Tipos de PortfolioPro
// Todo persiste en user_portfolio.data (JSONB). Sin tablas relacionales.
// =============================================================================

//

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
  isin?: string;
  entity?: string;
  type: AssetType;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  buyDate?: string; // ISO date string for XIRR calculation
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
  category: 'aportacion' | 'comision' | 'fundo' | 'intereses' | 'otro';
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

export interface RoboPosition {
  id: string;
  isin: string;
  ticker: string;
  name: string;
  currency: string;
  shares: number;
  currentPrice?: number;
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
  positions?: RoboPosition[];
}

export interface IsinEntry {
  id: string;
  isin: string;
  name: string;
  assetType: string;
  geography: { name: string; weight: number }[];
  sectors: { name: string; weight: number }[];
  assetClassPro: { name: string; weight: number }[];
}

export interface PortfolioState {
  assets: Asset[];
  roboAdvisors: RoboAdvisor[];
  cashBalance: number;
  apiKey: string;
  historicalData: { date: string; value: number }[];
  isinLibrary: IsinEntry[];
}
