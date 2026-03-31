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
  onUpdate: (id: string, updates: Partial<Asset>) => void; // Añadido para edición
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

type EntityFilter = 'all' | 'MyInvestor' | 'BBK';

export default function FundsTable({ assets, onAdd, onRemove, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{shares: string, buyPrice: string, currentPrice: string}>({ shares: '', buyPrice: '', currentPrice: '' });
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
      currentPrice: parseFloat(form.currentPrice || form.buyPrice),
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

  const getEntity = (type: AssetType) => {
    if (type === 'Fondos MyInvestor') return 'MyInvestor';
    if (type === 'Fondos BBK') return 'BBK';
    return type;
  };

  const totalValue = filtered.reduce((s, a) => s + a.shares * a.currentPrice, 0);
  const totalCost = filtered.reduce((s, a) => s + a.shares * a.buyPrice, 0);
  const totalPL = totalValue - totalCost;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2 flex-wrap gap-2">
        <CardTitle className="text-base">Fondos de Inversión</CardTitle>
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
                <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Fidelity MSCI World" /></div>
                <div><Label>ISIN / Ticker</Label><Input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} placeholder="IE00BYX5NX33" /></div>
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
                  <div><Label>Participaciones</Label><Input type="number" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} /></div>
                  <div><Label>Precio compra (€)</Label><Input type="number" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} /></div>
                </div>
                <div><Label>Precio actual (€) (opcional)</Label><Input type="number" value={form.currentPrice} onChange={e => setForm({ ...form, currentPrice: e.target.value })} /></div>
                <Button onClick={handleSubmit}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="flex items-center gap-4 mb-3 text-sm">
          <span className="text-muted-foreground">{filtered.length} fondo(s)</span>
          <span className="font-mono font-medium">{fmt(totalValue)}</span>
          <span className={`font-mono font-medium ${totalPL >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>ISIN</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead className="text-right">Uds.</TableHead>
              <TableHead className="text-right">P. Compra</TableHead>
              <TableHead className="text-right">P. Actual</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">P/L</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(a => {
              const isEditing = editingId === a.id;
              const value = (isEditing ? parseFloat(editForm.shares) * parseFloat(editForm.currentPrice) : a.shares * a.currentPrice) || 0;
              const cost = (isEditing ? parseFloat(editForm.shares) * parseFloat(editForm.buyPrice) : a.shares * a.buyPrice) || 0;
              const pl = value - cost;
              const plPct = cost > 0 ? (pl / cost) * 100 : 0;
              
              return (
                <TableRow key={a.id} className={isEditing ? "bg-muted/30" : ""}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.ticker}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.type === 'Fondos MyInvestor' 
                        ? 'bg-primary/15 text-primary' 
                        : 'bg-chart-2/15 text-chart-2'
                    }`}>
                      {getEntity(a.type)}
                    </span>
                  </TableCell>
                  
                  {/* Celdas Editables */}
                  <TableCell className="text-right font-mono">
                    {isEditing ? (
                      <Input className="h-7 w-20 text-right font-mono text-xs ml-auto" type="number" value={editForm.shares} onChange={e => setEditForm({...editForm, shares: e.target.value})} />
                    ) : a.shares}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {isEditing ? (
                      <Input className="h-7 w-24 text-right font-mono text-xs ml-auto" type="number" value={editForm.buyPrice} onChange={e => setEditForm({...editForm, buyPrice: e.target.value})} />
                    ) : fmt(a.buyPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {isEditing ? (
                      <Input className="h-7 w-24 text-right font-mono text-xs ml-auto" type="number" value={editForm.currentPrice} onChange={e => setEditForm({...editForm, currentPrice: e.target.value})} />
                    ) : fmt(a.currentPrice)}
                  </TableCell>
                  
                  <TableCell className="text-right font-mono font-medium">{fmt(value)}</TableCell>
                  <TableCell className={`text-right font-mono font-medium ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {pl >= 0 ? '+' : ''}{fmt(pl)} ({plPct.toFixed(1)}%)
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(a.id)} className="h-7 w-7 text-profit hover:bg-profit/10">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-7 w-7 text-muted-foreground">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => startEditing(a)} className="h-7 w-7 text-muted-foreground hover:text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onRemove(a.id)} className="h-7 w-7 text-muted-foreground hover:text-loss">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sin fondos. Pulsa "Añadir" para empezar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

