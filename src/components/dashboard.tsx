'use client';

import { useState, useEffect } from 'react';
import { useTestUserData } from '@/hooks/useTestingMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Eye,
  Sparkles,
  Shield,
  Layers,
  Filter,
  Info,
  ArrowUpDown,
  Calendar,
  CalendarClock
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
  // AI Analysis fields
  aiCategory?: string;
  aiSectorTags?: string[];
  aiSummary?: string;
  aiKeywords?: string[];
  aiRecommendations?: string[];
  aiAnalyzedAt?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  complexity?: 'low' | 'medium' | 'high';
  region?: string;
  province?: string;
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

 export function Dashboard() {
  const { isTestUser, user, regions, sectors, keywords, budgetRange, plan } = useTestUserData();
  
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
    plan: isTestUser ? ((plan as 'free' | 'premium' | 'enterprise') || 'free') : 'free',
    keywords: isTestUser ? (keywords || ['tecnología', 'software', 'consultoría']) : ['tecnología', 'software', 'consultoría'],
    notifications: {
      email: true,
      telegram: false,
      whatsapp: false
    },
    dailyLimit: isTestUser ? 50 : 5
  });

  const [recentTenders, setRecentTenders] = useState<Tender[]>([]);
  const [allTenders, setAllTenders] = useState<Tender[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewAllTenders, setViewAllTenders] = useState(false);
  
  // Filtros
  const [filterMinRelevance, setFilterMinRelevance] = useState<number>(0);
  
  // Ordenación
  const [sortBy, setSortBy] = useState<'publishedAt' | 'deadline'>('publishedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchTenders = async () => {
    setScraping(true);
    setError(null);

    try {
      // Trigger scraping en background
      fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scrape', sourceId: 'madrid' })
      }).catch(err => console.warn('Scraping warning:', err.message));

      // Trigger análisis en batch de tenders nuevos
      fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-batch', limit: 3 })
      }).catch(err => console.warn('Analysis warning:', err.message));

        // Obtener tenders con filtros - admin puede ver todas
      const params = new URLSearchParams({
        limit: '50',
        q: subscription.keywords.join(' '),
        ...(filterMinRelevance > 0 && { minRelevance: filterMinRelevance.toString() }),
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      const tendersUrl = `/api/tenders?${params.toString()}`;
      const tendersResponse = await fetch(tendersUrl);

      if (!tendersResponse.ok) {
        throw new Error(`Error ${tendersResponse.status}: ${tendersResponse.statusText}`);
      }

      const tenders = await tendersResponse.json();
      
      if (!Array.isArray(tenders)) {
        throw new Error('Formato de respuesta inválido de /api/tenders');
      }

      setRecentTenders(tenders);
      setLastUpdate(new Date());
      
      setMetrics(prev => ({
        ...prev,
        totalTenders: tenders.length,
        relevantTenders: tenders.filter((t: Tender) => t.relevanceScore > 70).length,
        alertsSent: prev.alertsSent + tenders.length
      }));

      const newActivity = {
        action: 'Datos actualizados',
        timestamp: new Date().toLocaleString(),
        details: `${tenders.length} licitaciones cargadas`
      };
      
      setMetrics(prev => ({
        ...prev,
        recentActivity: [newActivity, ...prev.recentActivity.slice(0, 9)]
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching tenders:', err);
    } finally {
      setScraping(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
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

  useEffect(() => {
    if (recentTenders.length > 0) {
      const categories = recentTenders.reduce((acc, tender) => {
        const cat = tender.aiCategory || tender.category;
        acc[cat] = (acc[cat] || 0) + 1;
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

  const fetchAllTenders = async () => {
    setScraping(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '10000', // Un límite muy alto para obtener todas
        ...(filterMinRelevance > 0 && { minRelevance: filterMinRelevance.toString() }),
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      const tendersUrl = `/api/tenders?${params.toString()}`;
      const tendersResponse = await fetch(tendersUrl);

      if (!tendersResponse.ok) {
        throw new Error(`Error ${tendersResponse.status}: ${tendersResponse.statusText}`);
      }

      const tenders = await tendersResponse.json();
      
      if (!Array.isArray(tenders)) {
        throw new Error('Formato de respuesta inválido de /api/tenders');
      }

      setAllTenders(tenders);
      setLastUpdate(new Date());
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching all tenders:', err);
    } finally {
      setScraping(false);
    }
  };

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

  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel) return null;
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-red-100 text-red-800 border-red-300'
    };
    const labels = { low: 'Bajo', medium: 'Medio', high: 'Alto' };
    return (
      <Badge variant="outline" className={colors[riskLevel as keyof typeof colors]}>
        <Shield className="h-3 w-3 mr-1" />
        Riesgo: {labels[riskLevel as keyof typeof labels]}
      </Badge>
    );
  };

  const getComplexityBadge = (complexity?: string) => {
    if (!complexity) return null;
    const colors = {
      low: 'bg-blue-100 text-blue-800 border-blue-300',
      medium: 'bg-orange-100 text-orange-800 border-orange-300',
      high: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    const labels = { low: 'Baja', medium: 'Media', high: 'Alta' };
    return (
      <Badge variant="outline" className={colors[complexity as keyof typeof colors]}>
        <Layers className="h-3 w-3 mr-1" />
        Complejidad: {labels[complexity as keyof typeof labels]}
      </Badge>
    );
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filtrar y ordenar licitaciones
  const filteredTenders = recentTenders
    .filter(t => {
      if (t.relevanceScore < filterMinRelevance) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(sortBy === 'publishedAt' ? a.publishedAt : a.deadline).getTime();
      const dateB = new Date(sortBy === 'publishedAt' ? b.publishedAt : b.deadline).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard de Oportunidades</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Sistema inteligente de monitorización de licitaciones para PYMES
          </p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground mt-1">
              Última actualización: {lastUpdate.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Badge variant={subscription.plan === 'free' ? 'secondary' : 'default'} className="text-sm">
            Plan {subscription.plan === 'free' ? 'Gratuito' : subscription.plan === 'premium' ? 'Premium' : 'Empresarial'}
          </Badge>
          <Button onClick={fetchTenders} disabled={scraping} size="sm" className="w-full md:w-auto">
            {scraping ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
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

      {/* Indicador de modo testing */}
      {isTestUser && (
        <Alert className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-orange-500 rounded-full animate-pulse"></div>
              <AlertDescription className="text-orange-800 font-medium">
                🚀 MODO TESTING ACTIVADO - Usuario: {user?.email}
              </AlertDescription>
            </div>
            <div className="text-sm text-orange-600">
              Regiones: {regions.join(', ')}
            </div>
          </div>
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
            <p className="text-xs text-muted-foreground">Encontradas en la última búsqueda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades Destacadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.relevantTenders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalTenders > 0 
                ? `${((metrics.relevantTenders / metrics.totalTenders) * 100).toFixed(1)}% relevancia alta`
                : 'Ejecuta una búsqueda'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Análisis IA</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {recentTenders.filter(t => t.aiAnalyzedAt).length}
            </div>
            <p className="text-xs text-muted-foreground">Licitaciones analizadas con IA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Activo</div>
            <p className="text-xs text-muted-foreground">APIs funcionando correctamente</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="tenders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenders">
            <Search className="h-4 w-4 mr-2" />
            Licitaciones
          </TabsTrigger>
          {isTestUser && (
            <TabsTrigger value="all-tenders">
              <Database className="h-4 w-4 mr-2" />
              Todas las Licitaciones
            </TabsTrigger>
          )}
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Visión General
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            Suscripción
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenders" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros y Ordenación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Relevancia mínima con info */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Relevancia mínima: {filterMinRelevance}%</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            ¿Qué es la relevancia?
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            La relevancia es una puntuación (0-100%) que indica qué tan bien se ajusta 
                            una licitación a tus preferencias de perfil:
                          </p>
                          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                            <li><span className="text-green-600 font-medium">70-100%:</span> Muy relevante - Coincide perfectamente</li>
                            <li><span className="text-yellow-600 font-medium">40-69%:</span> Relevante - Buena coincidencia</li>
                            <li><span className="text-red-600 font-medium">0-39%:</span> Poca relevancia - Coincidencia baja</li>
                          </ul>
                          <p className="text-sm text-muted-foreground mt-2">
                            Ajusta el filtro para ver solo licitaciones con una puntuación mínima.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filterMinRelevance}
                    onChange={(e) => setFilterMinRelevance(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                {/* Ordenar por */}
                <div className="flex-1 min-w-[200px]">
                  <Label className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Ordenar por
                  </Label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'publishedAt' | 'deadline')}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publishedAt">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Fecha de publicación
                        </div>
                      </SelectItem>
                      <SelectItem value="deadline">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4" />
                          Fecha límite
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Orden ascendente/descendente */}
                <div className="flex-1 min-w-[200px]">
                  <Label>Orden</Label>
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4 rotate-180" />
                          Más recientes primero
                        </div>
                      </SelectItem>
                      <SelectItem value="asc">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4" />
                          Más antiguas primero
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilterMinRelevance(0);
                    setSortBy('publishedAt');
                    setSortOrder('desc');
                  }}
                  className="self-end"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de licitaciones */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <CardTitle>Oportunidades Detectadas</CardTitle>
                  <CardDescription>
                    {filteredTenders.length} licitaciones encontradas
                  </CardDescription>
                </div>
                <Button onClick={fetchTenders} disabled={scraping} size="sm" className="w-full sm:w-auto">
                  {scraping ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  {scraping ? 'Buscando...' : 'Actualizar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTenders.length > 0 ? (
                  filteredTenders.map((tender) => (
                    <div key={tender.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{tender.title}</h3>
                          <p className="text-sm text-muted-foreground">{tender.organization}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {getRiskBadge(tender.riskLevel)}
                          {getComplexityBadge(tender.complexity)}
                          <Badge variant={tender.aiAnalyzedAt ? 'default' : 'secondary'}>
                            {tender.aiAnalyzedAt ? (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                Analizado con IA
                              </>
                            ) : 'Por analizar'}
                          </Badge>
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
                           <span className="text-muted-foreground">Publicación:</span>
                           <p className="font-medium">{new Date(tender.publishedAt).toLocaleDateString('es-ES')}</p>
                         </div>
                         <div>
                           <span className="text-muted-foreground">Relevancia IA:</span>
                           <p className={`font-bold ${getRelevanceColor(tender.relevanceScore)}`}>
                             {tender.relevanceScore}%
                           </p>
                         </div>
                       </div>
                       
                      {/* Tags de sector IA */}
                      {tender.aiSectorTags && tender.aiSectorTags.length > 0 && (
                        <div>
                          <span className="text-muted-foreground text-sm">Sectores detectados:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tender.aiSectorTags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-blue-50 border-blue-200">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                       
                      <div>
                        <span className="text-muted-foreground text-sm">
                          {tender.aiSummary ? 'Resumen IA:' : 'Resumen:'}
                        </span>
                        <p className="text-sm mt-1">{tender.aiSummary || tender.summary}</p>
                      </div>

                      {/* Recomendaciones IA */}
                      {tender.aiRecommendations && tender.aiRecommendations.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <span className="text-sm font-medium text-blue-900 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Recomendaciones de IA:
                          </span>
                          <ul className="text-sm mt-2 space-y-1 text-blue-800">
                            {tender.aiRecommendations.slice(0, 3).map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {tender.sourceUrl && (
                        <div className="flex justify-end">
                          <Button onClick={() => tender.sourceUrl && window.open(tender.sourceUrl, '_blank')} variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
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
                      {filterMinRelevance > 0
                        ? 'No hay licitaciones que coincidan con los filtros'
                        : 'Ejecuta una búsqueda para encontrar licitaciones relevantes'
                      }
                    </p>
                    <Button onClick={fetchTenders} disabled={scraping}>
                      {scraping ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                      {scraping ? 'Buscando...' : 'Buscar Licitaciones'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isTestUser && (
          <TabsContent value="all-tenders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle>Todas las Licitaciones en la Base de Datos</CardTitle>
                    <CardDescription>
                      Vista completa de todas las licitaciones scrapeadas
                    </CardDescription>
                  </div>
                  <Button onClick={fetchAllTenders} disabled={scraping} size="sm" className="w-full sm:w-auto">
                    {scraping ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                    {scraping ? 'Cargando...' : 'Cargar Todas'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allTenders.length > 0 ? (
                    allTenders.map((tender) => (
                      <div key={tender.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{tender.title}</h3>
                            <p className="text-sm text-muted-foreground">{tender.organization}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {getRiskBadge(tender.riskLevel)}
                            {getComplexityBadge(tender.complexity)}
                            <Badge variant={tender.aiAnalyzedAt ? 'default' : 'secondary'}>
                              {tender.aiAnalyzedAt ? (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Analizado con IA
                                </>
                              ) : 'Por analizar'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
                            <span className="text-muted-foreground">Relevancia IA:</span>
                            <p className={`font-bold ${getRelevanceColor(tender.relevanceScore)}`}>
                              {tender.relevanceScore}%
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Categoría:</span>
                            <p className="font-medium">{tender.aiCategory || tender.category}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Comunidad:</span>
                            <p className="font-medium">{tender.region || 'Nacional'}</p>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground text-sm">
                            {tender.aiSummary ? 'Resumen IA:' : 'Resumen:'}
                          </span>
                          <p className="text-sm mt-1">{tender.aiSummary || tender.summary}</p>
                        </div>

                        {tender.sourceUrl && (
                          <div className="flex justify-end">
                            <Button onClick={() => tender.sourceUrl && window.open(tender.sourceUrl, '_blank')} variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
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
                        Ejecuta scraping para cargar licitaciones en la base de datos
                      </p>
                      <Button onClick={fetchAllTenders} disabled={scraping}>
                        {scraping ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                        {scraping ? 'Cargando...' : 'Cargar Todas'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Categorías Principales</CardTitle>
                <CardDescription>Licitaciones por sector (IA)</CardDescription>
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
                    <p className="text-sm text-muted-foreground">Ejecuta una búsqueda para ver las categorías</p>
                  )}
                </div>
              </CardContent>
            </Card>

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
                          {activity.action.includes('Datos') && <Database className="h-4 w-4 text-blue-500" />}
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
                    <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuración de APIs</CardTitle>
                <CardDescription>Parámetros de scraping y análisis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="min-budget">Presupuesto mínimo (€)</Label>
                  <Input id="min-budget" type="number" placeholder="10000" />
                </div>
                 
                <div className="space-y-2">
                  <Label htmlFor="relevance-threshold">Umbral de relevancia (%)</Label>
                  <Input id="relevance-threshold" type="number" placeholder="70" min="0" max="100" />
                </div>
                 
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
