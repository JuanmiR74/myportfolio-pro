import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { RoboSubFund, ThreeDimensionClassification } from '@/types/portfolio';
import ThreeDimEditor from './ThreeDimEditor';

interface Props {
  subFunds: RoboSubFund[];
  onSave: (subFunds: RoboSubFund[]) => void;
  roboName: string;
}

export default function SubFundsEditor({ subFunds, onSave, roboName }: Props) {
  const [funds, setFunds] = useState<RoboSubFund[]>(subFunds);
  const [editingFundId, setEditingFundId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const totalWeight = funds.reduce((s, f) => s + f.weightPct, 0);

  const addFund = () => {
    const newFund: RoboSubFund = {
      id: crypto.randomUUID(),
      isin: '',
      name: '',
      weightPct: 0,
    };
    setFunds([...funds, newFund]);
  };

  const updateFund = (id: string, field: keyof RoboSubFund, value: string | number) => {
    setFunds(funds.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeFund = (id: string) => {
    setFunds(funds.filter(f => f.id !== id));
  };

  const handleSave = () => {
    const validFunds = funds.filter(f => f.name.trim());
    const total = validFunds.reduce((s, f) => s + f.weightPct, 0);
    if (validFunds.length > 0 && Math.abs(total - 100) > 1) {
      toast.error(`Los pesos suman ${total.toFixed(1)}%, deben sumar 100%`);
      return;
    }
    onSave(validFunds);
    toast.success('Desglose de fondos guardado');
  };

  const handleSaveThreeDim = (td: ThreeDimensionClassification) => {
    if (!editingFundId) return;
    setFunds(funds.map(f => f.id === editingFundId ? { ...f, threeDim: td } : f));
    setEditingFundId(null);
  };

  const editingFund = editingFundId ? funds.find(f => f.id === editingFundId) : null;

  // Auto-calculate weights from movements analysis
  const autoCalculateWeights = () => {
    if (funds.length === 0) return;
    const evenWeight = parseFloat((100 / funds.length).toFixed(1));
    const remainder = parseFloat((100 - evenWeight * funds.length).toFixed(1));
    setFunds(funds.map((f, i) => ({
      ...f,
      weightPct: i === 0 ? evenWeight + remainder : evenWeight,
    })));
    toast.info('Pesos distribuidos equitativamente. Ajusta según composición real.');
  };

  return (
    <div className="border border-border/50 rounded-lg bg-secondary/20">
      <button
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-secondary/30 transition-colors rounded-t-lg"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="text-sm font-medium">Desglose de Fondos Internos</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {funds.length} fondo(s) · {totalWeight.toFixed(1)}%
        </span>
      </button>

      {expanded && (
        <div className="p-3 pt-0 space-y-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={addFund} className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Añadir Fondo
            </Button>
            {funds.length > 0 && (
              <Button size="sm" variant="ghost" onClick={autoCalculateWeights} className="h-7 text-xs">
                Distribuir pesos
              </Button>
            )}
          </div>

          {funds.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-28">ISIN</TableHead>
                    <TableHead className="text-xs">Nombre Fondo</TableHead>
                    <TableHead className="text-xs text-right w-20">% Peso</TableHead>
                    <TableHead className="text-xs w-24">Clasificación</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funds.map(f => {
                    const hasClassification = f.threeDim && (
                      f.threeDim.geography.length > 0 || f.threeDim.sectors.length > 0 || f.threeDim.assetClassPro.length > 0
                    );
                    return (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Input
                            value={f.isin}
                            onChange={e => updateFund(f.id, 'isin', e.target.value)}
                            className="h-7 text-xs font-mono"
                            placeholder="ES0000000000"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={f.name}
                            onChange={e => updateFund(f.id, 'name', e.target.value)}
                            className="h-7 text-xs"
                            placeholder="Nombre del fondo"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={f.weightPct}
                            onChange={e => updateFund(f.id, 'weightPct', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs text-right w-16"
                            step="0.1"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => setEditingFundId(f.id)}
                          >
                            {hasClassification ? '✅ 3D' : '⚙️ Clasificar'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFund(f.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {funds.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className={`text-xs font-mono ${Math.abs(totalWeight - 100) > 1 ? 'text-destructive' : 'text-muted-foreground'}`}>
                Total: {totalWeight.toFixed(1)}% {Math.abs(totalWeight - 100) > 1 ? '⚠️' : '✓'}
              </span>
              <Button size="sm" onClick={handleSave} className="h-7 text-xs">
                Guardar desglose
              </Button>
            </div>
          )}

          {editingFund && (
            <ThreeDimEditor
              open={!!editingFundId}
              onClose={() => setEditingFundId(null)}
              assetName={editingFund.name || 'Fondo sin nombre'}
              initial={editingFund.threeDim}
              onSave={handleSaveThreeDim}
            />
          )}
        </div>
      )}
    </div>
  );
}
