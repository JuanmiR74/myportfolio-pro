import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Asset, RoboAdvisor, ThreeDimensionClassification, RoboSubFund, IsinEntry } from '@/types/portfolio';
import { RoboConstituent } from '@/hooks/useRoboConstituents';
import ThreeDimEditor from '@/components/portfolio/ThreeDimEditor';
import SubFundsEditor from '@/components/portfolio/SubFundsEditor';

interface DataItem { name: string; value: number; fill: string; }

interface XRayAsset {
  id: string;
  name: string;
  isin: string;
  origin: 'Fondo Individual' | 'Robo-advisor';
  entity: string;
  value: number;
  weightPct: number;
  threeDim?: ThreeDimensionClassification;
  sourceType: 'asset' | 'robo';
}

interface Props {
  entityFilter: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors';
  assets: Asset[];
  roboAdvisors: RoboAdvisor[];
  isinLibrary: IsinEntry[];
  roboConstituents: RoboConstituent[];
  onUpdateIsinClassification: (isin: string, td: ThreeDimensionClassification) => void;
  onUpdateRoboSubFunds: (id: string, subFunds: RoboSubFund[]) => void;
  getByIsin?: (isin: string) => IsinEntry | undefined;
  upsertIsin?: (entry: Omit<IsinEntry, 'id'> & { id?: string }) => void;
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

export default function XRayDashboard({ entityFilter, assets, roboAdvisors, isinLibrary, roboConstituents, onUpdateIsinClassification, onUpdateRoboSubFunds, getByIsin, upsertIsin }: Props) {
  const [editingItem, setEditingItem] = useState<XRayAsset | null>(null);

  // Build a lookup: isin -> IsinEntry
  const isinLookup = useMemo(() => {
    const map = new Map<string, IsinEntry>();
    isinLibrary.forEach(e => map.set(e.isin, e));
    return map;
  }, [isinLibrary]);

  // Compute X-Ray from isin_library as source of truth
  const { geography, sector, assetClassPro } = useMemo(() => {
    const geoTotals: Record<string, number> = {};
    const sectorTotals: Record<string, number> = {};
    const acpTotals: Record<string, number> = {};

    const addDimension = (value: number, entry: IsinEntry | undefined) => {
      if (entry?.geography?.length) {
        entry.geography.forEach(g => { geoTotals[g.name] = (geoTotals[g.name] || 0) + value * g.weight / 100; });
      } else { geoTotals['Sin clasificar'] = (geoTotals['Sin clasificar'] || 0) + value; }
      if (entry?.sectors?.length) {
        entry.sectors.forEach(s => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + value * s.weight / 100; });
      } else { sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + value; }
      if (entry?.assetClassPro?.length) {
        entry.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + value * ac.weight / 100; });
      } else { acpTotals['Sin clasificar'] = (acpTotals['Sin clasificar'] || 0) + value; }
    };

    // Filter assets
    const filteredAssets = entityFilter === 'all' ? assets
      : entityFilter === 'Robo-Advisors' ? []
      : assets.filter(a => a.entity === entityFilter || a.type === `Fondos ${entityFilter}`);

    filteredAssets.forEach(a => {
      const value = a.shares * a.currentPrice;
      const isinKey = a.isin || a.ticker;
      const entry = isinLookup.get(isinKey);
      addDimension(value, entry);
    });

