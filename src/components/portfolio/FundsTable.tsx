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
                  <div><Label>Precio medio compra (€)</Label><Input type="number" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} /></div>
                </div>
                <div><Label>Precio actual (€)</Label><Input type="number" value={form.currentPrice} onChange={e => setForm({ ...form, currentPrice: e.target.value })} /></div>
                <Button onClick={handleSubmit}>Guardar Fondo</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="flex items-center gap-4 mb-4 text-sm border-b pb-3 border-border/50">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase">Total Cartera</span>
            <span className="font-mono font-bold text-lg">{fmt(totalValue)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase">Plusvalía Total</span>
            <span className={`font-mono font-bold text-lg ${totalPL >= 0 ? 'text-profit' : 'text-loss'}`}>
              {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
            </span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[250px]">Nombre / ISIN</TableHead>
              <TableHead className="text-right">Uds.</TableHead>
              <TableHead className="text-right">Aportado</TableHead>
              <TableHead className="text-right">P. Actual</TableHead>
              <TableHead className="text-right">Valor Act.</TableHead>
              <TableHead className="text-right">Rentabilidad</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(a => {
              const isEditing = editingId === a.id;
              const shares = isEditing ? parseFloat(editForm.shares) : a.shares;
              const buyPrice = isEditing ? parseFloat(editForm.buyPrice) : a.buyPrice;
              const currentPrice = isEditing ? parseFloat(editForm.currentPrice) : a.currentPrice;

              const invested = (shares * buyPrice) || 0;
              const currentVal = (shares * currentPrice) || 0;
              const profitEuro = currentVal - invested;
              const profitPct = invested > 0 ? (profitEuro / invested) * 100 : 0;

              return (
                <TableRow key={a.id} className={isEditing ? "bg-muted/30" : ""}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm line-clamp-1">{a.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{a.ticker}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right font-mono text-sm">
                    {isEditing ? (
                      <Input className="h-7 w-20 text-right text-xs ml-auto" type="number" value={editForm.shares} onChange={e => setEditForm({...editForm, shares: e.target.value})} />
                    ) : a.shares.toFixed(2)}
                  </TableCell>

                  {/* Campo Aportaciones (Calculado: Uds * P. Compra) */}
                  <TableCell className="text-right font-mono text-sm">
                    {isEditing ? (
                      <div className="flex flex-col items-end gap-1">
                        <Input className="h-7 w-24 text-right text-xs ml-auto" type="number" value={editForm.buyPrice} onChange={e => setEditForm({...editForm, buyPrice: e.target.value})} />
                        <span className="text-[9px] text-muted-foreground">P. Medio</span>
                      </div>
                    ) : fmt(invested)}
                  </TableCell>

                  <TableCell className="text-right font-mono text-sm">
                    {isEditing ? (
                      <Input className="h-7 w-24 text-right text-xs ml-auto" type="number" value={editForm.currentPrice} onChange={e => setEditForm({...editForm, currentPrice: e.target.value})} />
                    ) : fmt(currentPrice)}
                  </TableCell>
                  
                  <TableCell className="text-right font-mono font-semibold text-sm">
                    {fmt(currentVal)}
                  </TableCell>

                  {/* Rentabilidad calculada sobre el total aportado */}
                  <TableCell className={`text-right font-mono font-bold text-sm ${profitEuro >= 0 ? 'text-profit' : 'text-loss'}`}>
                    <div className="flex flex-col items-end">
                      <span>{profitEuro >= 0 ? '+' : ''}{fmt(profitEuro)}</span>
                      <span className="text-[10px] font-medium">{profitPct.toFixed(2)}%</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
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
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin fondos registrados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
