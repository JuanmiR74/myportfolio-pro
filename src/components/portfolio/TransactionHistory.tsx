// =============================================================================
// TransactionHistory.tsx — Historial de movimientos de un Asset
//
// MIGRACIÓN: Ya NO usa useTransactions ni la tabla `transactions`.
// Lee y escribe directamente en asset.movements dentro del JSONB
// a través de usePortfolio (addMovement / removeMovement).
// =============================================================================

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { usePortfolio, calcInvestedFromMovements } from '@/hooks/usePortfolio';
import type { Asset, AssetMovement, AssetMovementType } from '@/types/portfolio';

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

const MOVEMENT_LABELS: Record<AssetMovementType, string> = {
  aportacion: 'Aportación',
  retirada:   'Retirada',
  dividendo:  'Dividendo',
  comision:   'Comisión',
  otro:       'Otro',
};

interface Props {
  /** Asset completo (ya disponible en el estado del hook) */
  asset: Asset;
  /** Callback opcional para notificar al padre del nuevo total invertido */
  onInvestedChanged?: (amount: number) => void;
}

export function TransactionHistory({ asset, onInvestedChanged }: Props) {
  const { addMovement, removeMovement } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    date:        new Date().toISOString().split('T')[0],
    type:        'aportacion' as AssetMovementType,
    amount:      '',
    description: '',
  });

  const movements = asset.movements || [];
  const totalInvested = calcInvestedFromMovements(movements);

  const handleAdd = async () => {
    const amount = parseFloat(form.amount);
    if (!form.date || isNaN(amount) || amount <= 0) {
      toast.error('Introduce una fecha y un importe válido (> 0)');
      return;
    }

    setSaving(true);
    try {
      addMovement(asset.id, {
        date:        form.date,
        type:        form.type,
        amount,
        description: form.description || undefined,
      });

      // Notificar al padre con el nuevo total
      const newMovements: AssetMovement[] = [
        ...movements,
        { id: 'tmp', date: form.date, type: form.type, amount, description: form.description || undefined },
      ];
      onInvestedChanged?.(calcInvestedFromMovements(newMovements));

      setForm({ date: new Date().toISOString().split('T')[0], type: 'aportacion', amount: '', description: '' });
      setShowForm(false);
      toast.success('Movimiento añadido');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (movementId: string) => {
    removeMovement(asset.id, movementId);
    const remaining = movements.filter(m => m.id !== movementId);
    onInvestedChanged?.(calcInvestedFromMovements(remaining));
    toast.success('Movimiento eliminado');
  };

  return (
    <div className="space-y-4">
      {/* Total y botón añadir */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Capital invertido</p>
          <p className="text-xl font-mono font-bold">{fmt(totalInvested)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Añadir movimiento
        </Button>
      </div>

      {/* Lista de movimientos */}
      {movements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Sin movimientos registrados. Añade una aportación para empezar.
        </p>
      ) : (
        <div className="rounded-md border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Importe</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Descripción</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {[...movements]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(m => {
                  const isIn  = m.type === 'aportacion' || m.type === 'dividendo';
                  const isOut = m.type === 'retirada'   || m.type === 'comision';
                  return (
                    <tr key={m.id} className="border-t border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-xs">{m.date}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isIn  ? 'bg-green-500/10 text-green-500' :
                          isOut ? 'bg-red-500/10   text-red-500'   :
                                  'bg-muted         text-muted-foreground'
                        }`}>
                          {MOVEMENT_LABELS[m.type]}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${
                        isIn ? 'text-green-500' : isOut ? 'text-red-500' : ''
                      }`}>
                        {isOut ? '-' : '+'}{fmt(m.amount)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {m.description || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(m.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: añadir movimiento */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Añadir movimiento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={v => setForm(f => ({ ...f, type: v as AssetMovementType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(MOVEMENT_LABELS) as [AssetMovementType, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Importe (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="5000.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descripción <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                placeholder="Aportación mensual..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