    // Filter robos
    const filteredRobos = (entityFilter === 'all' || entityFilter === 'Robo-Advisors') ? roboAdvisors : [];
    filteredRobos.forEach(r => {
      const roboConsts = roboConstituents.filter(c => c.roboId === r.id);
      if (roboConsts.length > 0) {
        // Granular: each constituent weighted
        roboConsts.forEach(c => {
          const constValue = r.totalValue * c.weightPercentage / 100;
          const entry = isinLookup.get(c.isin);
          addDimension(constValue, entry);
        });
      } else if (r.subFunds && r.subFunds.length > 0) {
        // Fallback to subFunds
        r.subFunds.forEach(sf => {
          const sfValue = r.totalValue * sf.weightPct / 100;
          const entry = isinLookup.get(sf.isin);
          if (entry) {
            addDimension(sfValue, entry);
          } else {
            // Use subFund's own threeDim
            const td = sf.threeDim;
            if (td?.geography?.length) td.geography.forEach(g => { geoTotals[g.name] = (geoTotals[g.name] || 0) + sfValue * g.weight / 100; });
            else geoTotals['Sin clasificar'] = (geoTotals['Sin clasificar'] || 0) + sfValue;
            if (td?.sectors?.length) td.sectors.forEach(s => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + sfValue * s.weight / 100; });
            else sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + sfValue;
            if (td?.assetClassPro?.length) td.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + sfValue * ac.weight / 100; });
            else acpTotals['Sin clasificar'] = (acpTotals['Sin clasificar'] || 0) + sfValue;
          }
        });
      } else {
        // Fallback to robo-level threeDim
        const td = r.threeDim;
        const value = r.totalValue;
        if (td?.geography?.length) td.geography.forEach(g => { geoTotals[g.name] = (geoTotals[g.name] || 0) + value * g.weight / 100; });
        else geoTotals['Sin clasificar'] = (geoTotals['Sin clasificar'] || 0) + value;
        if (td?.sectors?.length) td.sectors.forEach(s => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + value * s.weight / 100; });
        else sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + value;
        if (td?.assetClassPro?.length) td.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + value * ac.weight / 100; });
        else acpTotals['Sin clasificar'] = (acpTotals['Sin clasificar'] || 0) + value;
      }
    });

    const toItems = (totals: Record<string, number>, colors: Record<string, string>) =>
      Object.entries(totals).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, fill: colors[name] || 'hsl(0,0%,50%)' }));

    return {
      geography: toItems(geoTotals, GEO_COLORS),
      sector: toItems(sectorTotals, SECTOR_COLORS),
      assetClassPro: toItems(acpTotals, ACP_COLORS),
    };
  }, [assets, roboAdvisors, roboConstituents, isinLookup, entityFilter]);

  const xrayAssets = useMemo(() => {
    const items: XRayAsset[] = [];
    const filteredAssets = entityFilter === 'all' ? assets
      : entityFilter === 'Robo-Advisors' ? []
      : assets.filter(a => a.entity === entityFilter || a.type === `Fondos ${entityFilter}`);

    filteredAssets.forEach(a => {
      const isinKey = a.isin || a.ticker;
      const entry = isinLookup.get(isinKey);
      items.push({
        id: a.id, name: a.name, isin: isinKey, origin: 'Fondo Individual',
        entity: a.entity || a.type.replace('Fondos ', ''), value: a.shares * a.currentPrice,
        weightPct: 0, threeDim: entry ? { geography: entry.geography as any, sectors: entry.sectors as any, assetClassPro: entry.assetClassPro as any } : a.threeDim, sourceType: 'asset',
      });
    });

    const filteredRobos = (entityFilter === 'all' || entityFilter === 'Robo-Advisors') ? roboAdvisors : [];
    filteredRobos.forEach(r => {
      const entry = isinLookup.get(r.id); // robos don't have ISIN directly
      items.push({
        id: r.id, name: r.name, isin: '—', origin: 'Robo-advisor',
        entity: r.entity || r.name.split(' - ')[0] || r.name, value: r.totalValue,
        weightPct: 0, threeDim: r.threeDim, sourceType: 'robo',
      });
    });

    const totalValue = items.reduce((s, i) => s + i.value, 0);
    items.forEach(i => { i.weightPct = totalValue > 0 ? (i.value / totalValue) * 100 : 0; });
    return items.sort((a, b) => b.value - a.value);
  }, [assets, roboAdvisors, entityFilter, isinLookup]);

  const filterLabel = entityFilter === 'all' ? 'Cartera Global' : entityFilter;
  const hasDim = (td?: ThreeDimensionClassification) => td && (td.geography.length > 0 || td.sectors.length > 0 || td.assetClassPro.length > 0);

  const handleSaveThreeDim = (td: ThreeDimensionClassification) => {
    if (!editingItem) return;
    // Save to isin_library as source of truth
    if (editingItem.isin && editingItem.isin !== '—') {
      onUpdateIsinClassification(editingItem.isin, td);
    }
    setEditingItem(null);
  };

  const editingRobo = editingItem?.sourceType === 'robo'
    ? roboAdvisors.find(r => r.id === editingItem.id)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Radiografía (X-Ray) — {filterLabel}</h2>
        <p className="text-sm text-muted-foreground">Exposición ponderada real en 3 dimensiones. Fuente: catálogo ISIN.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChart title="Asset Class Profesional" data={assetClassPro} />
        <HorizontalBarSection title="Distribución Geográfica" data={geography} subtitle="Exposición por región/país" />
        <HorizontalBarSection title="Distribución Sectorial" data={sector} subtitle="Exposición por sector/industria" />
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activos Desglosados</CardTitle>
          <p className="text-xs text-muted-foreground">Pulsa ✏️ para editar clasificación. Los cambios se guardan en el catálogo ISIN central.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {xrayAssets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No hay activos para mostrar.</p>
              <p className="text-muted-foreground text-xs mt-1">Añade fondos o robo-advisors en sus pestañas correspondientes.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Activo</TableHead>
                  <TableHead className="text-xs">ISIN</TableHead>
                  <TableHead className="text-xs">Origen</TableHead>
                  <TableHead className="text-xs">Entidad</TableHead>
                  <TableHead className="text-right text-xs">Valor (€)</TableHead>
                  <TableHead className="text-right text-xs">% Peso</TableHead>
                  <TableHead className="text-xs">Clasificación</TableHead>
                  <TableHead className="text-xs">Constituents</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {xrayAssets.map((a, i) => {
                  const robo = a.sourceType === 'robo' ? roboAdvisors.find(r => r.id === a.id) : null;
                  const roboConsts = robo ? roboConstituents.filter(c => c.roboId === robo.id) : [];
                  const constCount = roboConsts.length || (robo?.subFunds?.length || 0);
                  return (
                    <TableRow key={`${a.id}-${i}`}>
                      <TableCell className="text-sm font-medium">{a.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{a.isin}</TableCell>
                      <TableCell>
                        <Badge variant={a.origin === 'Fondo Individual' ? 'default' : 'secondary'} className="text-[10px]">{a.origin}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.entity}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(a.value)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{a.weightPct.toFixed(1)}%</TableCell>
                      <TableCell>
                        {hasDim(a.threeDim) ? (
                          <div className="flex flex-wrap gap-0.5">
                            {a.threeDim!.geography.slice(0, 2).map(g => (
                              <span key={g.name} className="text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded">{g.name} {g.weight}%</span>
                            ))}
                            {a.threeDim!.sectors.slice(0, 2).map(s => (
                              <span key={s.name} className="text-[9px] bg-accent/40 text-accent-foreground px-1 py-0.5 rounded">{s.name} {s.weight}%</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Sin clasificar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {a.sourceType === 'robo' ? (
                          <span className="text-[10px] text-muted-foreground">{constCount > 0 ? `${constCount} fondos` : '—'}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditingItem(a)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        >
          {editingRobo && (
            <SubFundsEditor
              subFunds={editingRobo.subFunds || []}
              onSave={(subFunds) => onUpdateRoboSubFunds(editingRobo.id, subFunds)}
              roboName={editingRobo.name}
              getByIsin={getByIsin}
              upsertIsin={upsertIsin}
            />
          )}
        </ThreeDimEditor>
      )}
    </div>
  );
}
