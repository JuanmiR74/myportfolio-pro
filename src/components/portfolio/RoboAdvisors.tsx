import { useState, useRef } from 'react';
import { Plus, Upload, Trash2, Pencil, PieChart, Table2, X } from 'lucide-react';
import { RoboAdvisor, RoboMovement, AssetClass, SectorGeo, RoboAdvisorAllocation, RoboAdvisorSectorAllocation } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const ASSET_CLASSES: AssetClass[] = ['Renta Variable', 'Renta Fija', 'Monetario', 'Commodities', 'Mixto'];
const SECTORS: SectorGeo[] = ['Global', 'EEUU', 'Europa', 'Emergentes', 'Salud', 'Tecnología', 'Infraestructuras', 'Commodities', 'Otro'];

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
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [allocDialogId, setAllocDialogId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<{ assetClass: AssetClass; weight: string }[]>([]);
  const [sectorAllocations, setSectorAllocations] = useState<{ sector: SectorGeo; weight: string }[]>([]);
  const [movDialogId, setMovDialogId] = useState<string | null>(null);
  const [editingMovIdx, setEditingMovIdx] = useState<number | null>(null);
  const [movForm, setMovForm] = useState({ date: '', description: '', amount: '', commission: '' });
  const [addingMov, setAddingMov] = useState(false);
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

  const handleEditSave = (id: string) => {
    const val = parseFloat(editValue);
    if (isNaN(val)) return;
    onUpdate(id, { totalValue: val, lastUpdated: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setEditValue('');
    toast.success('Saldo actualizado');
  };

  const openAllocDialog = (robo: RoboAdvisor) => {
    setAllocDialogId(robo.id);
    setAllocations(robo.allocations?.map(a => ({ assetClass: a.assetClass, weight: a.weight.toString() })) || [{ assetClass: 'Renta Variable', weight: '100' }]);
    setSectorAllocations(robo.sectorAllocations?.map(s => ({ sector: s.sector, weight: s.weight.toString() })) || [{ sector: 'Global', weight: '100' }]);
  };

  const saveAllocations = () => {
    if (!allocDialogId) return;
    const ac = allocations.filter(a => parseFloat(a.weight) > 0).map(a => ({ assetClass: a.assetClass, weight: parseFloat(a.weight) }));
    const sc = sectorAllocations.filter(s => parseFloat(s.weight) > 0).map(s => ({ sector: s.sector, weight: parseFloat(s.weight) }));
    const acTotal = ac.reduce((s, x) => s + x.weight, 0);
    const scTotal = sc.reduce((s, x) => s + x.weight, 0);
    if (Math.abs(acTotal - 100) > 0.5) { toast.error(`Tipo activo: pesos suman ${acTotal.toFixed(1)}%, deben sumar 100%`); return; }
    if (Math.abs(scTotal - 100) > 0.5) { toast.error(`Sectores: pesos suman ${scTotal.toFixed(1)}%, deben sumar 100%`); return; }
    onUpdate(allocDialogId, {
      allocations: ac as RoboAdvisorAllocation[],
      sectorAllocations: sc as RoboAdvisorSectorAllocation[],
    });
    setAllocDialogId(null);
    toast.success('Distribución actualizada');
  };

  // Movements management
  const currentRobo = movDialogId ? robos.find(r => r.id === movDialogId) : null;
  const movements = currentRobo?.movements || [];

  const recalcInvested = (movs: RoboMovement[]) => {
    return movs.filter(m => m.category === 'aportacion').reduce((s, m) => s + m.amount, 0);
  };

  const saveMovement = () => {
    if (!movDialogId || !currentRobo) return;
    const amt = parseFloat(movForm.amount);
    const comm = parseFloat(movForm.commission) || 0;
    if (!movForm.date || !movForm.description || isNaN(amt)) { toast.error('Rellena todos los campos'); return; }

    let updatedMovs: RoboMovement[];
    if (editingMovIdx !== null) {
      updatedMovs = [...movements];
      updatedMovs[editingMovIdx] = { ...updatedMovs[editingMovIdx], date: movForm.date, description: movForm.description, amount: amt, commission: comm };
    } else {
      const newMov: RoboMovement = {
        id: crypto.randomUUID(),
        date: movForm.date,
        description: movForm.description,
        amount: amt,
        commission: comm,
        category: amt > 0 ? 'aportacion' : 'otro',
      };
      updatedMovs = [...movements, newMov];
    }

    const newInvested = recalcInvested(updatedMovs);
    onUpdate(movDialogId, { movements: updatedMovs, investedValue: newInvested });
    setMovForm({ date: '', description: '', amount: '', commission: '' });
    setEditingMovIdx(null);
    setAddingMov(false);
    toast.success(editingMovIdx !== null ? 'Movimiento actualizado' : 'Movimiento añadido');
  };

  const deleteMov = (idx: number) => {
    if (!movDialogId) return;
    const updatedMovs = movements.filter((_, i) => i !== idx);
    const newInvested = recalcInvested(updatedMovs);
    onUpdate(movDialogId, { movements: updatedMovs, investedValue: newInvested });
    toast.success('Movimiento eliminado');
  };

  const startEditMov = (idx: number) => {
    const m = movements[idx];
    setEditingMovIdx(idx);
    setMovForm({ date: m.date, description: m.description, amount: m.amount.toString(), commission: m.commission.toString() });
    setAddingMov(true);
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
          onAdd({ name, totalValue: parseFloat(totalValue), investedValue: parseFloat(investedValue || totalValue), lastUpdated: new Date().toISOString().split('T')[0] });
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
                <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="MyInvestor - Cartera Metal" /></div>
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
              <TableHead className="text-right">Aportado</TableHead>
              <TableHead className="text-right">Valor Actual</TableHead>
              <TableHead className="text-right">Rentabilidad</TableHead>
              <TableHead>Distribución</TableHead>
              <TableHead className="text-right">Última Act.</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {robos.map(r => {
              const pl = r.totalValue - r.investedValue;
              const isEditing = editId === r.id;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.investedValue)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-28 h-8 text-right" autoFocus onKeyDown={e => e.key === 'Enter' && handleEditSave(r.id)} />
                        <Button size="sm" variant="outline" className="h-8" onClick={() => handleEditSave(r.id)}>OK</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditId(null)}>✕</Button>
                      </div>
                    ) : fmt(r.totalValue)}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-medium ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    <div className="flex flex-col items-end">
                      <span>{pl >= 0 ? '+' : ''}{fmt(pl)}</span>
                      <span className="text-[10px] opacity-80">({r.investedValue > 0 ? ((pl / r.investedValue) * 100).toFixed(1) : '0.0'}%)</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.allocations?.map(a => (
                        <span key={a.assetClass} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                          {a.assetClass} {a.weight}%
                        </span>
                      )) || <span className="text-xs text-muted-foreground">Sin definir</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.lastUpdated}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setMovDialogId(r.id); setAddingMov(false); setEditingMovIdx(null); }} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Ver Movimientos">
                        <Table2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openAllocDialog(r)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Editar Distribución">
                        <PieChart className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditId(r.id); setEditValue(r.totalValue.toString()); }} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Editar Saldo">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onRemove(r.id)} className="h-8 w-8 text-muted-foreground hover:text-loss">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Allocation Edit Dialog */}
        <Dialog open={!!allocDialogId} onOpenChange={open => !open && setAllocDialogId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Distribución del Robo-Advisor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Tipo de Activo</Label>
                <div className="space-y-1 mt-1">
                  {allocations.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select value={a.assetClass} onValueChange={v => { const u = [...allocations]; u[i] = { ...u[i], assetClass: v as AssetClass }; setAllocations(u); }}>
                        <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{ASSET_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" value={a.weight} onChange={e => { const u = [...allocations]; u[i] = { ...u[i], weight: e.target.value }; setAllocations(u); }} className="w-20 h-8 text-right" />
                      <span className="text-xs text-muted-foreground">%</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAllocations(allocations.filter((_, j) => j !== i))}>✕</Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAllocations([...allocations, { assetClass: 'Renta Fija', weight: '0' }])}>+ Tipo</Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Sector / Geografía</Label>
                <div className="space-y-1 mt-1">
                  {sectorAllocations.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select value={s.sector} onValueChange={v => { const u = [...sectorAllocations]; u[i] = { ...u[i], sector: v as SectorGeo }; setSectorAllocations(u); }}>
                        <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{SECTORS.map(sec => <SelectItem key={sec} value={sec}>{sec}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" value={s.weight} onChange={e => { const u = [...sectorAllocations]; u[i] = { ...u[i], weight: e.target.value }; setSectorAllocations(u); }} className="w-20 h-8 text-right" />
                      <span className="text-xs text-muted-foreground">%</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSectorAllocations(sectorAllocations.filter((_, j) => j !== i))}>✕</Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSectorAllocations([...sectorAllocations, { sector: 'Otro', weight: '0' }])}>+ Sector</Button>
                </div>
              </div>
              <Button onClick={saveAllocations} className="w-full">Guardar Distribución</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Movements Dialog */}
        <Dialog open={!!movDialogId} onOpenChange={open => { if (!open) { setMovDialogId(null); setAddingMov(false); setEditingMovIdx(null); } }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5 text-primary" />
                Movimientos — {currentRobo?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {movements.length} movimiento(s) · Capital invertido: <span className="font-mono font-medium text-foreground">{fmt(currentRobo?.investedValue || 0)}</span>
                </p>
                <Button size="sm" onClick={() => { setAddingMov(true); setEditingMovIdx(null); setMovForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '', commission: '0' }); }} className="gap-1">
                  <Plus className="h-4 w-4" /> Añadir
                </Button>
              </div>

              {addingMov && (
                <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-secondary/30">
                  <p className="text-sm font-medium">{editingMovIdx !== null ? 'Editar movimiento' : 'Nuevo movimiento'}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div><Label className="text-xs">Fecha</Label><Input type="date" value={movForm.date} onChange={e => setMovForm({ ...movForm, date: e.target.value })} className="h-8 text-sm" /></div>
                    <div className="col-span-2 sm:col-span-1"><Label className="text-xs">Concepto</Label><Input value={movForm.description} onChange={e => setMovForm({ ...movForm, description: e.target.value })} className="h-8 text-sm" placeholder="Aportación" /></div>
                    <div><Label className="text-xs">Importe (€)</Label><Input type="number" value={movForm.amount} onChange={e => setMovForm({ ...movForm, amount: e.target.value })} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Comisión (€)</Label><Input type="number" value={movForm.commission} onChange={e => setMovForm({ ...movForm, commission: e.target.value })} className="h-8 text-sm" /></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => { setAddingMov(false); setEditingMovIdx(null); }}>Cancelar</Button>
                    <Button size="sm" onClick={saveMovement}>Guardar</Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Concepto</TableHead>
                      <TableHead className="text-right text-xs">Importe</TableHead>
                      <TableHead className="text-right text-xs">Comisión</TableHead>
                      <TableHead className="text-xs">ISIN</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">Sin movimientos registrados</TableCell></TableRow>
                    )}
                    {movements.map((m, idx) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs font-mono">{m.date}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{m.description}</TableCell>
                        <TableCell className={`text-right text-xs font-mono ${m.amount >= 0 ? 'text-profit' : 'text-loss'}`}>{fmt(m.amount)}</TableCell>
                        <TableCell className="text-right text-xs font-mono text-loss">{m.commission > 0 ? `-${fmt(m.commission)}` : '—'}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{m.isin || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditMov(idx)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" onClick={() => deleteMov(idx)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <p className="text-xs text-muted-foreground mt-3">📋 Movimientos · 📊 Distribución · ✏️ Editar Saldo</p>
      </CardContent>
    </Card>
  );
}
