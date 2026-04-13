import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Asset, RoboAdvisor, ThreeDimensionClassification, IsinEntry } from '@/types/portfolio';
import ThreeDimEditor from '@/components/portfolio/ThreeDimEditor';
import { calcInvestedFromMovements } from '@/hooks/usePortfolio';

interface DataItem { name: string; value: number; fill: string; }

interface XRayRow {
  id: string;
  name: string;
  isin: string;
  ticker: string;
  origin: 'Fondos' | 'RoboAdvisor-Posiciones';
  entity: string;
  invested: number;
  currentValue: number;
  weightPct: number;
  threeDim?: ThreeDimensionClassification;
}

interface Props {
  entityFilter: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors';
  assets: Asset[];
  roboAdvisors: RoboAdvisor[];
  isinLibrary: IsinEntry[];
  onUpdateIsinClassification: (isin: string, td: ThreeDimensionClassification) => void;
  getByIsin?: (isin: string) => IsinEntry | undefined;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function HorizontalBarSection({ title, data, subtitle }: { title: string; data: DataItem[]; subtitle?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sin datos. Clasifica tus activos en la tabla inferior.</p></CardContent>
    </Card>
  );
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sorted.map(d => {
            const pct = (d.value / total) * 100;
            return (
              <div key={d.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{d.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">{fmt(d.value)}</span>
                    <span className="font-mono font-semibold w-14 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: d.fill }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-border/50 flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">Total</span>
          <span className="font-mono font-bold">{fmt(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DonutChart({ title, data }: { title: string; data: DataItem[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sin datos clasificados.</p></CardContent>
    </Card>
  );
  const fmtPct = (v: number) => total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%';
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <div className="w-52 h-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={{ background: 'hsl(224, 25%, 11%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-bold font-mono">{fmt(total)}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1.5">
            {data.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                <span className="text-muted-foreground truncate text-xs">{d.name}</span>
                <span className="font-mono font-medium ml-auto text-xs shrink-0">{fmtPct(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const GEO_COLORS: Record<string, string> = {
  'EEUU': 'hsl(210, 80%, 50%)', 'Europa': 'hsl(160, 84%, 39%)', 'Emergentes': 'hsl(25, 95%, 53%)',
  'Japón': 'hsl(0, 70%, 55%)', 'Asia-Pacífico': 'hsl(280, 65%, 60%)', 'Global': 'hsl(217, 91%, 60%)', 'Otro': 'hsl(0, 0%, 60%)', 'Sin clasificar': 'hsl(0, 0%, 50%)',
};
const SECTOR_COLORS: Record<string, string> = {
  'Tecnología': 'hsl(260, 70%, 60%)', 'Salud': 'hsl(340, 75%, 55%)', 'Financiero': 'hsl(210, 80%, 50%)',
  'Energía': 'hsl(30, 90%, 50%)', 'Consumo': 'hsl(160, 70%, 45%)', 'Industria': 'hsl(190, 70%, 45%)',
  'Infraestructuras': 'hsl(180, 60%, 40%)', 'Commodities': 'hsl(47, 96%, 53%)', 'Inmobiliario': 'hsl(15, 70%, 50%)',
  'Telecomunicaciones': 'hsl(240, 60%, 55%)', 'Otro': 'hsl(0, 0%, 60%)', 'Sin clasificar': 'hsl(0, 0%, 50%)',
};
const ACP_COLORS: Record<string, string> = {
  'RV - Growth': 'hsl(25, 95%, 53%)', 'RV - Value': 'hsl(35, 90%, 50%)', 'RV - Large Cap': 'hsl(15, 85%, 55%)',
  'RV - Mid/Small Cap': 'hsl(45, 90%, 50%)', 'RV - Blend': 'hsl(20, 95%, 53%)',
  'RF - Sovereign': 'hsl(217, 91%, 60%)', 'RF - Corporate': 'hsl(200, 80%, 55%)', 'RF - High Yield': 'hsl(230, 70%, 55%)',
  'RF - Corto Plazo': 'hsl(195, 75%, 50%)', 'RF - Largo Plazo': 'hsl(210, 85%, 50%)',
  'Monetario': 'hsl(160, 84%, 39%)', 'Commodities': 'hsl(47, 96%, 53%)', 'Mixto': 'hsl(280, 65%, 60%)',
  'Sin clasificar': 'hsl(0, 0%, 50%)',
};

export default function XRayDashboard({ entityFilter, assets, roboAdvisors, isinLibrary, onUpdateIsinClassification, getByIsin }: Props) {
  const [editingItem, setEditingItem] = useState<XRayRow | null>(null);

  const isinLookup = useMemo(() => {
    const map = new Map<string, IsinEntry>();
    isinLibrary.forEach(e => map.set(e.isin.toUpperCase(), e));
    return map;
  }, [isinLibrary]);

  const xrayRows = useMemo(() => {
    const rows: XRayRow[] = [];

    const includeFunds = entityFilter === 'all' || entityFilter === 'MyInvestor' || entityFilter === 'BBK';
    const includeRobos = entityFilter === 'all' || entityFilter === 'Robo-Advisors' || entityFilter === 'MyInvestor' || entityFilter === 'BBK';

    if (includeFunds) {
      assets
        .filter(a => {
          if (!['Fondos MyInvestor', 'Fondos BBK'].includes(a.type)) return false;
          if (entityFilter === 'MyInvestor') return a.type === 'Fondos MyInvestor';
          if (entityFilter === 'BBK') return a.type === 'Fondos BBK';
          return true;
        })
        .forEach(a => {
          const isinKey = (a.isin || a.ticker || '').toUpperCase();
          const lib = isinLookup.get(isinKey);
          rows.push({
            id: a.id,
            name: a.name,
            isin: isinKey,
            ticker: (a.ticker || '').toUpperCase(),
            origin: 'Fondos',
            entity: a.type === 'Fondos MyInvestor' ? 'MyInvestor' : 'BBK',
            invested: a.movements?.length ? calcInvestedFromMovements(a.movements as any) : a.buyPrice,
            currentValue: (a.shares || 0) * (a.currentPrice || 0),
            weightPct: 0,
            threeDim: lib ? { geography: lib.geography as any, sectors: lib.sectors as any, assetClassPro: lib.assetClassPro as any } : a.threeDim,
          });
        });
    }

    if (includeRobos) {
      roboAdvisors
        .filter(r => {
          if (entityFilter === 'MyInvestor') return /myinvestor/i.test(r.entity || r.name);
          if (entityFilter === 'BBK') return /bbk/i.test(r.entity || r.name);
          return true;
        })
        .forEach(r => {
          (r.positions || []).forEach((p, idx) => {
            const isinKey = (p.isin || p.ticker || '').toUpperCase();
            const ticker = (p.ticker || '').toUpperCase();
            const lib = isinLookup.get(isinKey);
            rows.push({
              id: `${r.id}-${p.id || idx}`,
              name: p.name || ticker || isinKey,
              isin: isinKey,
              ticker,
              origin: 'RoboAdvisor-Posiciones',
              entity: r.entity || r.name,
              invested: 0,
              currentValue: (p.shares || 0) * (p.currentPrice || 0),
              weightPct: 0,
              threeDim: lib ? { geography: lib.geography as any, sectors: lib.sectors as any, assetClassPro: lib.assetClassPro as any } : undefined,
            });
          });
        });
    }

    const total = rows.reduce((s, r) => s + r.currentValue, 0);
    return rows
      .map(r => ({ ...r, weightPct: total > 0 ? (r.currentValue / total) * 100 : 0 }))
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [assets, roboAdvisors, entityFilter, isinLookup]);

  const { geography, sector, assetClassPro } = useMemo(() => {
    const geoTotals: Record<string, number> = {};
    const sectorTotals: Record<string, number> = {};
    const acpTotals: Record<string, number> = {};

    xrayRows.forEach(row => {
      const value = row.currentValue;
      const td = row.threeDim;
      if (td?.geography?.length) td.geography.forEach(g => { geoTotals[g.name] = (geoTotals[g.name] || 0) + value * g.weight / 100; });
      else geoTotals['Sin clasificar'] = (geoTotals['Sin clasificar'] || 0) + value;
      if (td?.sectors?.length) td.sectors.forEach(s => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + value * s.weight / 100; });
      else sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + value;
      if (td?.assetClassPro?.length) td.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + value * ac.weight / 100; });
      else acpTotals['Sin clasificar'] = (acpTotals['Sin clasificar'] || 0) + value;
    });

    const toItems = (totals: Record<string, number>, colors: Record<string, string>) =>
      Object.entries(totals).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, fill: colors[name] || 'hsl(0,0%,50%)' }));

    return {
      geography: toItems(geoTotals, GEO_COLORS),
      sector: toItems(sectorTotals, SECTOR_COLORS),
      assetClassPro: toItems(acpTotals, ACP_COLORS),
    };
  }, [xrayRows]);

  const filterLabel = entityFilter === 'all' ? 'Cartera Global' : entityFilter;
  const hasDim = (td?: ThreeDimensionClassification) => td && (td.geography.length > 0 || td.sectors.length > 0 || td.assetClassPro.length > 0);

  const handleSaveThreeDim = (td: ThreeDimensionClassification) => {
    if (!editingItem) return;
    const key = (editingItem.isin || editingItem.ticker).toUpperCase();
    if (!key) return;
    onUpdateIsinClassification(key, td);
    setEditingItem(null);
  };

  const getAutoClassification = () => {
    if (!editingItem || !getByIsin) return null;
    const key = (editingItem.isin || editingItem.ticker).toUpperCase();
    const entry = getByIsin(key);
    if (!entry) return null;
    return {
      geography: entry.geography as any,
      sectors: entry.sectors as any,
      assetClassPro: entry.assetClassPro as any,
    } as ThreeDimensionClassification;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Radiografía (X-Ray) — {filterLabel}</h2>
        <p className="text-sm text-muted-foreground">Resumen conjunto de Fondos + posiciones de Robo-Advisors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChart title="Asset Class Profesional" data={assetClassPro} />
        <HorizontalBarSection title="Distribución Geográfica" data={geography} subtitle="Exposición por región/país" />
        <HorizontalBarSection title="Distribución Sectorial" data={sector} subtitle="Exposición por sector/industria" />
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalle unificado de activos</CardTitle>
          <p className="text-xs text-muted-foreground">Edita clasificación en 3 ejes. Cada eje debe sumar 100%.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {xrayRows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No hay activos para mostrar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Activo</TableHead>
                  <TableHead className="text-xs">ISIN</TableHead>
                  <TableHead className="text-xs">Ticker</TableHead>
                  <TableHead className="text-xs">Origen</TableHead>
                  <TableHead className="text-xs">Entidad</TableHead>
                  <TableHead className="text-right text-xs">Aportado (€)</TableHead>
                  <TableHead className="text-right text-xs">Valor actual (€)</TableHead>
                  <TableHead className="text-right text-xs">% Peso</TableHead>
                  <TableHead className="text-xs">Clasificación (resumen)</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {xrayRows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-medium">{a.name}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{a.isin || '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{a.ticker || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={a.origin === 'Fondos' ? 'default' : 'secondary'} className="text-[10px]">{a.origin}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.entity}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(a.invested)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(a.currentValue)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{a.weightPct.toFixed(1)}%</TableCell>
                    <TableCell>
                      {hasDim(a.threeDim) ? (
                        <div className="flex flex-wrap gap-0.5">
                          {a.threeDim!.geography.slice(0, 1).map(g => (
                            <span key={g.name} className="text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded">Geo: {g.name} {g.weight}%</span>
                          ))}
                          {a.threeDim!.sectors.slice(0, 1).map(s => (
                            <span key={s.name} className="text-[9px] bg-accent/40 text-accent-foreground px-1 py-0.5 rounded">Sec: {s.name} {s.weight}%</span>
                          ))}
                          {a.threeDim!.assetClassPro.slice(0, 1).map(ac => (
                            <span key={ac.name} className="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded">ACP: {ac.name} {ac.weight}%</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Sin clasificar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditingItem(a)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingItem && (
        <ThreeDimEditor
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          assetName={editingItem.name}
          initial={editingItem.threeDim}
          onSave={handleSaveThreeDim}
          onAutoClassify={getAutoClassification}
        />
      )}
    </div>
  );
}
