'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScrapingSource {
  id: string;
  name: string;
  active: boolean;
  lastScraped: string | null;
  totalTenders: number;
}

interface ScrapeResult {
  sourceId?: string;
  scrapedAt?: string;
  totalFound?: number;
  newTenders?: number;
  updatedTenders?: number;
  errors?: string[];
  status?: string;
  results?: any[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sources, setSources] = useState<ScrapingSource[]>([]);
  const [zipUrl, setZipUrl] = useState('');
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAdminTesting, setIsAdminTesting] = useState(false);

  useEffect(() => {
    // Verificar si hay bypass de admin en cookies
    const checkAdminTesting = async () => {
      try {
        const response = await fetch('/api/auth/check-testing');
        if (response.ok) {
          const data = await response.json();
          if (data.isAdminTesting) {
            setIsAdminTesting(true);
            console.log('[AdminPage] Admin testing mode detected');
          }
        }
      } catch (error) {
        console.error('[AdminPage] Error checking testing mode:', error);
      }
    };

    checkAdminTesting();
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated' && !isAdminTesting) {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/admin'));
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN' && !isAdminTesting) {
      router.push('/dashboard');
    }
  }, [status, session, router, isAdminTesting]);

  useEffect(() => {
    if (session) {
      fetchSources();
    }
  }, [session]);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/scrape?action=sources');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setSources(data);
      } else {
        console.error('API did not return an array for sources:', data);
        setSources([]);
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
      setSources([]);
    }
  };

  const handleScrape = async (sourceId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scrape', sourceId })
      });
      const result = await res.json();
      setScrapeResult(result);
    } catch (error) {
      setScrapeResult({ status: 'error', errors: [(error as Error).message] });
    }
    setLoading(false);
  };

  const handleInitialScrape = async () => {
    if (!zipUrl) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initial-scrape', zipUrl })
      });
      const result = await res.json();
      setScrapeResult(result);
    } catch (error) {
      setScrapeResult({ status: 'error', errors: [(error as Error).message] });
    }
    setLoading(false);
  };

  const handleDailyScrape = async () => {
    // This would trigger the daily scrape manually
    // For now, scrape all active sources
    setLoading(true);
    const results: any[] = [];
    for (const source of sources.filter(s => s.active)) {
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'scrape', sourceId: source.id })
        });
        const result = await res.json();
        results.push(result);
      } catch (error) {
        results.push({ sourceId: source.id, status: 'error', errors: [(error as Error).message] });
      }
    }
    setScrapeResult({ status: 'batch', results });
    setLoading(false);
  };

  if (status === 'loading' && !isAdminTesting) return <div>Loading...</div>;
  if (!session && !isAdminTesting) return null;

  return (
    <div className="container mx-auto p-6">
      {isAdminTesting && (
        <div className="mb-6 p-4 bg-orange-500 text-white rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">🔧 MODO TESTING ADMIN ACTIVO</h2>
              <p className="text-sm opacity-90">Acceso directo sin autenticación (solo desarrollo)</p>
            </div>
            <div className="text-sm bg-white/20 px-3 py-1 rounded">
              Expira en: 2 horas
            </div>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Scraping Inicial (ZIP)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm mb-2">Archivos ZIP disponibles:</p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZipUrl('https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1044/PlataformasAgregadasSinMenores_2026.zip')}
                  >
                    PlataformasAgregadasSinMenores_2026.zip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZipUrl('https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1143/contratosMenoresPerfilesContratantes_2025.zip')}
                  >
                    contratosMenoresPerfilesContratantes_2025.zip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZipUrl('https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1143/contratosMenoresPerfilesContratantes_2026.zip')}
                  >
                    contratosMenoresPerfilesContratantes_2026.zip
                  </Button>
                </div>
              </div>
              <Input
                placeholder="URL del archivo ZIP"
                value={zipUrl}
                onChange={(e) => setZipUrl(e.target.value)}
                className="mb-4"
              />
              <Button onClick={handleInitialScrape} disabled={loading}>
                {loading ? 'Procesando...' : 'Ejecutar Scraping Inicial'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scraping Diario Manual</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDailyScrape} disabled={loading}>
              {loading ? 'Procesando...' : 'Ejecutar Scraping Diario'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Fuentes de Scraping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sources.map(source => (
              <div key={source.id} className="flex items-center justify-between p-4 border rounded">
                <div>
                  <h3 className="font-semibold">{source.name}</h3>
                  <p className="text-sm text-gray-600">
                    Total: {source.totalTenders} | Último: {source.lastScraped ? new Date(source.lastScraped).toLocaleString() : 'Nunca'}
                  </p>
                </div>
                <Button
                  onClick={() => handleScrape(source.id)}
                  disabled={loading || !source.active}
                  variant="outline"
                >
                  Scrape
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {scrapeResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resultado del Scraping</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{JSON.stringify(scrapeResult, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}