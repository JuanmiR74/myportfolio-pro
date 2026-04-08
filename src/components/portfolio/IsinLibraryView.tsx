import { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Tag, CheckCircle2, CircleDashed, Pencil, Check, X } from 'lucide-react';
import { IsinEntry, ThreeDimensionClassification, AssetType } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ThreeDimEditor from '@/components/portfolio/ThreeDimEditor';
import { toast } from 'sonner';

const ASSET_TYPES: AssetType[] = ['Fondos MyInvestor', 'Fondos BBK', 'Acciones', 'Efectivo'];

interface Props {
  entries: IsinEntry[];
  onUpsert: (entry: Omit<IsinEntry, 'id'> & { id?: string }) => void;
  onUpdateClassification: (isin: string, td: ThreeDimensionClassification) => void;
  onDelete: (id: string) => void;
}

interface EditingRow {
  id: string;
  name: string;
  assetType: string;
}

export default function IsinLibraryView({ entries, onUpsert, onUpdateClassification, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [classifyEntry, setClassifyEntry] = useState<IsinEntry | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ isin: '', name: '', assetType: 'Fondos MyInvestor' as AssetType });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e =>
      e.isin.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const hasClassification = (e: IsinEntry) =>
    e.geography?.length > 0 || e.sectors?.length > 0 || e.assetClassPro?.length > 0;

  const classified = entries.filter(hasClassification).length;

  const startEdit = (e: IsinEntry) => {
    setEditingRow({ id: e.id, name: e.name, assetType: e.assetType });
  };

  const cancelEdit = () => setEditingRow(null);

  const saveEdit = (entry: IsinEntry) => {
    if (!editingRow) return;
    onUpsert({
      ...entry,
      name: editingRow.name.trim() || entry.name,
      assetType: editingRow.assetType,
    });
    setEditingRow(null);
    toast.success('Entrada actualizada');
  };

  const handleAdd = () => {
    const isin = addForm.isin.trim().toUpperCase();
    if (!isin) { toast.error('El ISIN es obligatorio'); return; }
    if (entries.find(e => e.isin === isin)) { toast.error('Este ISIN ya existe en la librería'); return; }
    onUpsert({
      isin,
      name: addForm.name.trim() || isin,
      assetType: addForm.assetType,
      geography: [],
      sectors: [],
      assetClassPro: [],
    });
    setAddForm({ isin: '', name: '', assetType: 'Fondos MyInvestor' });
    setAddOpen(false);
    toast.success(`ISIN ${isin} añadido a la librería`);
  };

  const handleSaveClassification = (td: ThreeDimensionClassification) => {
    if (!classifyEntry) return;
    onUpdateClassification(classifyEntry.isin, td);
    setClassifyEntry(null);
    toast.success(`Clasificación de ${classifyEntry.isin} guardada`);
  };

  const geoSummary = (e: IsinEntry) => {
    if (!e.geography?.length) return null;
    const top = [...e.geography].sort((a, b) => b.weight - a.weight).slice(0, 2);
    return top.map(g => `${g.name} ${g.weight}%`).join(' · ');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5 text-primary" />
                Librería Global de ISINs
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {entries.length} fondos aprendidos · {classified} clasificados
              </p>
            </div>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5" data-testid="button-add-isin">
              <Plus className="h-4 w-4" /> Añadir ISIN
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por ISIN o nombre…"
              className="pl-9"
              data-testid="input-search-isin"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {entries.length === 0
                ? 'La librería está vacía. Los ISINs se aprenden automáticamente al añadir fondos.'
                : 'No se encontraron resultados para la búsqueda.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs w-36">ISIN</TableHead>
                    <TableHead className="text-xs">Nombre del Fondo</TableHead>
                    <TableHead className="text-xs w-40">Tipo</TableHead>
                    <TableHead className="text-xs w-40">Clasificación</TableHead>
                    <TableHead className="text-xs w-36">Geografía top</TableHead>
                    <TableHead className="w-28 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(entry => {
                    const isEditing = editingRow?.id === entry.id;
                    const classified = hasClassification(entry);
                    return (
                      <TableRow key={entry.id} className="group">
                        <TableCell className="py-2">
                          <span className="font-mono text-xs text-muted-foreground">{entry.isin}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          {isEditing ? (
                            <Input
                              value={editingRow!.name}
                              onChange={e => setEditingRow(r => r ? { ...r, name: e.target.value } : r)}
                              className="h-7 text-xs"
                              autoFocus
                              data-testid={`input-name-edit-${entry.id}`}
                            />
                          ) : (
                            <span className="text-sm">{entry.name || <span className="text-muted-foreground italic">Sin nombre</span>}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          {isEditing ? (
                            <Select
                              value={editingRow!.assetType}
                              onValueChange={v => setEditingRow(r => r ? { ...r, assetType: v } : r)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSET_TYPES.map(t => (
                                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">{entry.assetType || '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          {classified ? (
                            <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-600/40 bg-emerald-50 dark:bg-emerald-900/20">
                              <CheckCircle2 className="h-3 w-3" /> Clasificado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-500/40 bg-amber-50 dark:bg-amber-900/20">
                              <CircleDashed className="h-3 w-3" /> Sin clasificar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-xs text-muted-foreground truncate max-w-[130px] block">
                            {geoSummary(entry) ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" onClick={() => saveEdit(entry)} data-testid={`button-save-${entry.id}`}>
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={cancelEdit} data-testid={`button-cancel-${entry.id}`}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => startEdit(entry)}
                                  data-testid={`button-edit-${entry.id}`}
                                >
                                  <Pencil className="h-3 w-3 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-6 text-[10px] px-2 ${classified ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}
                                  onClick={() => setClassifyEntry(entry)}
                                  data-testid={`button-classify-${entry.id}`}
                                >
                                  {classified ? '✅ 3D' : '⚙️ Clasificar'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => { onDelete(entry.id); toast.success(`${entry.isin} eliminado`); }}
                                  data-testid={`button-delete-${entry.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add ISIN Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Añadir ISIN manualmente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">ISIN *</Label>
              <Input
                value={addForm.isin}
                onChange={e => setAddForm(f => ({ ...f, isin: e.target.value.toUpperCase() }))}
                placeholder="IE00B4L5Y983"
                className="font-mono mt-1"
                data-testid="input-add-isin"
              />
            </div>
            <div>
              <Label className="text-xs">Nombre del fondo</Label>
              <Input
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: iShares MSCI World ETF"
                className="mt-1"
                data-testid="input-add-name"
              />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={addForm.assetType} onValueChange={v => setAddForm(f => ({ ...f, assetType: v as AssetType }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} data-testid="button-confirm-add">Añadir a librería</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ThreeDimEditor for classification */}
      {classifyEntry && (
        <ThreeDimEditor
          open={!!classifyEntry}
          onClose={() => setClassifyEntry(null)}
          assetName={classifyEntry.name || classifyEntry.isin}
          initial={
            (classifyEntry.geography?.length || classifyEntry.sectors?.length || classifyEntry.assetClassPro?.length)
              ? {
                  geography: classifyEntry.geography as any,
                  sectors: classifyEntry.sectors as any,
                  assetClassPro: classifyEntry.assetClassPro as any,
                }
              : undefined
          }
          onSave={handleSaveClassification}
        />
      )}
    </div>
  );
}
