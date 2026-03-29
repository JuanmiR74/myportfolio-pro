import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function XRayPie({ title, data }: { title: string; data: DataItem[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{ background: 'hsl(224, 25%, 11%)', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            {data.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.fill }} />
                <span className="text-muted-foreground truncate">{d.name}</span>
                <span className="font-mono font-medium ml-auto shrink-0">
                  {total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%
                </span>
                <span className="font-mono text-xs text-muted-foreground shrink-0">
                  {fmt(d.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function XRayDashboard({ getXrayByEntity }: Props) {
  const [filter, setFilter] = useState<'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors'>('all');
  const { assetClass, sectorGeo } = getXrayByEntity(filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Radiografía (X-Ray) de Cartera</h2>
        <Select value={filter} onValueChange={v => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cartera Global</SelectItem>
            <SelectItem value="MyInvestor">MyInvestor</SelectItem>
            <SelectItem value="BBK">BBK</SelectItem>
            <SelectItem value="Robo-Advisors">Robo-Advisors</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <XRayPie title="Distribución por Tipo de Activo" data={assetClass} />
        <XRayPie title="Distribución por Sector / Geografía" data={sectorGeo} />
      </div>
    </div>
  );
}
