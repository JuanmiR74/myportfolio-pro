import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Asset, RoboAdvisor, ThreeDimensionClassification } from '@/types/portfolio';
import ThreeDimEditor from '@/components/portfolio/ThreeDimEditor';

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
  getXrayByEntity: (entity: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors') => {
    geography: DataItem[];
    sector: DataItem[];
    assetClassPro: DataItem[];
  };
  entityFilter: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors';
  assets: Asset[];
  roboAdvisors: RoboAdvisor[];
  onUpdateAssetThreeDim: (id: string, td: ThreeDimensionClassification) => void;
  onUpdateRoboThreeDim: (id: string, td: ThreeDimensionClassification) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function HorizontalBarSection({ title, data, subtitle }: { title: string; data: DataItem[]; subtitle?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
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
  if (total === 0) return null;
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

export default function XRayDashboard({ getXrayByEntity, entityFilter, assets, roboAdvisors, onUpdateAssetThreeDim, onUpdateRoboThreeDim }: Props) {
  const { geography, sector, assetClassPro } = getXrayByEntity(entityFilter);
  const [editingItem, setEditingItem] = useState<XRayAsset | null>(null);

  const xrayAssets = useMemo(() => {
    const items: XRayAsset[] = [];
    const filteredAssets = entityFilter === 'all' ? assets
      : entityFilter === 'MyInvestor' ? assets.filter(a => a.type === 'Fondos MyInvestor')
      : entityFilter === 'BBK' ? assets.filter(a => a.type === 'Fondos BBK')
      : [];

    filteredAssets.forEach(a => {
      items.push({
        id: a.id, name: a.name, isin: a.ticker, origin: 'Fondo Individual',
        entity: a.type.replace('Fondos ', ''), value: a.shares * a.currentPrice,
        weightPct: 0, threeDim: a.threeDim, sourceType: 'asset',
      });
    });

    const filteredRobos = (entityFilter === 'all' || entityFilter === 'Robo-Advisors') ? roboAdvisors : [];
    filteredRobos.forEach(r => {
      items.push({
        id: r.id, name: r.name, isin: '—', origin: 'Robo-advisor',
        entity: r.name.split(' - ')[0] || r.name, value: r.totalValue,
        weightPct: 0, threeDim: r.threeDim, sourceType: 'robo',
      });
    });

    const totalValue = items.reduce((s, i) => s + i.value, 0);
    items.forEach(i => { i.weightPct = totalValue > 0 ? (i.value / totalValue) * 100 : 0; });
    return items.sort((a, b) => b.value - a.value);
  }, [assets, roboAdvisors, entityFilter]);

  const filterLabel = entityFilter === 'all' ? 'Cartera Global' : entityFilter;

  const hasDim = (td?: ThreeDimensionClassification) => td && (td.geography.length > 0 || td.sectors.length > 0 || td.assetClassPro.length > 0);

  const handleSaveThreeDim = (td: ThreeDimensionClassification) => {
    if (!editingItem) return;
    if (editingItem.sourceType === 'asset') onUpdateAssetThreeDim(editingItem.id, td);
    else onUpdateRoboThreeDim(editingItem.id, td);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Radiografía (X-Ray) — {filterLabel}</h2>
        <p className="text-sm text-muted-foreground">Exposición ponderada real en 3 dimensiones independientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChart title="Asset Class Profesional" data={assetClassPro} />
        <HorizontalBarSection title="Distribución Geográfica" data={geography} subtitle="Exposición por región/país" />
        <HorizontalBarSection title="Distribución Sectorial" data={sector} subtitle="Exposición por sector/industria" />
      </div>

      {/* Activos Desglosados with inline classification editing */}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activos Desglosados</CardTitle>
          <p className="text-xs text-muted-foreground">Pulsa ✏️ para editar las 3 dimensiones de clasificación de cada activo.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {xrayAssets.map((a, i) => (
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
                          <span key={g.name} className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded">{g.name} {g.weight}%</span>
                        ))}
                        {a.threeDim!.sectors.slice(0, 2).map(s => (
                          <span key={s.name} className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded">{s.name} {s.weight}%</span>
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
        </CardContent>
      </Card>

      {editingItem && (
        <ThreeDimEditor
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          assetName={editingItem.name}
          initial={editingItem.threeDim}
          onSave={handleSaveThreeDim}
        />
      )}
    </div>
  );
}
