import { Asset, FundClassification } from '@/types/portfolio';
import { FUND_SECTOR_MAP } from './myInvestorParser';

export interface OpenbankSnapshot {
  name: string;
  isin: string;
  shares: number;
  invested: number;
  currentValue: number;
  profitLoss: number;
}

export interface OpenbankImportSummary {
  funds: OpenbankSnapshot[];
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  newFundsCount: number;
  updatedFundsCount: number;
}

function parseAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[€\s]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

function identifyFundByISIN(isin: string, name: string): { key: string | null; classification: FundClassification | null } {
  const nameUpper = name.toUpperCase();

  const ISIN_PATTERNS: { pattern: RegExp; key: string }[] = [
    { pattern: /S.?&?.?P.?500|US 500|ISHARES US INDEX/i, key: 'SP500' },
    { pattern: /VANGUARD US 500|VANGUARD US/i, key: 'VANGUARD_US' },
    { pattern: /MSCI EUROPE|FIDELITY MSCI EUROPE/i, key: 'EUROPE' },
    { pattern: /EMRG|EMERGING/i, key: 'EMERGING' },
    { pattern: /JAPAN/i, key: 'JAPAN' },
    { pattern: /PACFC|PACIFIC/i, key: 'PACIFIC' },
    { pattern: /GLB ENH|DEVELOPED WORLD/i, key: 'GLOBAL' },
  ];

  for (const fp of ISIN_PATTERNS) {
    if (fp.pattern.test(nameUpper)) {
      const mapping = FUND_SECTOR_MAP[fp.key];
      if (mapping) {
        return {
          key: fp.key,
          classification: {
            assetClass: mapping.allocations[0].assetClass,
            sectors: mapping.sectorAllocations.map(s => ({ name: s.sector, weight: s.weight })),
          },
        };
      }
    }
  }

  return { key: null, classification: null };
}

export function parseOpenbankSnapshot(rows: unknown[][], existingAssets: Asset[]): OpenbankImportSummary {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.some(cell => typeof cell === 'string' && /FONDO/i.test(cell))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error('No se encontró la cabecera del fichero Openbank (columna FONDO)');
  }

  const header = rows[headerIdx].map(c => String(c || '').trim().toUpperCase());
  const fondoIdx = header.findIndex(h => /FONDO/i.test(h));
  const isinIdx = header.findIndex(h => /ISIN/i.test(h));
  const participIdx = header.findIndex(h => /PARTICIP/i.test(h));
  const precioMedioIdx = header.findIndex(h => /PRECIO MEDIO/i.test(h));
  const valorActualIdx = header.findIndex(h => /VALOR ACTUAL/i.test(h));
  const rentabilidadIdx = header.findIndex(h => /RENTABILIDAD/i.test(h));

  if (fondoIdx === -1 || isinIdx === -1 || participIdx === -1) {
    throw new Error('Falta alguna columna requerida: FONDO, ISIN o PARTICIP');
  }

  const funds: OpenbankSnapshot[] = [];
  const existingISINs = new Set(existingAssets.map(a => a.ticker));

  let newFundsCount = 0;
  let updatedFundsCount = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < Math.max(fondoIdx, isinIdx, participIdx) + 1) continue;

    const name = String(row[fondoIdx] || '').trim();
    const isin = String(row[isinIdx] || '').trim();
    const shares = parseAmount(row[participIdx]);

    if (!name || !isin || shares === 0) continue;

    let invested = 0;
    if (precioMedioIdx !== -1 && row[precioMedioIdx] !== undefined) {
      const precioMedio = parseAmount(row[precioMedioIdx]);
      invested = shares * precioMedio;
    }

    let currentValue = 0;
    if (valorActualIdx !== -1 && row[valorActualIdx] !== undefined) {
      currentValue = parseAmount(row[valorActualIdx]);
    } else {
      currentValue = invested;
    }

    let profitLoss = 0;
    if (rentabilidadIdx !== -1 && row[rentabilidadIdx] !== undefined) {
      profitLoss = parseAmount(row[rentabilidadIdx]);
    } else {
      profitLoss = currentValue - invested;
    }

    funds.push({ name, isin, shares, invested, currentValue, profitLoss });

    if (existingISINs.has(isin)) {
      updatedFundsCount++;
    } else {
      newFundsCount++;
    }
  }

  const totalInvested = funds.reduce((s, f) => s + f.invested, 0);
  const totalCurrentValue = funds.reduce((s, f) => s + f.currentValue, 0);
  const totalProfitLoss = funds.reduce((s, f) => s + f.profitLoss, 0);

  return {
    funds,
    totalInvested,
    totalCurrentValue,
    totalProfitLoss,
    newFundsCount,
    updatedFundsCount,
  };
}

export function applyOpenbankSnapshot(
  snapshot: OpenbankImportSummary,
  existingAssets: Asset[]
): Asset[] {
  const assetMap = new Map<string, Asset>();
  existingAssets.forEach(a => assetMap.set(a.ticker, a));

  snapshot.funds.forEach(fund => {
    const existing = assetMap.get(fund.isin);
    const currentPrice = fund.shares > 0 ? fund.currentValue / fund.shares : 0;
    const buyPrice = fund.shares > 0 && fund.invested > 0 ? fund.invested / fund.shares : currentPrice;

    const { classification } = identifyFundByISIN(fund.isin, fund.name);

    if (existing) {
      assetMap.set(fund.isin, {
        ...existing,
        name: fund.name,
        shares: fund.shares,
        currentPrice,
        buyPrice,
        classification: classification || existing.classification,
      });
    } else {
      assetMap.set(fund.isin, {
        id: crypto.randomUUID(),
        name: fund.name,
        ticker: fund.isin,
        type: 'Fondos BBK',
        shares: fund.shares,
        buyPrice,
        currentPrice,
        classification: classification || undefined,
      });
    }
  });

  return Array.from(assetMap.values());
}
