import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Building2, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseMyInvestorXLSX, computeWeightedAllocations, toRoboMovements, ImportSummary } from '@/lib/myInvestorParser';
import { parseOpenbankSnapshot, applyOpenbankSnapshot, OpenbankImportSummary } from '@/lib/openbankParser';
import { RoboMovement, Asset } from '@/types/portfolio';
import { toast } from 'sonner';

interface Props {
  existingMovements?: RoboMovement[];
  existingAssets?: Asset[];
  onConfirmImport: (data: {
    name: string;
    entity: string;
    totalValue: number;
    investedValue: number;
    allocations: { assetClass: string; weight: number }[];
    sectorAllocations: { sector: string; weight: number }[];
    movements: RoboMovement[];
  }) => void;
  onConfirmOpenbankImport?: (updatedAssets: Asset[]) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

type ImportEntity = 'myinvestor' | 'openbank' | 'other';

export default function RoboImporter({ existingMovements, existingAssets, onConfirmImport, onConfirmOpenbankImport }: Props) {
  const [selectedEntity, setSelectedEntity] = useState<ImportEntity | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [openbankSummary, setOpenbankSummary] = useState<OpenbankImportSummary | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const entities: { id: ImportEntity; name: string; enabled: boolean; description: string }[] = [
    { id: 'myinvestor', name: 'MyInvestor', enabled: true, description: 'Carteras Indexadas' },
    { id: 'openbank', name: 'Openbank', enabled: true, description: 'Estado Actual' },
    { id: 'other', name: 'Otros', enabled: false, description: 'Próximamente' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

      if (selectedEntity === 'myinvestor') {
        const result = parseMyInvestorXLSX(rows, existingMovements);
        setSummary(result);
        setOpenbankSummary(null);
      } else if (selectedEntity === 'openbank') {
        const result = parseOpenbankSnapshot(rows, existingAssets || []);
        setOpenbankSummary(result);
        setSummary(null);
      }

      setConfirmOpen(true);
    } catch (err) {
      toast.error('Error al procesar el archivo: ' + (err instanceof Error ? err.message : 'formato no reconocido'));
    }
    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleConfirm = () => {
    if (summary) {
      const { allocations, sectorAllocations } = computeWeightedAllocations(summary.fundBreakdown);
      const totalFundValue = summary.fundBreakdown.reduce((s, f) => s + f.totalInvested, 0);
      const newMovements = toRoboMovements(summary.movements);
      const allMovements = [...(existingMovements || []), ...newMovements];

      onConfirmImport({
        name: 'MyInvestor - Cartera Metal',
        entity: 'MyInvestor',
        totalValue: totalFundValue + summary.currentCash,
        investedValue: summary.investedValue,
        allocations: allocations as { assetClass: string; weight: number }[],
        sectorAllocations: sectorAllocations as { sector: string; weight: number }[],
        movements: allMovements,
      });

      setConfirmOpen(false);
      setSummary(null);
      setSelectedEntity(null);
      toast.success(`Importación completada: ${summary.newMovementsCount} nuevos movimientos (${summary.duplicatesSkipped} duplicados ignorados)`);
    } else if (openbankSummary && onConfirmOpenbankImport) {
      const updatedAssets = applyOpenbankSnapshot(openbankSummary, existingAssets || []);
      onConfirmOpenbankImport(updatedAssets);

      setConfirmOpen(false);
      setOpenbankSummary(null);
      setSelectedEntity(null);
      toast.success(`Openbank importado: ${openbankSummary.newFundsCount} nuevos fondos, ${openbankSummary.updatedFundsCount} actualizados`);
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Importar desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">¿De qué entidad es el fichero que vas a subir?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {entities.map(entity => (
              <button
                key={entity.id}
                disabled={!entity.enabled}
                onClick={() => setSelectedEntity(entity.id)}
                className={`relative p-4 rounded-lg border text-left transition-all ${
                  !entity.enabled
                    ? 'opacity-50 cursor-not-allowed border-border/30 bg-card/30'
                    : selectedEntity === entity.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card/80 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium text-sm">{entity.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{entity.description}</p>
                {!entity.enabled && (
                  <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">
                    <Clock className="h-3 w-3 mr-0.5" /> Próximamente
                  </Badge>
                )}
                {selectedEntity === entity.id && entity.enabled && (
                  <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedEntity === 'myinvestor' && (
          <div className="border border-dashed border-primary/40 rounded-lg p-6 text-center space-y-3 bg-primary/5">
            <Upload className="h-8 w-8 text-primary mx-auto" />
            <div>
              <p className="text-sm font-medium">Sube tu fichero de movimientos MyInvestor</p>
              <p className="text-xs text-muted-foreground mt-1">Importación incremental: los movimientos duplicados serán ignorados automáticamente</p>
            </div>
            <Button onClick={() => fileRef.current?.click()} disabled={loading} className="gap-2">
              {loading ? 'Procesando…' : 'Seleccionar Archivo'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
        )}

        {selectedEntity === 'openbank' && (
          <div className="border border-dashed border-chart-2/40 rounded-lg p-6 text-center space-y-3 bg-chart-2/5">
            <Upload className="h-8 w-8 text-chart-2 mx-auto" />
            <div>
              <p className="text-sm font-medium">Sube tu fichero de estado actual Openbank</p>
              <p className="text-xs text-muted-foreground mt-1">Snapshot: actualiza valores de mercado y crea fondos nuevos si no existen</p>
            </div>
            <Button onClick={() => fileRef.current?.click()} disabled={loading} className="gap-2">
              {loading ? 'Procesando…' : 'Seleccionar Archivo'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
        )}

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {summary ? 'Resumen de Importación - MyInvestor' : 'Resumen de Importación - Openbank'}
              </DialogTitle>
            </DialogHeader>
            {openbankSummary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-chart-2/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold font-mono text-chart-2">{openbankSummary.newFundsCount}</p>
                    <p className="text-xs text-muted-foreground">Fondos Nuevos</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold font-mono text-primary">{openbankSummary.updatedFundsCount}</p>
                    <p className="text-xs text-muted-foreground">Fondos Actualizados</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Invertido</p>
                    <p className="text-lg font-mono font-medium">{fmt(openbankSummary.totalInvested)}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Valor Actual</p>
                    <p className="text-lg font-mono font-medium">{fmt(openbankSummary.totalCurrentValue)}</p>
                  </div>
                </div>
                <div className={`rounded-lg p-3 text-center ${openbankSummary.totalProfitLoss >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
                  <p className="text-xs text-muted-foreground mb-1">Rentabilidad Total</p>
                  <p className={`text-2xl font-mono font-bold ${openbankSummary.totalProfitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {openbankSummary.totalProfitLoss >= 0 ? '+' : ''}{fmt(openbankSummary.totalProfitLoss)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Fondos en el archivo</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fondo</TableHead>
                        <TableHead className="text-xs">ISIN</TableHead>
                        <TableHead className="text-right text-xs">Valor</TableHead>
                        <TableHead className="text-right text-xs">P/L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openbankSummary.funds.map(f => (
                        <TableRow key={f.isin}>
                          <TableCell className="text-xs font-medium">{f.name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{f.isin}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(f.currentValue)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-medium ${f.profitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {f.profitLoss >= 0 ? '+' : ''}{fmt(f.profitLoss)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-start gap-2 bg-chart-2/5 border border-chart-2/20 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Los valores actuales de mercado reemplazarán los existentes. Los ISINs se usarán para clasificación automática en X-Ray.
                  </p>
                </div>
              </div>
            )}
            {summary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold font-mono text-primary">{summary.newMovementsCount}</p>
                    <p className="text-xs text-muted-foreground">Nuevos movimientos</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold font-mono text-muted-foreground">{summary.duplicatesSkipped}</p>
                    <p className="text-xs text-muted-foreground">Duplicados ignorados</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold font-mono text-primary">{summary.countAportaciones}</p>
                    <p className="text-xs text-muted-foreground">Aportaciones</p>
                    <p className="text-sm font-mono font-medium mt-1">{fmt(summary.totalAportaciones)}</p>
                  </div>
                  <div className="bg-loss/10 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold font-mono text-loss">{summary.countComisiones}</p>
                    <p className="text-xs text-muted-foreground">Comisiones</p>
                    <p className="text-sm font-mono font-medium mt-1">-{fmt(summary.totalComisiones)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Fondos detectados (con ISIN)</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fondo</TableHead>
                        <TableHead className="text-xs">ISIN</TableHead>
                        <TableHead className="text-right text-xs">Invertido</TableHead>
                        <TableHead className="text-right text-xs">Peso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.fundBreakdown.map(f => (
                        <TableRow key={f.name}>
                          <TableCell className="text-xs font-medium">{f.name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{f.isin || '—'}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(f.totalInvested)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium">{f.weight.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Se añadirán <strong>{summary.newMovementsCount} nuevos movimientos</strong> al historial existente.
                    Los pesos y ISINs se enviarán al X-Ray para el análisis de exposición.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
              <Button onClick={handleConfirm} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Confirmar e Importar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
