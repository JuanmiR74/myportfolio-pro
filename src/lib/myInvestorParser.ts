import { RoboAdvisorAllocation, RoboAdvisorSectorAllocation } from '@/types/portfolio';

export interface ParsedMovement {
  date: string;
  description: string;
  amount: number;
  category: 'aportacion' | 'comision' | 'fondo' | 'intereses' | 'otro';
  fundName?: string;
}

export interface ImportSummary {
  totalAportaciones: number;
  countAportaciones: number;
  totalComisiones: number;
  countComisiones: number;
  totalIntereses: number;
  fundBreakdown: { name: string; totalInvested: number; weight: number }[];
  movements: ParsedMovement[];
  investedValue: number;
  currentCash: number;
}

// Fund name normalization and sector mapping
const FUND_PATTERNS: { pattern: RegExp; key: string; label: string }[] = [
  { pattern: /S.?&?.?P.?500|US 500|ISHARES US INDEX/i, key: 'SP500', label: 'S&P 500 / US Index' },
  { pattern: /MSCI EUROPE|FIDELITY MSCI EUROPE/i, key: 'EUROPE', label: 'MSCI Europe' },
  { pattern: /EMRG|EMERGING/i, key: 'EMERGING', label: 'Mercados Emergentes' },
  { pattern: /JAPAN/i, key: 'JAPAN', label: 'MSCI Japan' },
  { pattern: /PACFC|PACIFIC/i, key: 'PACIFIC', label: 'Asia-Pacífico ex Japan' },
  { pattern: /VANGUARD US 500|VANGUARD US/i, key: 'VANGUARD_US', label: 'Vanguard US 500' },
  { pattern: /GLB ENH|DEVELOPED WORLD/i, key: 'GLOBAL', label: 'Global / Developed World' },
];

export const FUND_SECTOR_MAP: Record<string, { allocations: RoboAdvisorAllocation[]; sectorAllocations: RoboAdvisorSectorAllocation[] }> = {
  SP500: {
    allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
    sectorAllocations: [{ sector: 'EEUU', weight: 100 }],
  },
  VANGUARD_US: {
    allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
    sectorAllocations: [{ sector: 'EEUU', weight: 100 }],
  },
  EUROPE: {
    allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
    sectorAllocations: [{ sector: 'Europa', weight: 100 }],
  },
  EMERGING: {
    allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
    sectorAllocations: [{ sector: 'Emergentes', weight: 100 }],
  },
  JAPAN: {
    allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
    sectorAllocations: [{ sector: 'Global', weight: 100 }],
  },
  PACIFIC: {
    allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
    sectorAllocations: [{ sector: 'Global', weight: 100 }],
  },
  GLOBAL: {
    allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
    sectorAllocations: [
      { sector: 'EEUU', weight: 50 },
      { sector: 'Europa', weight: 30 },
      { sector: 'Global', weight: 20 },
    ],
  },
};

function classifyMovement(desc: string): ParsedMovement['category'] {
  const d = desc.toUpperCase();
  if (/APORTACION/i.test(d)) return 'aportacion';
  if (/COM\.\s*GESTION|COM\.\s*CUSTODIA|IVA COM/i.test(d)) return 'comision';
  if (/PERIODO|EFECTIVO-EUR/i.test(d)) return 'intereses';
  // Check if it matches any fund pattern
  for (const fp of FUND_PATTERNS) {
    if (fp.pattern.test(d)) return 'fondo';
  }
  return 'otro';
}

function identifyFund(desc: string): { key: string; label: string } | null {
  const d = desc.toUpperCase();
  for (const fp of FUND_PATTERNS) {
    if (fp.pattern.test(d)) return { key: fp.key, label: fp.label };
  }
  return null;
}

function parseAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    // Handle "300.00€" or "-0.05€" or "300,00€"
    const cleaned = raw.replace(/[€\s]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

export function parseMyInvestorXLSX(rows: unknown[][]): ImportSummary {
  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.some(cell => typeof cell === 'string' && /Fecha Operaci/i.test(cell))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error('No se encontró la cabecera del fichero MyInvestor');
  }

  const movements: ParsedMovement[] = [];
  const fundTotals: Record<string, { label: string; total: number }> = {};
  let totalAportaciones = 0;
  let countAportaciones = 0;
  let totalComisiones = 0;
  let countComisiones = 0;
  let totalIntereses = 0;
  let currentCash = 0;

  // Parse data rows after header
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const dateRaw = row[0];
    const desc = String(row[2] || '');
    const amount = parseAmount(row[4]);

    if (!desc || desc.trim() === '') continue;

    // Try to parse date
    let dateStr = '';
    if (typeof dateRaw === 'number') {
      // Excel serial date
      const d = new Date((dateRaw - 25569) * 86400000);
      dateStr = d.toISOString().split('T')[0];
    } else if (typeof dateRaw === 'string') {
      dateStr = dateRaw;
    }

    const category = classifyMovement(desc);
    const fund = category === 'fondo' ? identifyFund(desc) : null;

    movements.push({
      date: dateStr,
      description: desc,
      amount,
      category,
      fundName: fund?.label,
    });

    switch (category) {
      case 'aportacion':
        totalAportaciones += amount;
        countAportaciones++;
        break;
      case 'comision':
        totalComisiones += Math.abs(amount);
        countComisiones++;
        break;
      case 'intereses':
        totalIntereses += amount;
        break;
      case 'fondo':
        if (fund) {
          if (!fundTotals[fund.key]) fundTotals[fund.key] = { label: fund.label, total: 0 };
          fundTotals[fund.key].total += Math.abs(amount);
        }
        break;
    }
  }

  // Get last saldo from last row
  const lastRow = rows[rows.length - 1];
  if (lastRow && lastRow.length >= 6) {
    currentCash = parseAmount(lastRow[5]);
  }

  // Calculate fund weights
  const totalFundInvested = Object.values(fundTotals).reduce((s, f) => s + f.total, 0);
  const fundBreakdown = Object.entries(fundTotals)
    .map(([key, { label, total }]) => ({
      name: label,
      totalInvested: total,
      weight: totalFundInvested > 0 ? (total / totalFundInvested) * 100 : 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  return {
    totalAportaciones,
    countAportaciones,
    totalComisiones,
    countComisiones,
    totalIntereses,
    fundBreakdown,
    movements,
    investedValue: totalAportaciones,
    currentCash,
  };
}

// Compute weighted allocations from fund breakdown
export function computeWeightedAllocations(fundBreakdown: ImportSummary['fundBreakdown']): {
  allocations: RoboAdvisorAllocation[];
  sectorAllocations: RoboAdvisorSectorAllocation[];
} {
  const acTotals: Record<string, number> = {};
  const secTotals: Record<string, number> = {};

  // Reverse lookup fund key from label
  const labelToKey: Record<string, string> = {};
  for (const fp of FUND_PATTERNS) {
    labelToKey[fp.label] = fp.key;
  }

  for (const fund of fundBreakdown) {
    const key = Object.keys(labelToKey).find(l => l === fund.name);
    const fundKey = key ? labelToKey[key] : null;
    const mapping = fundKey ? FUND_SECTOR_MAP[fundKey] : null;

    if (mapping) {
      for (const a of mapping.allocations) {
        acTotals[a.assetClass] = (acTotals[a.assetClass] || 0) + (fund.weight * a.weight / 100);
      }
      for (const s of mapping.sectorAllocations) {
        secTotals[s.sector] = (secTotals[s.sector] || 0) + (fund.weight * s.weight / 100);
      }
    } else {
      acTotals['Renta Variable'] = (acTotals['Renta Variable'] || 0) + fund.weight;
      secTotals['Global'] = (secTotals['Global'] || 0) + fund.weight;
    }
  }

  // Normalize to 100
  const acTotal = Object.values(acTotals).reduce((s, v) => s + v, 0);
  const secTotal = Object.values(secTotals).reduce((s, v) => s + v, 0);

  const allocations: RoboAdvisorAllocation[] = Object.entries(acTotals).map(([assetClass, w]) => ({
    assetClass: assetClass as RoboAdvisorAllocation['assetClass'],
    weight: Math.round((w / acTotal) * 100 * 10) / 10,
  }));

  const sectorAllocations: RoboAdvisorSectorAllocation[] = Object.entries(secTotals).map(([sector, w]) => ({
    sector: sector as RoboAdvisorSectorAllocation['sector'],
    weight: Math.round((w / secTotal) * 100 * 10) / 10,
  }));

  return { allocations, sectorAllocations };
}
