import { RoboAdvisorAllocation, RoboAdvisorSectorAllocation, RoboMovement } from '@/types/portfolio';

// =============================================================================
// myInvestorParser.ts
//
// Estructura real del XLSX de MyInvestor (columnas por índice base 0):
//   [0] vacía
//   [1] Fecha Operación  (string "DD/MM/YYYY")
//   [2] Fecha Valor      (string "DD/MM/YYYY")
//   [3] Movimiento       (descripción)
//   [4] vacía (celda fusionada)
//   [5] Importe          (number, negativo = salida de efectivo)
//   [6] Saldo            (number)
//
// Clave de deduplicación: fecha_op|fecha_val|movimiento_upper|importe
// NO se usa ISIN porque no viene en el fichero.
// =============================================================================

export interface ParsedMovement {
  date:        string;   // Fecha Operación → "YYYY-MM-DD"
  fechaValor:  string;   // Fecha Valor     → "YYYY-MM-DD"
  description: string;
  amount:      number;
  commission:  number;
  category:    'aportacion' | 'comision' | 'fondo' | 'abono' | 'cargo_efectivo' | 'otro';
  fundName?:   string;
  isin?:       string;
}

export interface ImportSummary {
  // Totales ACUMULADOS sobre histórico completo (existentes + nuevos del fichero)
  totalAportaciones: number;
  countAportaciones: number;
  totalComisiones:   number;
  countComisiones:   number;
  totalAbonos:       number;       // movimientos PERIODO positivos
  totalCargos:       number;       // EFECTIVO-EUR y PERIODO negativos
  fundBreakdown: {
    name:          string;
    isin:          string;
    totalInvested: number;
    weight:        number;
  }[];
  /** Solo los movimientos NUEVOS (no duplicados) → se añaden al Robo */
  movements:         ParsedMovement[];
  investedValue:     number;       // = totalAportaciones
  currentCash:       number;       // saldo final leído del fichero
  newMovementsCount: number;
  duplicatesSkipped: number;
}

// ---------------------------------------------------------------------------
// Patrones de fondos
// ---------------------------------------------------------------------------
const FUND_PATTERNS: { pattern: RegExp; key: string; label: string; isin: string }[] = [
  { pattern: /S[\s&.]?P[\s.]?500|ISHARES US INDEX|VANGUARD US 500|VANGUARD US\b/i,
    key: 'SP500',    label: 'S&P 500 / US Index',          isin: 'IE0032620787' },
  { pattern: /MSCI EUROPE|FIDELITY MSCI EUROPE/i,
    key: 'EUROPE',   label: 'MSCI Europe',                 isin: 'LU0389812347' },
  { pattern: /EMRG|EMERGING/i,
    key: 'EMERGING', label: 'Mercados Emergentes',         isin: 'IE00B3VVXG84' },
  { pattern: /JAPAN/i,
    key: 'JAPAN',    label: 'MSCI Japan',                  isin: 'LU0389812693' },
  { pattern: /PACFC|PACIFIC/i,
    key: 'PACIFIC',  label: 'Asia-Pacífico ex Japan',      isin: ''             },
  { pattern: /GLB ENH|DEVELOPED WORLD|ISHARES DEVELOPED/i,
    key: 'GLOBAL',   label: 'Global / Developed World',    isin: ''             },
];

