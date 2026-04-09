import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { RoboSubFund, IsinEntry } from '@/types/portfolio';

interface Props {
  subFunds: RoboSubFund[];
  onSave: (subFunds: RoboSubFund[]) => void;
  roboName: string;
  getByIsin?: (isin: string) => IsinEntry | undefined;
  upsertIsin?: (entry: Omit<IsinEntry, 'id'> & { id?: string }) => void;
}

export default function SubFundsEditor({ subFunds, onSave, roboName, getByIsin, upsertIsin }: Props) {
  const [funds, setFunds] = useState<RoboSubFund[]>(subFunds);
  const [expanded, setExpanded] = useState(true);

  const totalWeight = funds.reduce((s, f) => s + f.weightPct, 0);
  const weightOk = funds.length === 0 || Math.abs(totalWeight - 100) <= 1;

  const addFund = () => {
    setFunds(prev => [...prev, {
      id: crypto.randomUUID(),
      isin: '',
      name: '',
      weightPct: 0,
    }]);
  };

  const updateFund = (id: string, field: keyof RoboSubFund, value: string | number) => {
    setFunds(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeFund = (id: string) => {
    setFunds(prev => prev.filter(f => f.id !== id));
  };

  const handleIsinBlur = (fund: RoboSubFund) => {
    const isin = fund.isin.trim().toUpperCase();
    if (!isin) return;
    const entry = getByIsin?.(isin);
    if (entry) {
      setFunds(prev => prev.map(f =>
        f.id === fund.id ? { ...f, isin, name: entry.name } : f
      ));
      toast.info(`"${entry.name}" recuperado de la librería ISIN`);
    } else {
      setFunds(prev => prev.map(f =>
        f.id === fund.id ? { ...f, isin } : f
      ));
    }
  };

  const handleSave = () => {
    const validFunds = funds.filter(f => f.name.trim() || f.isin.trim());
    const total = validFunds.reduce((s, f) => s + f.weightPct, 0);
    if (validFunds.length > 0 && Math.abs(total - 100) > 1) {
      toast.error(`Los pesos suman ${total.toFixed(1)}%, deben sumar 100%`);
      return;
    }
    validFunds.forEach(f => {
      if (!upsertIsin || !f.isin.trim()) return;
      const existing = getByIsin?.(f.isin.toUpperCase());
      upsertIsin({
        isin: f.isin.toUpperCase(),
        name: f.name,
        assetType: existing?.assetType ?? 'Fondos MyInvestor',
        geography: existing?.geography ?? [],
        sectors: existing?.sectors ?? [],
        assetClassPro: existing?.assetClassPro ?? [],
      });
    });
    onSave(validFunds);
    toast.success('Desglose de fondos guardado');
  };

  const autoDistribute = () => {
    if (funds.length === 0) return;
    const even = parseFloat((100 / funds.length).toFixed(1));
    const rem = parseFloat((100 - even * funds.length).toFixed(1));
    setFunds(prev => prev.map((f, i) => ({ ...f, weightPct: i === 0 ? even + rem : even })));
    toast.info('Pesos distribuidos equitativamente');
  };

  return (
    <div className="border border-border/50 rounded-lg bg-secondary/20">
      <button
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-secondary/30 transition-colors rounded-t-lg"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="text-sm font-medium">Desglose de Fondos — {roboName}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {funds.length} fondo(s)
        </span>
      </button>

      {expanded && (
        <div className="p-3 pt-0 space-y-3">
          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={addFund} className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Añadir fondo
            </Button>
            {funds.length > 1 && (
              <Button size="sm" variant="ghost" onClick={autoDistribute} className="h-7 text-xs">
                Distribuir pesos
              </Button>
            )}
          </div>

       // REEMPLAZAR TODA la tabla (líneas 114-180) con esta versión simplificada:
{funds.length > 0 && (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs w-40">ISIN</TableHead>
          <TableHead className="text-xs">Nombre del Fondo</TableHead>
          <TableHead className="text-xs text-right w-24">Peso (%)</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {funds.map(f => {
          const isKnown = !!(f.isin && getByIsin?.(f.isin.toUpperCase()));
          return (
            <TableRow key={f.id}>
              <TableCell className="py-1">
                <Input
                  value={f.isin}
                  onChange={e => updateFund(f.id, 'isin', e.target.value)}
                  onBlur={() => handleIsinBlur(f)}
                  className="h-7 text-xs font-mono"
                  placeholder="IE00B4L5Y983"
                  data-testid={`input-isin-${f.id}`}
                />
              </TableCell>
              <TableCell className="py-1">
                <span className={`text-xs ${isKnown ? 'font-medium' : 'text-muted-foreground'}`}>
                  {f.name || '—'}
                </span>
              </TableCell>
              <TableCell className="py-1">
                <Input
                  type="number"
                  value={f.weightPct || ''}
                  onChange={e => updateFund(f.id, 'weightPct', parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs text-right"
                  step="0.1"
                  min={0}
                  max={100}
                  placeholder="0"
                  data-testid={`input-weight-${f.id}`}
                />
              </TableCell>
              <TableCell className="py-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFund(f.id)}
                  data-testid={`button-remove-${f.id}`}
                >
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

// NOTA: He removido:
// ❌ Campo "Nombre del Fondo" editable (ahora solo lectura, recuperado de librería)
// ❌ Selector de Asset Classes
// ❌ Selector de Geografía/Sectores
// ✅ Solo ISIN, Nombre (readonly), Peso (editable) 
          
          {funds.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span
                className={`text-xs font-mono font-medium ${weightOk ? 'text-muted-foreground' : 'text-destructive'}`}
                data-testid="text-weight-total"
              >
                Total: {totalWeight.toFixed(1)}%
                {!weightOk && ` — faltan ${(100 - totalWeight).toFixed(1)}%`}
                {weightOk && funds.length > 0 && ' ✓'}
              </span>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!weightOk && funds.length > 0}
                className="h-7 text-xs"
                data-testid="button-save-subfunds"
              >
                Guardar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
