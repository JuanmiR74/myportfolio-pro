import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  ThreeDimensionClassification, GeoZone, SectorName, AssetClassPro, WeightedItem,
} from '@/types/portfolio';

const GEO_OPTIONS: GeoZone[] = ['EEUU', 'Europa', 'Emergentes', 'Japón', 'Asia-Pacífico', 'Global', 'Otro'];
const SECTOR_OPTIONS: SectorName[] = ['Tecnología', 'Salud', 'Financiero', 'Energía', 'Consumo', 'Industria', 'Infraestructuras', 'Commodities', 'Inmobiliario', 'Telecomunicaciones', 'Otro'];
const ACP_OPTIONS: AssetClassPro[] = [
  'RV - Growth', 'RV - Value', 'RV - Large Cap', 'RV - Mid/Small Cap', 'RV - Blend',
  'RF - Sovereign', 'RF - Corporate', 'RF - High Yield', 'RF - Corto Plazo', 'RF - Largo Plazo',
  'Monetario', 'Commodities', 'Mixto',
];

interface Props {
  open: boolean;
  onClose: () => void;
  assetName: string;
  initial?: ThreeDimensionClassification;
  onSave: (td: ThreeDimensionClassification) => void;
  children?: React.ReactNode;
}

type EditRow = { name: string; weight: string };

function DimensionSection<T extends string>({ label, options, rows, setRows, color }: {
  label: string; options: T[]; rows: EditRow[]; setRows: (r: EditRow[]) => void; color: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        {label}
        <span className="text-xs text-muted-foreground ml-auto font-mono">
          {rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0).toFixed(0)}%
        </span>
      </Label>
      <div className="space-y-1 mt-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Select value={r.name} onValueChange={v => { const u = [...rows]; u[i] = { ...u[i], name: v }; setRows(u); }}>
              <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" value={r.weight} onChange={e => { const u = [...rows]; u[i] = { ...u[i], weight: e.target.value }; setRows(u); }}
              className="w-16 h-7 text-xs text-right" />
            <span className="text-xs text-muted-foreground">%</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setRows(rows.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setRows([...rows, { name: options[options.length - 1], weight: '0' }])}>
          <Plus className="h-3 w-3" /> Añadir
        </Button>
      </div>
    </div>
  );
}

export default function ThreeDimEditor({ open, onClose, assetName, initial, onSave }: Props) {
  const [geo, setGeo] = useState<EditRow[]>(
    initial?.geography?.map(g => ({ name: g.name, weight: g.weight.toString() })) || [{ name: 'Global', weight: '100' }]
  );
  const [sec, setSec] = useState<EditRow[]>(
    initial?.sectors?.map(s => ({ name: s.name, weight: s.weight.toString() })) || [{ name: 'Otro', weight: '100' }]
  );
  const [acp, setAcp] = useState<EditRow[]>(
    initial?.assetClassPro?.map(a => ({ name: a.name, weight: a.weight.toString() })) || [{ name: 'RV - Blend', weight: '100' }]
  );

  const validate = (rows: EditRow[], label: string): WeightedItem[] | null => {
    const items = rows.filter(r => parseFloat(r.weight) > 0).map(r => ({ name: r.name, weight: parseFloat(r.weight) }));
    const total = items.reduce((s, x) => s + x.weight, 0);
    if (items.length > 0 && Math.abs(total - 100) > 0.5) {
      toast.error(`${label}: los pesos suman ${total.toFixed(1)}%, deben sumar 100%`);
      return null;
    }
    return items as WeightedItem[];
  };

  const handleSave = () => {
    const geoItems = validate(geo, 'Geografía');
    const secItems = validate(sec, 'Sector');
    const acpItems = validate(acp, 'Asset Class');
    if (!geoItems || !secItems || !acpItems) return;
    onSave({ geography: geoItems as any, sectors: secItems as any, assetClassPro: acpItems as any });
    toast.success('Clasificación actualizada');
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Clasificación 3D — {assetName}</DialogTitle>
          <p className="text-xs text-muted-foreground">Cada dimensión debe sumar 100% de forma independiente.</p>
        </DialogHeader>
        <div className="space-y-5">
          <DimensionSection label="Geografía" options={GEO_OPTIONS} rows={geo} setRows={setGeo} color="bg-blue-500" />
          <DimensionSection label="Sector" options={SECTOR_OPTIONS} rows={sec} setRows={setSec} color="bg-emerald-500" />
          <DimensionSection label="Asset Class Profesional" options={ACP_OPTIONS} rows={acp} setRows={setAcp} color="bg-amber-500" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
