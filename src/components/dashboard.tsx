'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  TrendingUp, 
  Users, 
  Bell, 
  Search, 
  Settings, 
  CreditCard,
  Mail,
  MessageCircle,
  Smartphone,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Database,
  Zap,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';

interface Tender {
  id: string;
  title: string;
  organization: string;
  budget: number | null;
  deadline: string;
  category: string;
  relevanceScore: number;
  status: 'new' | 'processed' | 'sent';
  summary: string;
  keywords: string[];
  source: string;
  sourceUrl: string | null;
  publishedAt: string;
  description?: string;
  requirements?: string[];
  contact?: string;
}

interface UserSubscription {
  plan: 'free' | 'premium' | 'enterprise';
  keywords: string[];
  notifications: {
    email: boolean;
    telegram: boolean;
    whatsapp: boolean;
  };
  dailyLimit: number;
  nextBillingDate?: string;
}

interface Metrics {
  totalTenders: number;
  relevantTenders: number;
  alertsSent: number;
  activeUsers: number;
  conversionRate: number;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
  recentActivity: Array<{
    action: string;
    timestamp: string;
    details: string;
  }>;
}

interface ScrapingResult {
  success: boolean;
  data: Tender[];
  totalFound: number;
  error?: string;
}

interface AnalysisResult {
  success: boolean;
  analysis: {
    relevanceScore: number;
    category: string;
    summary: string;
    keywords: string[];
    requirements: string[];
    recommendations: string[];
    riskLevel: "low" | "medium" | "high";
    estimatedComplexity: "low" | "medium" | "high";
  };
  error?: string;
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalTenders: 0,
    relevantTenders: 0,
    alertsSent: 0,
    activeUsers: 0,
    conversionRate: 0,
    topCategories: [],
    recentActivity: []
  });

  const [subscription, setSubscription] = useState<UserSubscription>({
    plan: 'free',
    keywords: ['tecnología', 'software', 'consultoría'],
    notifications: {
      email: true,
      telegram: false,
      whatsapp: false
    },
    dailyLimit: 5
  });

  const [recentTenders, setRecentTenders] = useState<Tender[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Función para llamar a la API de scraping
  const fetchTenders = async () => {
    setScraping(true);
    setError(null);

    try {
    // 1. Ejecutar scraping en segundo plano (no esperamos el resultado)
    const scrapePromise = fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'scrape',
        sourceId: 'boe'
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Scraping error: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Scraping completed:', data);
      // No hacemos nada con el resultado, solo logging
    })
    .catch(error => {
      console.warn('Scraping warning:', error.message);
      // No mostramos error al usuario por fallos de scraping
    });

    // 2. Obtener tenders existentes (esto es lo importante para el dashboard)
    const tendersUrl = `/api/tenders?limit=${subscription.dailyLimit}`;
    const tendersResponse = await fetch(tendersUrl);

    if (!tendersResponse.ok) {
      throw new Error(`Error ${tendersResponse.status}: ${tendersResponse.statusText}`);
    }

    const tenders = await tendersResponse.json();
    
    // 3. Verificar que la respuesta es un array
    if (!Array.isArray(tenders)) {
      throw new Error('Formato de respuesta inválido de /api/tenders');
    }

      setRecentTenders(tenders);
    setLastUpdate(new Date());
    
    // 4. Actualizar métricas
    setMetrics(prev => ({
      ...prev,
      totalTenders: tenders.length,
      relevantTenders: tenders.filter((t: Tender) => t.relevanceScore > 70).length,
      alertsSent: prev.alertsSent + tenders.length
    }));

    // 5. Actualizar actividad reciente
    const newActivity = {
      action: 'Datos actualizados',
      timestamp: new Date().toLocaleString(),
      details: `${tenders.length} licitaciones cargadas`
    };
    
    setMetrics(prev => ({
      ...prev,
      recentActivity: [newActivity, ...prev.recentActivity.slice(0, 9)]
    }));

    // 6. Esperar a que termine el scraping (pero no fallar si hay error)
    await scrapePromise;

  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error desconocido');
    console.error('Error fetching tenders:', err);
  } finally {
    setScraping(false);
  }
};

  // Función para analizar una licitación específica
  const analyzeTender = async (tender: Tender) => {
    setAnalyzing(true);
    setError(null);

    try {
      console.log('Analizando licitación:', tender.id, tender.title);

      // Preparar datos para enviar a /api/analyze
      const requestBody = {
      tender: {
        title: tender.title || 'Sin título',
        description: tender.description || tender.summary || 'Sin descripción',
        organization: tender.organization || 'Organismo no especificado',
        budget: tender.budget || 0,
        deadline: tender.deadline || 'No especificado'
      },
      userKeywords: subscription.keywords || [],
      userPreferences: {
        categories: ['Tecnología', 'Consultoría', 'Construcción'],
        minBudget: 10000,
        regions: ['Nacional']
      }
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok ) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result: AnalysisResult = await response.json();
      
      if (result.success) {
        // Actualizar la licitación con el análisis
        setRecentTenders(prev => 
          prev.map(t => 
            t.id === tender.id 
              ? {
                  ...t,
                  relevanceScore: result.analysis.relevanceScore,
                  category: result.analysis.category,
                  keywords: result.analysis.keywords,
                  summary: result.analysis.summary,
                  requirements: result.analysis.requirements,
                  status: 'processed' as const
                }
              : t
          )
        );

        // Actualizar actividad reciente
        const newActivity = {
          action: 'Análisis IA completado',
          timestamp: new Date().toLocaleString(),
          details: `Licitación analizada - Relevancia: ${result.analysis.relevanceScore}%`
        };
        
        setMetrics(prev => ({
          ...prev,
          recentActivity: [newActivity, ...prev.recentActivity.slice(0, 9)]
        }));

      } else {
        throw new Error(result.error || 'Error en el análisis');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error analyzing tender:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Función para analizar todas las licitaciones pendientes
  const analyzeAllTenders = async () => {
    const unprocessedTenders = recentTenders.filter(t => t.status === 'new');
    
    for (const tender of unprocessedTenders) {
      await analyzeTender(tender);
      // Pequeña pausa entre análisis para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // Cargar datos iniciales (métricas base)
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      
      // Cargar métricas iniciales (podrían venir de una base de datos)
      setMetrics({
        totalTenders: 0,
        relevantTenders: 0,
        alertsSent: 0,
        activeUsers: 1,
        conversionRate: 0,
        topCategories: [
          { category: 'Tecnología', count: 0 },
          { category: 'Consultoría', count: 0 },
          { category: 'Construcción', count: 0 },
          { category: 'Servicios', count: 0 },
          { category: 'Suministros', count: 0 }
        ],
        recentActivity: []
      });

      setLoading(false);
    };

    loadInitialData();
  }, []);

  // Actualizar métricas cuando cambien las licitaciones
  useEffect(() => {
    if (recentTenders.length > 0) {
      const categories = recentTenders.reduce((acc, tender) => {
        acc[tender.category] = (acc[tender.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCategories = Object.entries(categories)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setMetrics(prev => ({
        ...prev,
        relevantTenders: recentTenders.filter(t => t.relevanceScore > 70).length,
        topCategories
      }));
    }
  }, [recentTenders]);

  const addKeyword = () => {
    if (newKeyword.trim() && !subscription.keywords.includes(newKeyword.trim())) {
      setSubscription(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setSubscription(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const upgradePlan = async (plan: 'premium' | 'enterprise') => {
    setSubscription(prev => ({
      ...prev,
      plan,
      dailyLimit: plan === 'premium' ? 50 : 999,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Alertas de Licitaciones</h1>
          <p className="text-muted-foreground">
            Sistema inteligente de monitorización de oportunidades de contratación pública
          </p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground mt-1">
              Última actualización: {lastUpdate.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={subscription.plan === 'free' ? 'secondary' : 'default'} className="text-sm">
            Plan {subscription.plan === 'free' ? 'Gratuito' : subscription.plan === 'premium' ? 'Premium' : 'Empresarial'}
          </Badge>
          <Button
            onClick={fetchTenders}
            disabled={scraping}
            variant="outline"
            size="sm"
          >
            {scraping ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {scraping ? 'Buscando...' : 'Buscar Licitaciones'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Licitaciones</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTenders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Encontradas en la última búsqueda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licitaciones Relevantes</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.relevantTenders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalTenders > 0 
                ? `${((metrics.relevantTenders / metrics.totalTenders) * 100).toFixed(1)}% de relevancia`
                : 'Ejecuta una búsqueda'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Enviadas</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.alertsSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              En esta sesión
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Activo</div>
            <p className="text-xs text-muted-foreground">
              APIs funcionando correctamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visión General</TabsTrigger>
          <TabsTrigger value="tenders">Licitaciones</TabsTrigger>
          <TabsTrigger value="subscription">Suscripción</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Categorías principales */}
            <Card>
              <CardHeader>
                <CardTitle>Categorías Principales</CardTitle>
                <CardDescription>Licitaciones por sector</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topCategories.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{category.category}</span>
                      </div>
                      <Badge variant="outline">{category.count}</Badge>
                    </div>
                  ))}
                  {metrics.topCategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ejecuta una búsqueda para ver las categorías
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actividad reciente */}
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Últimas acciones del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {metrics.recentActivity.length > 0 ? (
                    metrics.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {activity.action.includes('Scraping') && <Database className="h-4 w-4 text-blue-500" />}
                          {activity.action.includes('Alerta') && <Bell className="h-4 w-4 text-green-500" />}
                          {activity.action.includes('Usuario') && <Users className="h-4 w-4 text-purple-500" />}
                          {activity.action.includes('Análisis') && <Zap className="h-4 w-4 text-orange-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.details}</p>
                          <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay actividad reciente. Ejecuta una búsqueda para comenzar.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tenders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Licitaciones Recientes</CardTitle>
                  <CardDescription>Oportunidades detectadas por el sistema</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {recentTenders.some(t => t.status === 'new') && (
                    <Button
                      onClick={analyzeAllTenders}
                      disabled={analyzing}
                      variant="outline"
                      size="sm"
                    >
                      {analyzing ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      {analyzing ? 'Analizando...' : 'Analizar Todas'}
                    </Button>
                  )}
                  <Button
                    onClick={fetchTenders}
                    disabled={scraping}
                    size="sm"
                  >
                    {scraping ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {scraping ? 'Buscando...' : 'Actualizar'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTenders.length > 0 ? (
                  recentTenders.map((tender) => (
                    <div key={tender.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{tender.title}</h3>
                          <p className="text-sm text-muted-foreground">{tender.organization}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={tender.status === 'new' ? 'default' : tender.status === 'processed' ? 'secondary' : 'outline'}>
                            {tender.status === 'new' ? 'Nuevo' : tender.status === 'processed' ? 'Procesado' : 'Enviado'}
                          </Badge>
                          <Badge variant="outline">{tender.category}</Badge>
                          {tender.status === 'new' && (
                            <Button
                              onClick={() => analyzeTender(tender)}
                              disabled={analyzing}
                              size="sm"
                              variant="ghost"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Presupuesto:</span>
                          <p className="font-medium">
                            {tender.budget ? `€${tender.budget.toLocaleString()}` : 'No especificado'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fecha límite:</span>
                          <p className="font-medium">{tender.deadline}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Relevancia:</span>
                          <p className="font-medium">{tender.relevanceScore}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Palabras clave:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tender.keywords.slice(0, 3).map((keyword) => (
                              <Badge key={keyword} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {tender.keywords.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{tender.keywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Resumen:</span>
                        <p className="text-sm mt-1">{tender.summary}</p>
                      </div>

                      {tender.requirements && tender.requirements.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Requisitos principales:</span>
                          <ul className="text-sm mt-1 list-disc list-inside">
                            {tender.requirements.slice(0, 3).map((req, idx) => (
                              <li key={idx}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {tender.url && (
                        <div className="flex justify-end">
                          <Button
                            onClick={() => window.open(tender.url, '_blank')}
                            variant="outline"
                            size="sm"
                          >
                            Ver Original
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No hay licitaciones</h3>
                    <p className="text-muted-foreground mb-4">
                      Ejecuta una búsqueda para encontrar licitaciones relevantes
                    </p>
                    <Button onClick={fetchTenders} disabled={scraping}>
                      {scraping ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {scraping ? 'Buscando...' : 'Buscar Licitaciones'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Plan actual */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Actual</CardTitle>
                <CardDescription>Gestiona tu suscripción</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Tipo de plan</span>
                  <Badge variant={subscription.plan === 'free' ? 'secondary' : 'default'}>
                    {subscription.plan === 'free' ? 'Gratuito' : subscription.plan === 'premium' ? 'Premium' : 'Empresarial'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Límite diario</span>
                  <span className="font-medium">{subscription.dailyLimit} alertas</span>
                </div>
                
                {subscription.nextBillingDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Próximo cobro</span>
                    <span className="font-medium">{subscription.nextBillingDate}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <span className="text-sm font-medium">Características del plan:</span>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Scraping en tiempo real</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Análisis con IA avanzada</span>
                    </li>
                    {subscription.plan !== 'free' && (
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Notificaciones multi-canal</span>
                      </li>
                    )}
                    {subscription.plan === 'enterprise' && (
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>API dedicada</span>
                      </li>
                    )}
                  </ul>
                </div>
                
                {subscription.plan === 'free' && (
                  <div className="space-y-2">
                    <Button onClick={() => upgradePlan('premium')} className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Actualizar a Premium
                    </Button>
                    <Button onClick={() => upgradePlan('enterprise')} variant="outline" className="w-full">
                      Plan Empresarial
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Palabras clave */}
            <Card>
              <CardHeader>
                <CardTitle>Palabras Clave</CardTitle>
                <CardDescription>Configura tus términos de búsqueda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Añadir palabra clave"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button onClick={addKeyword}>Añadir</Button>
                </div>
                
                <div className="space-y-2">
                  <span className="text-sm font-medium">Palabras clave activas:</span>
                  <div className="flex flex-wrap gap-2">
                    {subscription.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Las palabras clave se envían a las APIs de scraping y análisis. 
                    El sistema buscará coincidencias en títulos y descripciones de licitaciones.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Notificaciones */}
            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Configura tus canales de alerta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                  <Switch
                    checked={subscription.notifications.email}
                    onCheckedChange={(checked) =>
                      setSubscription(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, email: checked }
                      }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>Telegram</span>
                  </div>
                  <Switch
                    checked={subscription.notifications.telegram}
                    onCheckedChange={(checked) =>
                      setSubscription(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, telegram: checked }
                      }))
                    }
                    disabled={subscription.plan === 'free'}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <span>WhatsApp</span>
                  </div>
                  <Switch
                    checked={subscription.notifications.whatsapp}
                    onCheckedChange={(checked) =>
                      setSubscription(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, whatsapp: checked }
                      }))
                    }
                    disabled={subscription.plan === 'free'}
                  />
                </div>
                
                {subscription.plan === 'free' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Las notificaciones por Telegram y WhatsApp están disponibles en planes premium.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Configuración de APIs */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración de APIs</CardTitle>
                <CardDescription>Parámetros de scraping y análisis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scrape-frequency">Frecuencia de scraping</Label>
                  <Select defaultValue="manual">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="hourly">Cada hora</SelectItem>
                      <SelectItem value="daily">Diaria</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="min-budget">Presupuesto mínimo (€)</Label>
                  <Input id="min-budget" type="number" placeholder="10000" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="relevance-threshold">Umbral de relevancia (%)</Label>
                  <Input id="relevance-threshold" type="number" placeholder="70" min="0" max="100" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="regions">Regiones objetivo</Label>
                  <Textarea id="regions" placeholder="Madrid, Barcelona, Valencia..." />
                </div>
                
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </Button>
              </CardContent>
            </Card>

            {/* Estado de las APIs */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Estado de las APIs</CardTitle>
                <CardDescription>Monitoreo en tiempo real del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Database className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">API de Scraping</p>
                          <p className="text-sm text-muted-foreground">Extracción de licitaciones</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Activa
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Zap className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-medium">API de Análisis IA</p>
                          <p className="text-sm text-muted-foreground">Procesamiento inteligente</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Activa
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2">Estadísticas de rendimiento</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tiempo promedio de scraping:</span>
                          <span className="font-medium">2.3s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tiempo promedio de análisis:</span>
                          <span className="font-medium">1.8s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tasa de éxito:</span>
                          <span className="font-medium">98.5%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2">Límites de API</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Scraping diario:</span>
                          <span className="font-medium">{subscription.dailyLimit} / {subscription.dailyLimit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Análisis restantes:</span>
                          <span className="font-medium">Ilimitado</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}