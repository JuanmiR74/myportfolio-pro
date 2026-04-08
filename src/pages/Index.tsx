import { useState, useMemo } from 'react';
import { ChartBar as BarChart3, BookOpen, Bot, Settings, ScanSearch, Filter, Loader as Loader2 } from 'lucide-react';
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

type EntityFilter = 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors';

export default function Index() {
  const p = usePortfolio();
  const isinLib = useIsinLibrary();
  const roboConsts = useRoboConstituents();
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');

  const mergedIsinLibrary = useMemo(() => {
    const map = new Map<string, typeof isinLib.entries[0]>();
    isinLib.entries.forEach(e => map.set(e.isin, e));
    p.isinLibrary.forEach(e => {
      const existing = map.get(e.isin);
      if (!existing || e.geography?.length || e.sectors?.length || e.assetClassPro?.length) {
        map.set(e.isin, e as typeof isinLib.entries[0]);
      }
    });
    return Array.from(map.values());
  }, [isinLib.entries, p.isinLibrary]);

  if (p.loading) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <div className="border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Portfolio<span className="text-primary">Pro</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={entityFilter} onValueChange={v => setEntityFilter(v as EntityFilter)}>
                <SelectTrigger className="w-40 h-8 text-xs border-border/50"><SelectValue /></SelectTrigger>
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
        <SummaryCards totalValue={p.summary.totalValue} totalPL={p.summary.totalPL} totalPLPercent={p.summary.totalPLPercent} dayChange={p.summary.dayChange} xirr={p.summary.xirr} />

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
            <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4" /> Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2"><AllocationChart data={p.distribution} /></div>
              <div className="lg:col-span-3"><HistoryChart data={p.historicalData} /></div>
            </div>
          </TabsContent>

          <TabsContent value="fondos" className="space-y-4">
            <FundsTable assets={p.assets} onAdd={p.addAsset} onRemove={p.removeAsset} onUpdate={p.updateAsset} getByIsin={p.getByIsin} upsertIsin={p.upsertIsin} />
          </TabsContent>

          <TabsContent value="robos" className="space-y-4">
            <RoboImporter
              existingMovements={p.roboAdvisors.find(r => r.name === 'MyInvestor - Cartera Metal')?.movements}
              existingAssets={p.assets}
              onConfirmImport={(data) => {
                const existing = p.roboAdvisors.find(r => r.name === data.name);
                if (existing) {
                  p.updateRoboAdvisor(existing.id, {
                    totalValue: data.totalValue,
                    investedValue: data.investedValue,
                    lastUpdated: new Date().toISOString().split('T')[0],
                    allocations: data.allocations as any,
                    sectorAllocations: data.sectorAllocations as any,
                    movements: data.movements,
                  });
                } else {
                  p.addRoboAdvisor({
                    name: data.name,
                    entity: '',
                    totalValue: data.totalValue,
                    investedValue: data.investedValue,
                    lastUpdated: new Date().toISOString().split('T')[0],
                    allocations: data.allocations as any,
                    sectorAllocations: data.sectorAllocations as any,
                    movements: data.movements,
                  });
                }
              }}
              onConfirmOpenbankImport={(updatedAssets) => {
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
              }}
            />
            <RoboAdvisors robos={p.roboAdvisors} onAdd={p.addRoboAdvisor} onUpdate={p.updateRoboAdvisor} onRemove={p.removeRoboAdvisor} />
          </TabsContent>

          <TabsContent value="xray" className="space-y-4">
            <XRayDashboard
              entityFilter={entityFilter}
              assets={p.assets}
              roboAdvisors={p.roboAdvisors}
              isinLibrary={mergedIsinLibrary}
              roboConstituents={roboConsts.constituents}
              onUpdateIsinClassification={isinLib.updateIsinClassification}
              onUpdateRoboSubFunds={p.updateRoboSubFunds}
              getByIsin={p.getByIsin}
              upsertIsin={p.upsertIsin}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel apiKey={p.apiKey} cashBalance={p.cashBalance} assets={p.assets} onSetApiKey={p.setApiKey} onSetCash={p.setCashBalance} onUpdatePrices={p.updatePrices} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