export const FUND_SECTOR_MAP: Record<string, {
  allocations: RoboAdvisorAllocation[];
  sectorAllocations: RoboAdvisorSectorAllocation[];
}> = {
  SP500:    { allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
              sectorAllocations: [{ sector: 'EEUU', weight: 100 }] },
  EUROPE:   { allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
              sectorAllocations: [{ sector: 'Europa', weight: 100 }] },
  EMERGING: { allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
              sectorAllocations: [{ sector: 'Emergentes', weight: 100 }] },
  JAPAN:    { allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
              sectorAllocations: [{ sector: 'Global', weight: 100 }] },
  PACIFIC:  { allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
              sectorAllocations: [{ sector: 'Global', weight: 100 }] },
  GLOBAL:   { allocations: [{ assetClass: 'Renta Variable', weight: 100 }],
              sectorAllocations: [
                { sector: 'EEUU', weight: 50 },
                { sector: 'Europa', weight: 30 },
                { sector: 'Global', weight: 20 },
              ] },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "DD/MM/YYYY" → "YYYY-MM-DD". Pasa el string sin cambios si no encaja. */
function normalizeDateStr(raw: string): string {
  const p = raw.trim().split('/');
  if (p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  return raw.trim();
}

function parseAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string')
    return parseFloat(raw.replace(/[€\s]/g, '').replace(',', '.')) || 0;
  return 0;
}

function identifyFund(desc: string): { key: string; label: string; isin: string } | null {
  for (const fp of FUND_PATTERNS) {
    if (fp.pattern.test(desc)) return { key: fp.key, label: fp.label, isin: fp.isin };
  }
  return null;
}

function classifyDescription(desc: string): ParsedMovement['category'] {
  if (/APORTACION/i.test(desc))                              return 'aportacion';
  if (/COM\.\s*GESTION|COM\.\s*CUSTODIA|IVA COM/i.test(desc)) return 'comision';
  if (/^PERIODO\b/i.test(desc))                              return 'abono';
  if (/^EFECTIVO-EUR/i.test(desc))                           return 'cargo_efectivo';
  if (identifyFund(desc))                                    return 'fondo';
  return 'otro';
}

/**
 * Clave de dedup: fecha_op|fecha_val|descripcion_upper|importe_2dec
 * No usa ISIN — no viene en el fichero.
 */
function movementKey(fechaOp: string, fechaVal: string, desc: string, amount: number): string {
  return `${fechaOp}|${fechaVal}|${desc.trim().toUpperCase()}|${amount.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------
export function parseMyInvestorXLSX(
  rows: unknown[][],
  existingMovements?: RoboMovement[]
): ImportSummary {

  // 1. Set de claves de movimientos ya guardados
  const existingKeys = new Set<string>();
  if (existingMovements) {
    for (const m of existingMovements) {
      const fv = (m as any).fechaValor ?? m.date;
      existingKeys.add(movementKey(m.date, fv, m.description, m.amount));
    }
  }

  // 2. Localizar fila de cabecera ("Fecha Operación")
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (row?.some(cell => typeof cell === 'string' && /Fecha Operaci/i.test(cell))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error(
    'No se encontró la cabecera del fichero MyInvestor (columna "Fecha Operación").'
  );

  // 3. Parsear filas y separar nuevos de duplicados
  const newMovements: ParsedMovement[] = [];
  let duplicatesSkipped = 0;
  let currentCash = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length < 6) continue;

    const fechaOpRaw  = row[1];
    const fechaValRaw = row[2];
    const descRaw     = row[3];
    const importeRaw  = row[5];
    const saldoRaw    = row[6];

    if (!fechaOpRaw || !descRaw) continue;

    const fechaOp  = normalizeDateStr(String(fechaOpRaw));
    const fechaVal = fechaValRaw ? normalizeDateStr(String(fechaValRaw)) : fechaOp;
    const desc     = String(descRaw).trim();
    const amount   = parseAmount(importeRaw);

    if (!desc || amount === 0) continue;

    // Actualizar saldo final con el último valor leído
    if (saldoRaw != null) currentCash = parseAmount(saldoRaw);

    const key = movementKey(fechaOp, fechaVal, desc, amount);
    if (existingKeys.has(key)) { duplicatesSkipped++; continue; }

    const category     = classifyDescription(desc);
    const fund         = category === 'fondo' ? identifyFund(desc) : null;
    const isCommission = category === 'comision';

    newMovements.push({
      date:        fechaOp,
      fechaValor:  fechaVal,
      description: desc,
      amount,
      commission:  isCommission ? Math.abs(amount) : 0,
      category,
      fundName:    fund?.label,
      isin:        fund?.isin,
    });
  }

  // 4. Reconstruir histórico completo: existentes + nuevos
  const existingParsed: ParsedMovement[] = (existingMovements || []).map(m => ({
    date:        m.date,
    fechaValor:  (m as any).fechaValor ?? m.date,
    description: m.description,
    amount:      m.amount,
    commission:  m.commission,
    category:    m.category as ParsedMovement['category'],
    fundName:    m.fundName,
    isin:        m.isin,
  }));

  const allMovements = [...existingParsed, ...newMovements];

  // 5. Calcular totales sobre el universo completo
  const fundTotals: Record<string, { label: string; isin: string; total: number }> = {};
  let totalAportaciones = 0;
  let countAportaciones = 0;
  let totalComisiones   = 0;
  let countComisiones   = 0;
  let totalAbonos       = 0;
  let totalCargos       = 0;

  for (const m of allMovements) {
    switch (m.category) {
      case 'aportacion':
        totalAportaciones += m.amount;
        countAportaciones++;
        break;
      case 'comision':
        totalComisiones += Math.abs(m.amount);
        countComisiones++;
        break;
      case 'abono':
        m.amount > 0 ? (totalAbonos += m.amount) : (totalCargos += Math.abs(m.amount));
        break;
      case 'cargo_efectivo':
        totalCargos += Math.abs(m.amount);
        break;
      case 'fondo': {
        let fund: { key: string; label: string; isin: string } | null = null;
        if (m.fundName) {
          const fp = FUND_PATTERNS.find(fp => fp.label === m.fundName);
          if (fp) fund = { key: fp.key, label: fp.label, isin: m.isin || fp.isin };
        }
        if (!fund) fund = identifyFund(m.description);

        if (fund) {
          if (!fundTotals[fund.key])
            fundTotals[fund.key] = { label: fund.label, isin: fund.isin, total: 0 };
          fundTotals[fund.key].total += Math.abs(m.amount);
          if (!fundTotals[fund.key].isin && fund.isin)
            fundTotals[fund.key].isin = fund.isin;
        }
        break;
      }
    }
  }

  // 6. Fund breakdown con pesos sobre el acumulado
  const totalFundInvested = Object.values(fundTotals).reduce((s, f) => s + f.total, 0);
  const fundBreakdown = Object.entries(fundTotals)
    .map(([, { label, isin, total }]) => ({
      name:          label,
      isin,
      totalInvested: +total.toFixed(2),
      weight:        totalFundInvested > 0 ? +((total / totalFundInvested) * 100).toFixed(2) : 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  return {
    totalAportaciones: +totalAportaciones.toFixed(2),
    countAportaciones,
    totalComisiones:   +totalComisiones.toFixed(2),
    countComisiones,
    totalAbonos:       +totalAbonos.toFixed(2),
    totalCargos:       +totalCargos.toFixed(2),
    fundBreakdown,
    movements:         newMovements,
    investedValue:     +totalAportaciones.toFixed(2),
    currentCash,
    newMovementsCount: newMovements.length,
    duplicatesSkipped,
  };
}

// ---------------------------------------------------------------------------
// Convertir ParsedMovement[] → RoboMovement[] para persistir en JSONB
// ---------------------------------------------------------------------------
export function toRoboMovements(parsed: ParsedMovement[]): RoboMovement[] {
  return parsed.map(m => ({
    id:          crypto.randomUUID(),
    date:        m.date,
    description: m.description,
    amount:      m.amount,
    commission:  m.commission,
    category:    m.category as RoboMovement['category'],
    fundName:    m.fundName,
    isin:        m.isin,
    // Extender con fechaValor para que la próxima dedup funcione correctamente
    ...(m.fechaValor !== m.date ? { fechaValor: m.fechaValor } : {}),
  }));
}

// ---------------------------------------------------------------------------
// Calcular allocations ponderadas desde fundBreakdown
// ---------------------------------------------------------------------------
export function computeWeightedAllocations(fundBreakdown: ImportSummary['fundBreakdown']): {
  allocations:       RoboAdvisorAllocation[];
  sectorAllocations: RoboAdvisorSectorAllocation[];
} {
  const acTotals:  Record<string, number> = {};
  const secTotals: Record<string, number> = {};
  const labelToKey: Record<string, string> = {};
  for (const fp of FUND_PATTERNS) labelToKey[fp.label] = fp.key;

  for (const fund of fundBreakdown) {
    const fundKey = labelToKey[fund.name] ?? null;
    const mapping = fundKey ? FUND_SECTOR_MAP[fundKey] : null;
    if (mapping) {
      for (const a of mapping.allocations)
        acTotals[a.assetClass] = (acTotals[a.assetClass] || 0) + (fund.weight * a.weight / 100);
      for (const s of mapping.sectorAllocations)
        secTotals[s.sector] = (secTotals[s.sector] || 0) + (fund.weight * s.weight / 100);
    } else {
      acTotals['Renta Variable'] = (acTotals['Renta Variable'] || 0) + fund.weight;
      secTotals['Global']        = (secTotals['Global']        || 0) + fund.weight;
    }
  }

  const acTotal  = Object.values(acTotals).reduce((s, v) => s + v, 0);
  const secTotal = Object.values(secTotals).reduce((s, v) => s + v, 0);

  return {
    allocations: Object.entries(acTotals).map(([assetClass, w]) => ({
      assetClass: assetClass as RoboAdvisorAllocation['assetClass'],
      weight:     Math.round((w / acTotal) * 100 * 10) / 10,
    })),
    sectorAllocations: Object.entries(secTotals).map(([sector, w]) => ({
      sector: sector as RoboAdvisorSectorAllocation['sector'],
      weight: Math.round((w / secTotal) * 100 * 10) / 10,
    })),
  };
}
