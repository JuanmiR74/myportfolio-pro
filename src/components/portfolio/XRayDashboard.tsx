import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataItem {
  name: string;
  value: number;
  fill: string;
}

interface Props {
  getXrayByEntity: (entity: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors') => {
    assetClass: DataItem[];
    sectorGeo: DataItem[];
  };
  entityFilter: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors';
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtPct(value: number, total: number) {
  return total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
}

// Separate sector vs geography items
const GEO_ITEMS = new Set(['Global', 'EEUU', 'Europa', 'Emergentes']);
const SECTOR_ITEMS = new Set(['Salud', 'Tecnología', 'Infraestructuras', 'Commodities', 'Otro']);

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
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: d.fill }}
                  />
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

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <div className="w-52 h-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [fmt(v), '']}
                  contentStyle={{ background: 'hsl(224, 25%, 11%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
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
                <span className="font-mono font-medium ml-auto text-xs shrink-0">{fmtPct(d.value, total)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function XRayDashboard({ getXrayByEntity, entityFilter }: Props) {
  const { assetClass, sectorGeo } = getXrayByEntity(entityFilter);

  // Split sectorGeo into geographic and sectoral
  const geographic = useMemo(() => sectorGeo.filter(d => GEO_ITEMS.has(d.name)), [sectorGeo]);
  const sectoral = useMemo(() => sectorGeo.filter(d => SECTOR_ITEMS.has(d.name) || !GEO_ITEMS.has(d.name)), [sectorGeo]);

  const filterLabel = entityFilter === 'all' ? 'Cartera Global' : entityFilter;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Radiografía (X-Ray) — {filterLabel}</h2>
        <p className="text-sm text-muted-foreground">Exposición ponderada real de tu patrimonio. Usa el filtro global para cambiar la vista.</p>
      </div>

      {/* Asset Allocation Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChart title="Asset Allocation" data={assetClass} />

        {/* Geographic Distribution - Horizontal Bars */}
        <HorizontalBarSection
          title="Distribución Geográfica"
          data={geographic}
          subtitle="Exposición por región/país"
        />

        {/* Sector Distribution - Horizontal Bars */}
        <HorizontalBarSection
          title="Distribución Sectorial"
          data={sectoral}
          subtitle="Exposición por sector/industria"
        />
      </div>
    </div>
  );
}
