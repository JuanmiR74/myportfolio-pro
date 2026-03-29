import { useState } from 'react';
import { RefreshCw, Key, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchAllPrices } from '@/lib/alphaVantage';
import { Asset } from '@/types/portfolio';

interface Props {
  apiKey: string;
  cashBalance: number;
  assets: Asset[];
  onSetApiKey: (k: string) => void;
  onSetCash: (v: number) => void;
  onUpdatePrices: (prices: Record<string, number>) => void;
}

export default function SettingsPanel({ apiKey, cashBalance, assets, onSetApiKey, onSetCash, onUpdatePrices }: Props) {
  const [key, setKey] = useState(apiKey);
  const [cash, setCash] = useState(cashBalance.toString());
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!apiKey) { toast.error('Introduce tu API Key primero'); return; }
    const tickers = [...new Set(assets.map(a => a.ticker))];
    if (!tickers.length) { toast.error('No hay activos con ticker'); return; }
    setRefreshing(true);
    toast.info(`Actualizando ${tickers.length} ticker(s)… (Alpha Vantage free: 5 llamadas/min)`);
    try {
      const prices = await fetchAllPrices(tickers, apiKey);
      const updated = Object.keys(prices).length;
      if (updated > 0) {
        onUpdatePrices(prices);
        toast.success(`${updated} precio(s) actualizado(s)`);
      } else {
        toast.warning('No se obtuvieron precios. Verifica tu API Key o los tickers.');
      }
    } catch {
      toast.error('Error al conectar con Alpha Vantage');
    }
    setRefreshing(false);
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Configuración</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label className="flex items-center gap-2"><Key className="h-4 w-4" /> Alpha Vantage API Key</Label>
          <div className="flex gap-2">
            <Input value={key} onChange={e => setKey(e.target.value)} placeholder="Tu API Key" type="password" />
            <Button variant="outline" onClick={() => { onSetApiKey(key); toast.success('API Key guardada'); }}>Guardar</Button>
          </div>
          <p className="text-xs text-muted-foreground">Obtén tu key gratis en <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noreferrer" className="text-primary underline">alphavantage.co</a></p>
        </div>

        <div className="grid gap-2">
          <Label className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Saldo en Efectivo (€)</Label>
          <div className="flex gap-2">
            <Input type="number" value={cash} onChange={e => setCash(e.target.value)} />
            <Button variant="outline" onClick={() => { onSetCash(parseFloat(cash) || 0); toast.success('Saldo actualizado'); }}>Guardar</Button>
          </div>
        </div>

        <Button onClick={handleRefresh} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando…' : 'Refrescar Precios'}
        </Button>
      </CardContent>
    </Card>
  );
}
