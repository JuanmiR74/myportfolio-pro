import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Asset, AssetType } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Props {
  assets: Asset[];
  onAdd: (asset: Omit<Asset, 'id'>) => void;
  onRemove: (id: string) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function AssetTable({ assets, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', ticker: '', type: 'Acciones' as AssetType, shares: '', buyPrice: '', currentPrice: '' });

  const handleSubmit = () => {
    if (!form.name || !form.ticker || !form.shares || !form.buyPrice) return;
    onAdd({
      name: form.name,
      ticker: form.ticker.toUpperCase(),
      type: form.type,
      shares: parseFloat(form.shares),
      buyPrice: parseFloat(form.buyPrice),
      currentPrice: parseFloat(form.currentPrice || form.buyPrice),
    });
    setForm({ name: '', ticker: '', type: 'Acciones', shares: '', buyPrice: '', currentPrice: '' });
    setOpen(false);
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Mis Activos</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Añadir</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Añadir Activo</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Apple Inc." /></div>
              <div><Label>Ticker / ISIN</Label><Input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} placeholder="AAPL" /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as AssetType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Acciones">Acciones</SelectItem>
                    <SelectItem value="Fondos">Fondos</SelectItem>
                    <SelectItem value="Robo-Advisors">Robo-Advisors</SelectItem>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Participaciones</Label><Input type="number" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} /></div>
                <div><Label>Precio compra (€)</Label><Input type="number" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} /></div>
              </div>
              <div><Label>Precio actual (€) (opcional)</Label><Input type="number" value={form.currentPrice} onChange={e => setForm({ ...form, currentPrice: e.target.value })} /></div>
              <Button onClick={handleSubmit}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Uds.</TableHead>
              <TableHead className="text-right">P. Compra</TableHead>
              <TableHead className="text-right">P. Actual</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">P/L</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map(a => {
              const value = a.shares * a.currentPrice;
              const cost = a.shares * a.buyPrice;
              const pl = value - cost;
              const plPct = cost > 0 ? (pl / cost) * 100 : 0;
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{a.ticker}</TableCell>
                  <TableCell className="text-muted-foreground">{a.type}</TableCell>
                  <TableCell className="text-right font-mono">{a.shares}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(a.buyPrice)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(a.currentPrice)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{fmt(value)}</TableCell>
                  <TableCell className={`text-right font-mono font-medium ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {pl >= 0 ? '+' : ''}{fmt(pl)} ({plPct.toFixed(1)}%)
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(a.id)} className="h-8 w-8 text-muted-foreground hover:text-loss">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {assets.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sin activos. Pulsa "Añadir" para empezar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
