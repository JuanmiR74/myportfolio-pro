import { TrendingUp, TrendingDown, Wallet, Activity, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  totalValue: number;
  totalPL: number;
  totalPLPercent: number;
  dayChange: number;
  xirr: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function SummaryCards({ totalValue, totalPL, totalPLPercent, dayChange, xirr }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Valor Total</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight">{fmt(totalValue)}</p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Ganancia/Pérdida</span>
            {totalPL >= 0 ? <TrendingUp className="h-4 w-4 text-profit" /> : <TrendingDown className="h-4 w-4 text-loss" />}
          </div>
          <p className={`text-2xl font-bold font-mono tracking-tight ${totalPL >= 0 ? 'text-profit' : 'text-loss'}`}>
            {fmt(totalPL)}
          </p>
          <p className={`text-sm font-mono ${totalPL >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Cambio del día</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <p className={`text-2xl font-bold font-mono tracking-tight ${dayChange >= 0 ? 'text-profit' : 'text-loss'}`}>
            {dayChange >= 0 ? '+' : ''}{fmt(dayChange)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">TIR (XIRR)</span>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <p className={`text-2xl font-bold font-mono tracking-tight ${xirr >= 0 ? 'text-profit' : 'text-loss'}`}>
            {xirr >= 0 ? '+' : ''}{xirr.toFixed(2)}%
          </p>
          <p className="text-sm text-muted-foreground">Rendimiento anualizado</p>
        </CardContent>
      </Card>
    </div>
  );
}
