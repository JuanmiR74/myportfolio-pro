import { RoboAdvisorAllocation, RoboAdvisorSectorAllocation, RoboMovement } from '@/types/portfolio';

export interface ParsedMovement {
  date: string;
  description: string;
  amount: number;
  commission: number;
  category: 'aportacion' | 'comision' | 'fondo' | 'intereses' | 'otro';
  fundName?: string;
  isin?: string;
}

export interface ImportSummary {
  totalAportaciones: number;
  countAportaciones: number;
  totalComisiones: number;
  countComisiones: number;
  totalIntereses: number;
  fundBreakdown: { name: string; isin: string; totalInvested: number; weight: number }[];
  movements: ParsedMovement[];
  investedValue: number;
  currentCash: number;
  newMovementsCount: number;
  duplicatesSkipped: number;
}

// Fund name normalization, sector mapping, and ISIN lookup
const FUND_PATTERNS: { pattern: RegExp; key: string; label: string; isin: string }[] = [
  { pattern: /S.?&?.?P.?500|US 500|ISHARES US INDEX/i, key: 'SP500', label: 'S&P 500 / US Index', isin: 'IE0032620787' },
  { pattern: /VANGUARD US 500|VANGUARD US/i, key: 'VANGUARD_US', label: 'Vanguard US 500', isin: 'IE0032620787' },
  { pattern: /MSCI EUROPE|FIDELITY MSCI EUROPE/i, key: 'EUROPE', label: 'MSCI Europe', isin: 'LU0389812347' },
  { pattern: /EMRG|EMERGING/i, key: 'EMERGING', label: 'Mercados Emergentes', isin: 'IE00B3VVXG84' },
  { pattern: /JAPAN/i, key: 'JAPAN', label: 'MSCI Japan', isin: 'LU0389812693' },
  { pattern: /PACFC|PACIFIC/i, key: 'PACIFIC', label: 'Asia-Pacífico ex Japan', isin: '' },
  { pattern: /GLB ENH|DEVELOPED WORLD/i, key: 'GLOBAL', label: 'Global / Developed World', isin: '' },
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
  for (const fp of FUND_PATTERNS) {
    if (fp.pattern.test(d)) return 'fondo';
  }
  return 'otro';
}

function identifyFund(desc: string): { key: string; label: string; isin: string } | null {
  const d = desc.toUpperCase();
  for (const fp of FUND_PATTERNS) {
    if (fp.pattern.test(d)) return { key: fp.key, label: fp.label, isin: fp.isin };
  }
  return null;
}

function parseAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[€\s]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

// Generate a dedup key from date+description+amount
function movementKey(date: string, desc: string, amount: number): string {
  return `${date}|${desc.trim().toUpperCase()}|${amount.toFixed(2)}`;
}

