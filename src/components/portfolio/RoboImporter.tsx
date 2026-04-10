import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, CircleCheck as CheckCircle2, CircleAlert as AlertCircle,
  Building2, Clock, ArrowRight, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseMyInvestorXLSX, toRoboMovements, ImportSummary } from '@/lib/myInvestorParser';
import { parseOpenbankSnapshot, applyOpenbankSnapshot, OpenbankImportSummary } from '@/lib/openbankParser';
import { RoboSubFund } from '@/types/portfolio';
import { usePortfolio } from '@/hooks/usePortfolio';
import { toast } from 'sonner';

type ImportEntity = 'myinvestor' | 'openbank' | 'other';
const NEW_ROBO = '__new__';



function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function RoboImporter() {
  const p = usePortfolio();
  const fileRef = useRef<HTMLInputElement>(null);
const [editableISINs, setEditableISINs] = useState<Map<string, string>>(new Map());
  const [selectedEntity, setSelectedEntity] = useState<ImportEntity | null>(null);
  const [selectedRoboId, setSelectedRoboId] = useState<string>('');
  const [newRoboName, setNewRoboName] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [openbankSummary, setOpenbankSummary] = useState<OpenbankImportSummary | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const entities = [
    { id: 'myinvestor' as ImportEntity, name: 'MyInvestor', enabled: true, description: 'Carteras Indexadas' },
    { id: 'openbank' as ImportEntity, name: 'Openbank', enabled: true, description: 'Estado Actual' },
    { id: 'other' as ImportEntity, name: 'Otros', enabled: false, description: 'Próximamente' },
  ];

  const isReadyToUpload =
    selectedEntity === 'openbank' ||
    (selectedEntity === 'myinvestor' && (
      (selectedRoboId && selectedRoboId !== NEW_ROBO) ||
      (selectedRoboId === NEW_ROBO && newRoboName.trim().length > 0)
    ));
const validateISINs = (): boolean => {
  const allFunds = summary?.fundBreakdown || [];
  const missingISIN = allFunds.find(f => !f.isin || !f.isin.trim());
  if (missingISIN) {
    const editedISIN = editableISINs.get(missingISIN.name)?.trim();
    if (!editedISIN) {
      toast.error(`Fondo "${missingISIN.name}" necesita un ISIN asignado`);
      return false;
    }
  }
  return true;
};
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
        const existingMovements = selectedRoboId !== NEW_ROBO
          ? p.roboAdvisors.find(r => r.id === selectedRoboId)?.movements
          : undefined;
        const result = parseMyInvestorXLSX(rows, existingMovements);
        setSummary(result);
        setOpenbankSummary(null);
      } else if (selectedEntity === 'openbank') {
        const result = parseOpenbankSnapshot(rows, p.assets);
        setOpenbankSummary(result);
        setSummary(null);
      }
      setPreviewOpen(true);
    } catch (err) {
      toast.error('Error al procesar el archivo: ' + (err instanceof Error ? err.message : 'formato no reconocido'));
    }
    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };
