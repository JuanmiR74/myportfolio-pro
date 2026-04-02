import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { toast } from 'sonner';

interface TransactionHistoryProps {
  assetId?: string;
  roboAdvisorId?: string;
  onInvestedChanged?: (amount: number) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export function TransactionHistory({ assetId, roboAdvisorId, onInvestedChanged }: TransactionHistoryProps) {
  const { fetchTransactions, calculateInvested, addTransaction, deleteTransaction } = useTransactions();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invested, setInvested] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });

  const loadTransactions = async () => {
    const txs = await fetchTransactions(assetId, roboAdvisorId);
    setTransactions(txs);
    const inv = await calculateInvested(assetId, roboAdvisorId);
    setInvested(inv);
    onInvestedChanged?.(inv);
  };

  useEffect(() => {
    loadTransactions();
  }, [assetId, roboAdvisorId]);

  const handleAddTransaction = async () => {
    if (!form.amount || !form.date) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    if (!assetId && !roboAdvisorId) {
      toast.error('Se requiere un activo o robo-advisor');
      return;
    }

    setLoading(true);
    try {
      await addTransaction({
        asset_id: assetId,
        robo_advisor_id: roboAdvisorId,
        amount: parseFloat(form.amount),
        date: form.date,
        description: form.description || undefined,
      });

      toast.success('Transacción agregada');
      setForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });
      setOpen(false);
      await loadTransactions();
    } catch (error) {
      toast.error('Error al agregar transacción');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción?')) return;

    try {
      await deleteTransaction(id);
      toast.success('Transacción eliminada');
      await loadTransactions();
    } catch (error) {
      toast.error('Error al eliminar transacción');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Capital invertido (de transacciones)</p>
          <p className="text-2xl font-bold font-mono">{fmt(invested)}</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Movimiento
        </Button>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-right text-xs">Importe</TableHead>
              <TableHead className="text-xs">Descripción</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                  Sin movimientos registrados
                </TableCell>
              </TableRow>
            ) : (
              transactions.map(tx => (
                <TableRow key={tx.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-mono">{tx.date}</TableCell>
                  <TableCell className={`text-right text-sm font-mono font-medium ${tx.amount > 0 ? 'text-profit' : 'text-loss'}`}>
                    {tx.amount > 0 ? '+' : ''}{fmt(tx.amount)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{tx.description || '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agregar Movimiento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Importe (EUR)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="1000.50"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Positivo para aportación, negativo para retirada</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                placeholder="Aportación inicial, retirada parcial, etc."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleAddTransaction} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
