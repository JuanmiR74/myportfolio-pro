import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataItem {
  name: string;
  value: number;
  fill: string;
}

const COLORS = [
  'hsl(160, 84%, 39%)',
  'hsl(217, 91%, 60%)',
  'hsl(47, 96%, 53%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 0%, 60%)',
];

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function AllocationChart({ data }: { data: DataItem[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribución por Tipo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(224, 25%, 11%)', border: 'none', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-mono font-medium ml-auto">{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