const handleConfirmMyInvestor = () => {
    if (!summary) return;
    
    // 1. Validar ISINs
    if (!validateISINs()) return;

    const totalFundValue = summary.fundBreakdown.reduce((s, f) => s + f.totalInvested, 0);
    const newMovements = toRoboMovements(summary.movements);
    const existingMovements = selectedRoboId !== NEW_ROBO
      ? p.roboAdvisors.find(r => r.id === selectedRoboId)?.movements ?? []
      : [];
    const allMovements = [...existingMovements, ...newMovements];

    const subFunds: RoboSubFund[] = summary.fundBreakdown
      .filter(f => f.totalInvested > 0)
      .map(f => {
        const isin = editableISINs.get(f.name)?.trim() || f.isin;
        return {
          id: crypto.randomUUID(),
          isin: isin || '',
          name: f.name,
          weightPct: f.weight,
        };
      })
      .filter(f => f.isin);

    const today = new Date().toISOString().split('T')[0];
    const roboData = {
      totalValue: totalFundValue + summary.currentCash,
      investedValue: summary.investedValue,
      lastUpdated: today,
      movements: allMovements,
      subFunds,
    };

    if (selectedRoboId === NEW_ROBO) {
      p.addRoboAdvisor({
        name: newRoboName.trim(),
        entity: 'MyInvestor',
        ...roboData,
      });
    } else {
      p.updateRoboAdvisor(selectedRoboId, roboData);
    }

    subFunds.forEach(sf => {
      if (!sf.isin) return;
      const existing = p.getByIsin(sf.isin);
      p.upsertIsin({
        isin: sf.isin,
        name: sf.name,
        assetType: existing?.assetType ?? 'Fondos MyInvestor',
        geography: existing?.geography ?? [],
        sectors: existing?.sectors ?? [],
        assetClassPro: existing?.assetClassPro ?? [],
      });
    });

    setPreviewOpen(false);
    setSummary(null);
    setEditableISINs(new Map());
    setSelectedEntity(null);
    setSelectedRoboId('');
    setNewRoboName('');
    toast.success(`Importación completada`);
  };

  const handleConfirmOpenbank = () => {
    if (!openbankSummary) return;
    const updatedAssets = applyOpenbankSnapshot(openbankSummary, p.assets);
    updatedAssets.forEach(asset => {
      const existing = p.assets.find(a => a.ticker === asset.ticker);
      if (existing) {
        p.updateAsset(existing.id, {
          shares: asset.shares,
          currentPrice: asset.currentPrice,
          buyPrice: asset.buyPrice,
          classification: asset.classification,
        });
      } else {
        p.addAsset(asset);
      }
    });

    openbankSummary.funds.forEach(f => {
      if (!f.isin) return;
      const existing = p.getByIsin(f.isin);
      p.upsertIsin({
        isin: f.isin,
        name: f.name,
        assetType: existing?.assetType ?? 'Fondos Openbank',
        geography: existing?.geography ?? [],
        sectors: existing?.sectors ?? [],
        assetClassPro: existing?.assetClassPro ?? [],
      });
    });
    setPreviewOpen(false);
    setOpenbankSummary(null);
    setSelectedEntity(null);
    toast.success(`Openbank importado`);
  };

  const handleCancel = () => {
    setPreviewOpen(false);
    setSummary(null);
    setOpenbankSummary(null);
  };

  const roboName = selectedRoboId === NEW_ROBO
    ? newRoboName.trim() || 'Nuevo Robo-Advisor'
    : p.roboAdvisors.find(r => r.id === selectedRoboId)?.name ?? '';

  // AQUÍ TERMINA LA LÓGICA Y EMPIEZA EL RENDER

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Importar desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Entity selector */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">¿De qué entidad es el fichero?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {entities.map(entity => (
              <button
                key={entity.id}
                disabled={!entity.enabled}
                onClick={() => { setSelectedEntity(entity.id); setSelectedRoboId(''); setNewRoboName(''); }}
                className={`relative p-4 rounded-lg border text-left transition-all ${
                  !entity.enabled
                    ? 'opacity-50 cursor-not-allowed border-border/30 bg-card/30'
                    : selectedEntity === entity.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card/80 cursor-pointer'
                }`}
                data-testid={`button-entity-${entity.id}`}
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

        {/* Step 2a: MyInvestor — robo-advisor mapping */}
        {selectedEntity === 'myinvestor' && (
          <div className="border border-dashed border-primary/40 rounded-lg p-5 space-y-4 bg-primary/5">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">¿A qué Robo-Advisor pertenecen estos datos?</Label>
              <Select value={selectedRoboId} onValueChange={setSelectedRoboId}>
                <SelectTrigger className="bg-background" data-testid="select-robo-target">
                  <SelectValue placeholder="Selecciona un Robo-Advisor…" />
                </SelectTrigger>
                <SelectContent>
                  {p.roboAdvisors.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {r.movements?.length ? ` (${r.movements.length} movs.)` : ''}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_ROBO}>
                    ✚ Crear nuevo Robo-Advisor
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRoboId === NEW_ROBO && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nombre del nuevo Robo-Advisor</Label>
                <Input
                  value={newRoboName}
                  onChange={e => setNewRoboName(e.target.value)}
                  placeholder="Ej: MyInvestor - Cartera Metal"
                  className="bg-background"
                  data-testid="input-new-robo-name"
                />
              </div>
            )}

            <div className="text-center space-y-2 pt-1">
              <p className="text-xs text-muted-foreground">
                Sube el fichero de movimientos MyInvestor — los duplicados se ignorarán automáticamente
              </p>
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={loading || !isReadyToUpload}
                className="gap-2"
                data-testid="button-upload-myinvestor"
              >
                {loading ? 'Procesando…' : 'Seleccionar Archivo'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
        )}

        {/* Step 2b: Openbank upload */}
        {selectedEntity === 'openbank' && (
          <div className="border border-dashed border-chart-2/40 rounded-lg p-6 text-center space-y-3 bg-chart-2/5">
            <Upload className="h-8 w-8 text-chart-2 mx-auto" />
            <div>
              <p className="text-sm font-medium">Sube tu fichero de estado actual Openbank</p>
              <p className="text-xs text-muted-foreground mt-1">Snapshot: actualiza valores de mercado y crea fondos nuevos si no existen</p>
            </div>
            <Button onClick={() => fileRef.current?.click()} disabled={loading} className="gap-2" data-testid="button-upload-openbank">
              {loading ? 'Procesando…' : 'Seleccionar Archivo'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={open => !open && handleCancel()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {summary
                  ? `Vista Previa — MyInvestor → ${roboName}`
                  : 'Resumen de Importación — Openbank'}
              </DialogTitle>
            </DialogHeader>

            {/* ─── MyInvestor preview ─── */}
            {summary && (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Nuevos movs." value={summary.newMovementsCount.toString()} accent="primary" />
                  <Stat label="Duplicados ignorados" value={summary.duplicatesSkipped.toString()} />
                  <Stat label="Total aportado" value={fmt(summary.investedValue)} accent="primary" />
                  <Stat label="Comisiones" value={fmt(summary.totalComisiones)} accent="loss" />
                </div>

                {/* Fund breakdown table */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    Composición resultante del Robo-Advisor
                    <span className="text-xs text-muted-foreground ml-2">(se guardará como desglose de fondos)</span>
                  </p>
                  <div className="rounded-md border border-border/50 overflow-hidden">

<Table>
  <TableHeader>
    <TableRow className="bg-muted/30">
      <TableHead className="text-xs">Fondo</TableHead>
      <TableHead className="text-xs w-40">ISIN (editable)</TableHead>
      <TableHead className="text-right text-xs w-28">Invertido</TableHead>
      <TableHead className="text-right text-xs w-20">Peso</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {summary.fundBreakdown.map(f => (
      <TableRow key={f.name}>
        <TableCell className="text-xs font-medium py-2">{f.name}</TableCell>
       <TableCell className="text-xs py-2">
  {f.isin && f.isin.trim() ? (
    <span className="font-mono text-muted-foreground">{f.isin}</span>
  ) : (
    <Input
      value={editableISINs.get(f.name) || ''}
      onChange={(e) => {
        const newISINs = new Map(editableISINs);
        newISINs.set(f.name, e.target.value.toUpperCase());
        setEditableISINs(newISINs);
      }}
      placeholder="Introduce ISIN..."
      className="h-7 text-xs font-mono"
      data-testid={`input-isin-${f.name}`}
    />
  )}
</TableCell>
        <TableCell className="text-right font-mono text-xs py-2">{fmt(f.totalInvested)}</TableCell>
        <TableCell className={`text-right font-mono text-xs font-semibold py-2 ${f.weight >= 20 ? 'text-primary' : ''}`}>
          {f.weight.toFixed(1)}%
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
                    </Table>
                  </div>
                </div>

                {/* ISIN library note */}
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <strong>{summary.fundBreakdown.filter(f => f.isin).length} ISINs</strong> se añadirán automáticamente a la Librería Global.
                    Al confirmar, el desglose de fondos se guardará en el Robo-Advisor y el X-Ray lo usará para el análisis.
                  </p>
                </div>
              </div>
            )}

            {/* ─── Openbank preview ─── */}
            {openbankSummary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Fondos Nuevos" value={openbankSummary.newFundsCount.toString()} accent="primary" />
                  <Stat label="Fondos Actualizados" value={openbankSummary.updatedFundsCount.toString()} accent="primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Invertido" value={fmt(openbankSummary.totalInvested)} />
                  <Stat label="Valor Actual" value={fmt(openbankSummary.totalCurrentValue)} />
                </div>
                <div className={`rounded-lg p-3 text-center ${openbankSummary.totalProfitLoss >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
                  <p className="text-xs text-muted-foreground mb-1">Rentabilidad Total</p>
                  <p className={`text-2xl font-mono font-bold ${openbankSummary.totalProfitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {openbankSummary.totalProfitLoss >= 0 ? '+' : ''}{fmt(openbankSummary.totalProfitLoss)}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Fondo</TableHead>
                        <TableHead className="text-xs w-32">ISIN</TableHead>
                        <TableHead className="text-right text-xs w-28">Valor</TableHead>
                        <TableHead className="text-right text-xs w-24">P/L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openbankSummary.funds.map(f => (
                        <TableRow key={f.isin}>
                          <TableCell className="text-xs font-medium py-2">{f.name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground py-2">{f.isin}</TableCell>
                          <TableCell className="text-right font-mono text-xs py-2">{fmt(f.currentValue)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-medium py-2 ${f.profitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
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
                    Los valores actuales reemplazarán los existentes.
                    <strong> {openbankSummary.funds.filter(f => f.isin).length} ISINs</strong> se añadirán a la Librería Global.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
              <Button
                onClick={summary ? handleConfirmMyInvestor : handleConfirmOpenbank}
                className="gap-1.5"
                data-testid="button-confirm-import"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirmar e Importar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'primary' | 'loss' }) {
  return (
    <div className={`rounded-lg p-3 text-center ${accent === 'primary' ? 'bg-primary/10' : accent === 'loss' ? 'bg-loss/10' : 'bg-secondary/50'}`}>
      <p className={`text-xl font-bold font-mono ${accent === 'primary' ? 'text-primary' : accent === 'loss' ? 'text-loss' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