export function parseMyInvestorXLSX(
  rows: unknown[][],
  existingMovements?: RoboMovement[]
): ImportSummary {
  // Build set of existing movement keys for dedup
  const existingKeys = new Set<string>();
  if (existingMovements) {
    for (const m of existingMovements) {
      existingKeys.add(movementKey(m.date, m.description, m.amount));
    }
  }

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
  const fundTotals: Record<string, { label: string; isin: string; total: number }> = {};
  let totalAportaciones = 0;
  let countAportaciones = 0;
  let totalComisiones = 0;
  let countComisiones = 0;
  let totalIntereses = 0;
  let currentCash = 0;
  let duplicatesSkipped = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const dateRaw = row[0];
    const desc = String(row[2] || '');
    const amount = parseAmount(row[4]);

    if (!desc || desc.trim() === '') continue;

    let dateStr = '';
    if (typeof dateRaw === 'number') {
      const d = new Date((dateRaw - 25569) * 86400000);
      dateStr = d.toISOString().split('T')[0];
    } else if (typeof dateRaw === 'string') {
      dateStr = dateRaw;
    }

    // Dedup check
    const key = movementKey(dateStr, desc, amount);
    if (existingKeys.has(key)) {
      duplicatesSkipped++;
      continue;
    }

    const category = classifyMovement(desc);
    const fund = category === 'fondo' ? identifyFund(desc) : null;
    const isCommission = category === 'comision';

    movements.push({
      date: dateStr,
      description: desc,
      amount,
      commission: isCommission ? Math.abs(amount) : 0,
      category,
      fundName: fund?.label,
      isin: fund?.isin,
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
          if (!fundTotals[fund.key]) fundTotals[fund.key] = { label: fund.label, isin: fund.isin, total: 0 };
          fundTotals[fund.key].total += Math.abs(amount);
        }
        break;
    }
  }

  const lastRow = rows[rows.length - 1];
  if (lastRow && lastRow.length >= 6) {
    currentCash = parseAmount(lastRow[5]);
  }

  const totalFundInvested = Object.values(fundTotals).reduce((s, f) => s + f.total, 0);
  const fundBreakdown = Object.entries(fundTotals)
    .map(([, { label, isin, total }]) => ({
      name: label,
      isin,
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
    newMovementsCount: movements.length,
    duplicatesSkipped,
  };
}


// ✅ NUEVA FUNCIÓN auxiliar (añade después de parseMyInvestorXLSX):
export function recalculateWeightsWithExisting(
  newFundBreakdown: ImportSummary['fundBreakdown'],
  existingMovements: RoboMovement[] | undefined
): ImportSummary['fundBreakdown'] {
  if (!existingMovements || existingMovements.length === 0) {
    return newFundBreakdown; // Sin cambios si no hay movimientos previos
  }

  // Calcular totales PREVIOS por fondo
  const existingTotals: Record<string, number> = {};
  existingMovements.forEach(m => {
    if (m.isin) {
      existingTotals[m.isin] = (existingTotals[m.isin] || 0) + m.amount;
    }
  });

  // Fusionar: ISIN nuevos con existentes
  const mergedTotals = { ...existingTotals };
  
  newFundBreakdown.forEach(fund => {
    if (fund.isin) {
      mergedTotals[fund.isin] = (mergedTotals[fund.isin] || 0) + fund.totalInvested;
    }
  });

  // Recalcular pesos sobre el TOTAL ACUMULADO
  const totalAccumulated = Object.values(mergedTotals).reduce((s, v) => s + v, 0);
  
  return Object.entries(mergedTotals)
    .filter(([, amount]) => amount > 0)
    .map(([isin, amount]) => {
      // Buscar el nombre original del fondo
      const fundInfo = newFundBreakdown.find(f => f.isin === isin);
      return {
        name: fundInfo?.name || isin,
        isin,
        totalInvested: amount,
        weight: totalAccumulated > 0 ? (amount / totalAccumulated) * 100 : 0,
      };
    })
    .sort((a, b) => b.weight - a.weight);
}

// ✅ MODIFICAR parseMyInvestorXLSX para recibir parámetro adicional:
// (línea 106-109) - ya lo tiene, pero ahora llámalo desde RoboImporter así:

// En RoboImporter.tsx handleFileUpload (línea 63-69):
if (selectedEntity === 'myinvestor') {
  const existingMovements = selectedRoboId !== NEW_ROBO
    ? p.roboAdvisors.find(r => r.id === selectedRoboId)?.movements
    : undefined;
  let result = parseMyInvestorXLSX(rows, existingMovements);
  
  // ✅ RECALCULAR pesos con movimientos acumulados
  if (existingMovements && existingMovements.length > 0) {
    const recalculatedFunds = recalculateWeightsWithExisting(
      result.fundBreakdown,
      existingMovements
    );
    result = {
      ...result,
      fundBreakdown: recalculatedFunds,
    };
  }
  
  setSummary(result);
  setOpenbankSummary(null);
}



// Convert parsed movements to RoboMovement[]
export function toRoboMovements(parsed: ParsedMovement[]): RoboMovement[] {
  return parsed.map(m => ({
    id: crypto.randomUUID(),
    date: m.date,
    description: m.description,
    amount: m.amount,
    commission: m.commission,
    category: m.category,
    fundName: m.fundName,
    isin: m.isin,
  }));
}

// Compute weighted allocations from fund breakdown
export function computeWeightedAllocations(fundBreakdown: ImportSummary['fundBreakdown']): {
  allocations: RoboAdvisorAllocation[];
  sectorAllocations: RoboAdvisorSectorAllocation[];
} {
  const acTotals: Record<string, number> = {};
  const secTotals: Record<string, number> = {};

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
