import { useState } from 'react';
import { Trash2, Plus, Filter, Pencil, Check, X } from 'lucide-react';
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
  onUpdate: (id: string, updates: Partial<Asset>) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

type EntityFilter = 'all' | 'MyInvestor' | 'BBK';

export default function FundsTable({ assets, onAdd, onRemove, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ shares: '', buyPrice: '', currentPrice: '' });
  const [form, setForm] = useState({ name: '', ticker: '', type: 'Fondos MyInvestor' as AssetType, shares: '', buyPrice: '', currentPrice: '' });

  const filtered = entityFilter === 'all'
    ? assets.filter(a => a.type === 'Fondos MyInvestor' || a.type === 'Fondos BBK')
    : assets.filter(a => a.type === (entityFilter === 'MyInvestor' ? 'Fondos MyInvestor' : 'Fondos BBK'));

  const handleSubmit = () => {
    if (!form.name || !form.ticker || !form.shares || !form.buyPrice) return;
    onAdd({
      name: form.name,
      ticker: form.ticker.toUpperCase(),
      type: form.type,
      shares: parseFloat(form.shares),
      buyPrice: parseFloat(form.buyPrice),
      currentPrice: parseFloat(form.currentPrice || "0"),
    });
    setForm({ name: '', ticker: '', type: 'Fondos MyInvestor', shares: '', buyPrice: '', currentPrice: '' });
    setOpen(false);
  };

  const startEditing = (a: Asset) => {
    setEditingId(a.id);
    setEditForm({
      shares: a.shares.toString(),
      buyPrice: a.buyPrice.toString(),
      currentPrice: a.currentPrice.toString()
    });
  };

  const handleSaveEdit = (id: string) => {
    onUpdate(id, {
      shares: parseFloat(editForm.shares),
      buyPrice: parseFloat(editForm.buyPrice),
      currentPrice: parseFloat(editForm.currentPrice)
    });
    setEditingId(null);
  };

  const getEntityName = (type: AssetType) => {
    return type === 'Fondos MyInvestor' ? 'MyInvestor' : 'BBK';
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-4 flex-wrap gap-2">
        <CardTitle className="text-base font-semibold">Fondos de Inversión</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={entityFilter} onValueChange={v => setEntityFilter(v as EntityFilter)}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ver Todo</SelectItem>
                <SelectItem value="MyInvestor">MyInvestor</SelectItem>
                <SelectItem value="BBK">BBK</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Añadir</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Añadir Fondo</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>ISIN / Ticker</Label><Input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} /></div>
                <div>
                  <Label>Entidad</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as AssetType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fondos MyInvestor">MyInvestor</SelectItem>
                      <SelectItem value="Fondos BBK">BBK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Inversión Total (€)</Label><Input type="number" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} /></div>
                  <div><Label>Participaciones</Label><Input type="number" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} /></div>
                </div>
                <div><Label>Precio Actual Cuota (€)</Label><Input type="number" value={form.currentPrice} onChange={e => setForm({ ...form, currentPrice: e.target.value })} /></div>
                <Button onClick={handleSubmit}>Guardar Fondo</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead className="text-right">Aportado</TableHead>
              <TableHead className="text-right">Uds.</TableHead>
              <TableHead className="text-right">P. Actual</TableHead>
              <TableHead className="text-right">Valor Act.</TableHead>
              <TableHead className="text-right">P/L (€)</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(a => {
              const isEditing = editingId === a.id;
              const invested = isEditing ? parseFloat(editForm.buyPrice) : a.buyPrice;
              const shares = isEditing ? parseFloat(editForm.shares) : a.shares;
              const currentPrice = isEditing ? parseFloat(editForm.currentPrice) : a.currentPrice;
              const currentVal = (shares * currentPrice) || 0;
              const profitEuro = currentVal - invested;

              return (
                <TableRow key={a.id} className={isEditing ? "bg-muted/30" : ""}>
                  <TableCell className="font-medium text-sm">{a.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getEntityName(a.type)}</TableCell>
                  
                  <TableCell className="text-right font-mono text-sm">
                    {isEditing ? (
                      <Input className="h-7 w-24 text-right text-xs ml-auto" type="number" value={editForm.buyPrice} onChange={e => setEditForm({...editForm, buyPrice: e.target.value})} />
                    ) : fmt(invested)}
                  </TableCell>

                  <TableCell className="text-right font-mono text-xs">
                    {isEditing ? (
                      <Input className="h-7 w-20 text-right text-xs ml-auto" type="number" value={editForm.shares} onChange={e => setEditForm({...editForm, shares: e.target.value})} />
                    ) : a.shares.toFixed(4)}
                  </TableCell>

                  <TableCell className="text-right font-mono text-xs">
                    {isEditing ? (
                      <Input className="h-7 w-20 text-right text-xs ml-auto" type="number" value={editForm.currentPrice} onChange={e => setEditForm({...editForm, currentPrice: e.target.value})} />
                    ) : fmt(currentPrice)}
                  </TableCell>
                  
                  <TableCell className="text-right font-mono font-semibold text-sm">{fmt(currentVal)}</TableCell>

                  <TableCell className={`text-right font-mono font-bold text-sm ${profitEuro >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {profitEuro >= 0 ? '+' : ''}{fmt(profitEuro)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      {isEditing ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(a.id)} className="h-7 w-7 text-profit"><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-7 w-7 text-muted-foreground"><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => startEditing(a)} className="h-7 w-7 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => onRemove(a.id)} className="h-7 w-7 text-muted-foreground hover:text-loss"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
