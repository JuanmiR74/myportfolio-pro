import { useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { Asset, AssetClass, SectorGeo, FundClassification } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const ASSET_CLASSES: AssetClass[] = ['Renta Variable', 'Renta Fija', 'Monetario', 'Commodities', 'Mixto'];
const SECTORS: SectorGeo[] = ['Global', 'EEUU', 'Europa', 'Emergentes', 'Salud', 'Tecnología', 'Infraestructuras', 'Commodities', 'Otro'];

interface Props {
  assets: Asset[];
  onUpdateClassification: (id: string, classification: FundClassification) => void;
}

export default function FundClassificationEditor({ assets, onUpdateClassification }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClass, setEditClass] = useState<AssetClass>('Renta Variable');
  const [editSectors, setEditSectors] = useState<{ name: SectorGeo; weight: string }[]>([]);

  const startEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setEditClass(asset.classification?.assetClass || 'Renta Variable');
    setEditSectors(
      asset.classification?.sectors.map(s => ({ name: s.name, weight: s.weight.toString() })) ||
      [{ name: 'Global', weight: '100' }]
    );
  };

  const handleSave = (id: string) => {
    const sectors = editSectors
      .filter(s => parseFloat(s.weight) > 0)
      .map(s => ({ name: s.name, weight: parseFloat(s.weight) }));
    const totalWeight = sectors.reduce((s, x) => s + x.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.5) {
      toast.error(`Los pesos suman ${totalWeight.toFixed(1)}%, deben sumar 100%`);
      return;
    }
    onUpdateClassification(id, { assetClass: editClass, sectors });
    setEditingId(null);
    toast.success('Clasificación actualizada');
  };

  const addSector = () => {
    setEditSectors([...editSectors, { name: 'Otro', weight: '0' }]);
  };

  const removeSector = (idx: number) => {
    setEditSectors(editSectors.filter((_, i) => i !== idx));
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ficha de Fondos — Clasificación</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fondo</TableHead>
              <TableHead>ISIN</TableHead>
              <TableHead>Tipo Activo</TableHead>
              <TableHead>Sectores / Geografía</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map(a => {
              const isEditing = editingId === a.id;
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.ticker}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select value={editClass} onValueChange={v => setEditClass(v as AssetClass)}>
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{a.classification?.assetClass || '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="space-y-1">
                        {editSectors.map((s, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Select value={s.name} onValueChange={v => {
                              const updated = [...editSectors];
                              updated[i] = { ...updated[i], name: v as SectorGeo };
                              setEditSectors(updated);
                            }}>
                              <SelectTrigger className="w-32 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SECTORS.map(sec => <SelectItem key={sec} value={sec}>{sec}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={s.weight}
                              onChange={e => {
                                const updated = [...editSectors];
                                updated[i] = { ...updated[i], weight: e.target.value };
                                setEditSectors(updated);
                              }}
                              className="w-16 h-7 text-xs text-right"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSector(i)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addSector}>+ Sector</Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {a.classification?.sectors.map(s => (
                          <span key={s.name} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                            {s.name} {s.weight}%
                          </span>
                        )) || <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleSave(a.id)}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => startEdit(a)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
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
