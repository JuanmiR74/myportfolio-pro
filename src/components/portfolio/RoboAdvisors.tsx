import { useState, useRef } from 'react';
import { Plus, Upload, Trash2 } from 'lucide-react';
import { RoboAdvisor } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  robos: RoboAdvisor[];
  onAdd: (r: Omit<RoboAdvisor, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<RoboAdvisor>) => void;
  onRemove: (id: string) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function RoboAdvisors({ robos, onAdd, onUpdate, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', totalValue: '', investedValue: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!form.name || !form.totalValue) return;
    onAdd({
      name: form.name,
      totalValue: parseFloat(form.totalValue),
      investedValue: parseFloat(form.investedValue || form.totalValue),
      lastUpdated: new Date().toISOString().split('T')[0],
    });
    setForm({ name: '', totalValue: '', investedValue: '' });
    setOpen(false);
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').slice(1);
      let count = 0;
      lines.forEach(line => {
        const [name, totalValue, investedValue] = line.split(',').map(s => s.trim());
        if (name && totalValue) {
          onAdd({
            name,
            totalValue: parseFloat(totalValue),
            investedValue: parseFloat(investedValue || totalValue),
            lastUpdated: new Date().toISOString().split('T')[0],
          });
          count++;
        }
      });
      toast.success(`${count} registro(s) importado(s) desde CSV`);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Robo-Advisors</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="gap-1">
            <Upload className="h-4 w-4" /> CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Añadir</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Añadir Robo-Advisor</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Indexa Capital" /></div>
                <div><Label>Valor actual (€)</Label><Input type="number" value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} /></div>
                <div><Label>Valor invertido (€)</Label><Input type="number" value={form.investedValue} onChange={e => setForm({ ...form, investedValue: e.target.value })} /></div>
                <Button onClick={handleSubmit}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Valor Actual</TableHead>
              <TableHead className="text-right">Invertido</TableHead>
              <TableHead className="text-right">P/L</TableHead>
              <TableHead className="text-right">Última Act.</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {robos.map(r => {
              const pl = r.totalValue - r.investedValue;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.totalValue)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.investedValue)}</TableCell>
                  <TableCell className={`text-right font-mono font-medium ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {pl >= 0 ? '+' : ''}{fmt(pl)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.lastUpdated}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(r.id)} className="h-8 w-8 text-muted-foreground hover:text-loss">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-3">CSV formato: nombre, valor_actual, valor_invertido</p>
      </CardContent>
    </Card>
  );
}
