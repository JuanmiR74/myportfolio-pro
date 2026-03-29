import { BarChart3, Briefcase, Bot, Settings, Building2, ScanSearch } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortfolio } from '@/hooks/usePortfolio';
import SummaryCards from '@/components/portfolio/SummaryCards';
import AllocationChart from '@/components/portfolio/AllocationChart';
import HistoryChart from '@/components/portfolio/HistoryChart';
import AssetTable from '@/components/portfolio/AssetTable';
import RoboAdvisors from '@/components/portfolio/RoboAdvisors';
import SettingsPanel from '@/components/portfolio/SettingsPanel';
import XRayDashboard from '@/components/portfolio/XRayDashboard';
import FundClassificationEditor from '@/components/portfolio/FundClassificationEditor';

export default function Index() {
  const p = usePortfolio();

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Portfolio<span className="text-primary">Pro</span></h1>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">Gestión de Cartera Personal</span>
        </div>
      </header>

      <main className="container py-6 px-4 space-y-6">
        <SummaryCards totalValue={p.summary.totalValue} totalPL={p.summary.totalPL} totalPLPercent={p.summary.totalPLPercent} dayChange={p.summary.dayChange} xirr={p.summary.xirr} />

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="bg-card border border-border/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="xray" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ScanSearch className="h-4 w-4" /> X-Ray
            </TabsTrigger>
            <TabsTrigger value="myinvestor" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Briefcase className="h-4 w-4" /> MyInvestor
            </TabsTrigger>
            <TabsTrigger value="bbk" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="h-4 w-4" /> BBK
            </TabsTrigger>
            <TabsTrigger value="robos" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bot className="h-4 w-4" /> Robo-Advisors
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4" /> Config
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

          <TabsContent value="xray" className="space-y-4">
            <XRayDashboard getXrayByEntity={p.getXrayByEntity} />
            <FundClassificationEditor assets={p.assets} onUpdateClassification={p.updateAssetClassification} />
          </TabsContent>

          <TabsContent value="myinvestor">
            <AssetTable assets={p.assets.filter(a => a.type === 'Fondos MyInvestor')} onAdd={p.addAsset} onRemove={p.removeAsset} />
          </TabsContent>

          <TabsContent value="bbk">
            <AssetTable assets={p.assets.filter(a => a.type === 'Fondos BBK')} onAdd={p.addAsset} onRemove={p.removeAsset} />
          </TabsContent>

          <TabsContent value="robos">
            <RoboAdvisors robos={p.roboAdvisors} onAdd={p.addRoboAdvisor} onUpdate={p.updateRoboAdvisor} onRemove={p.removeRoboAdvisor} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel apiKey={p.apiKey} cashBalance={p.cashBalance} assets={p.assets} onSetApiKey={p.setApiKey} onSetCash={p.setCashBalance} onUpdatePrices={p.updatePrices} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
