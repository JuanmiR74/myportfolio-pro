import { useState, useMemo } from 'react';
import { 
  BarChart3, 
  BookOpen, 
  Bot, 
  Settings, 
  ScanSearch, 
  Filter, 
  Loader2, 
  Library 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useIsinLibrary } from '@/hooks/useIsinLibrary';
import { useRoboConstituents } from '@/hooks/useRoboConstituents';
import { Header } from '@/components/Header';
import SummaryCards from '@/components/portfolio/SummaryCards';
import AllocationChart from '@/components/portfolio/AllocationChart';
import HistoryChart from '@/components/portfolio/HistoryChart';
import FundsTable from '@/components/portfolio/FundsTable';
import RoboAdvisors from '@/components/portfolio/RoboAdvisors';
import RoboImporter from '@/components/portfolio/RoboImporter';
import SettingsPanel from '@/components/portfolio/SettingsPanel';
import XRayDashboard from '@/components/portfolio/XRayDashboard';
import IsinLibraryView from '@/components/portfolio/IsinLibraryView';

type EntityFilter = 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors';

export default function Index() {
  // 1. DECLARACIÓN DE TODOS LOS HOOKS (Obligatorio al inicio del componente)
  const p = usePortfolio();
  const isinLib = useIsinLibrary();
  const roboConsts = useRoboConstituents();
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');

  // Lógica de combinación de librería ISIN (Memorizada)
  // Se mantiene arriba para que el Hook 'useMemo' se registre siempre en el mismo orden
  const mergedIsinLibrary = useMemo(() => {
    // Si todavía está cargando, devolvemos un array vacío para evitar errores de acceso
    if (p.loading) return [];

    const map = new Map<string, any>();
    
    if (isinLib.entries) {
      isinLib.entries.forEach(e => map.set(e.isin, e));
    }

    if (p.isinLibrary) {
      p.isinLibrary.forEach(e => {
        const existing = map.get(e.isin);
        if (!existing || e.geography?.length || e.sectors?.length || e.assetClassPro?.length) {
          map.set(e.isin, e);
        }
      });
    }
    
    return Array.from(map.values());
  }, [isinLib.entries, p.isinLibrary, p.loading]);

  // 2. COMPROBACIÓN DE CARGA (Después de declarar todos los Hooks)
  // Esto protege a los componentes hijos de recibir datos 'undefined'
  if (p.loading) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Cargando tu cartera...</p>
      </div>
    );
  }

  // 3. RENDERIZADO PRINCIPAL
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      
      <div className="border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">
              Portfolio<span className="text-primary">Pro</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={entityFilter} onValueChange={v => setEntityFilter(v as EntityFilter)}>
                <SelectTrigger className="w-40 h-8 text-xs border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cartera Global</SelectItem>
                  <SelectItem value="MyInvestor">MyInvestor</SelectItem>
                  <SelectItem value="BBK">BBK</SelectItem>
                  <SelectItem value="Robo-Advisors">Robo-Advisors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <main className="container py-6 px-4 space-y-6">
        {/* Resumen de Valores - Datos provenientes de p.summary */}
        <SummaryCards
          totalValue={p.summary.totalValue}
          totalPL={p.summary.totalPL}
          totalPLPercent={p.summary.totalPLPercent}
          dayChange={p.summary.dayChange}
          xirr={p.summary.xirr}
        />

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="bg-card border border-border/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="fondos" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4" /> Fondos
            </TabsTrigger>
            <TabsTrigger value="robos" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bot className="h-4 w-4" /> Robo-Advisors
            </TabsTrigger>
            <TabsTrigger value="xray" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ScanSearch className="h-4 w-4" /> X-Ray
            </TabsTrigger>
            <TabsTrigger value="isin-library" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Library className="h-4 w-4" /> Librería ISIN
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4" /> Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <AllocationChart data={p.distribution} />
              </div>
              <div className="lg:col-span-3">
                <HistoryChart data={p.historicalData} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fondos" className="space-y-4">
            <FundsTable
              assets={p.assets}
              onAdd={p.addAsset}
              onRemove={p.removeAsset}
              onUpdate={p.updateAsset}
              onUpdatePrices={p.updatePrices}
              apiKey={p.apiKey}
              getByIsin={p.getByIsin}
              upsertIsin={p.upsertIsin}
            />
          </TabsContent>

          <TabsContent value="robos" className="space-y-4">
            <RoboImporter />
            <RoboAdvisors
              robos={p.roboAdvisors}
              onAdd={p.addRoboAdvisor}
              onUpdate={p.updateRoboAdvisor}
              onRemove={p.removeRoboAdvisor}
            />
          </TabsContent>

          <TabsContent value="xray" className="space-y-4">
            <XRayDashboard
              entityFilter={entityFilter}
              assets={p.assets}
              roboAdvisors={p.roboAdvisors}
              isinLibrary={mergedIsinLibrary}
              apiKey={p.apiKey}
              onUpdateIsinClassification={isinLib.updateIsinClassification}
            />
          </TabsContent>

          <TabsContent value="isin-library" className="space-y-4">
            <IsinLibraryView
              entries={p.isinLibrary}
              onUpsert={p.upsertIsin}
              onUpdateClassification={p.updateIsinClassification}
              onDelete={p.deleteIsin}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel
              apiKey={p.apiKey}
              cashBalance={p.cashBalance}
              assets={p.assets}
              onSetApiKey={p.setApiKey}
              onSetCash={p.setCashBalance}
              onUpdatePrices={p.updatePrices}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
