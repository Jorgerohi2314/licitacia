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
  Zap
} from 'lucide-react';

interface Tender {
  id: string;
  title: string;
  organization: string;
  budget: number;
  deadline: string;
  category: string;
  relevanceScore: number;
  status: 'new' | 'processed' | 'sent';
  summary: string;
  keywords: string[];
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

  useEffect(() => {
    // Simular carga de datos
    const loadDashboardData = async () => {
      setLoading(true);
      
      // Simular datos de métricas
      setTimeout(() => {
        setMetrics({
          totalTenders: 1247,
          relevantTenders: 342,
          alertsSent: 2847,
          activeUsers: 156,
          conversionRate: 23.5,
          topCategories: [
            { category: 'Tecnología', count: 89 },
            { category: 'Consultoría', count: 67 },
            { category: 'Construcción', count: 45 },
            { category: 'Servicios', count: 38 },
            { category: 'Suministros', count: 29 }
          ],
          recentActivity: [
            { action: 'Nueva licitación', timestamp: '2024-01-15 10:30', details: 'Sistema de gestión documental - 45.000€' },
            { action: 'Alerta enviada', timestamp: '2024-01-15 09:15', details: '5 usuarios notificados' },
            { action: 'Usuario premium', timestamp: '2024-01-15 08:45', details: 'Nueva suscripción empresarial' },
            { action: 'Clasificación IA', timestamp: '2024-01-15 08:30', details: '127 licitaciones procesadas' }
          ]
        });

        // Simular licitaciones recientes
        setRecentTenders([
          {
            id: '1',
            title: 'Desarrollo e implementación de plataforma de gestión documental',
            organization: 'Ministerio de Hacienda',
            budget: 45000,
            deadline: '2024-02-15',
            category: 'Tecnología',
            relevanceScore: 95,
            status: 'new',
            summary: 'Se requiere desarrollo de plataforma para gestión documental con capacidades de IA y machine learning.',
            keywords: ['tecnología', 'software', 'IA', 'documental']
          },
          {
            id: '2',
            title: 'Servicios de consultoría en transformación digital',
            organization: 'Ayuntamiento de Madrid',
            budget: 78000,
            deadline: '2024-02-20',
            category: 'Consultoría',
            relevanceScore: 88,
            status: 'processed',
            summary: 'Consultoría para transformación digital de procesos administrativos.',
            keywords: ['consultoría', 'digital', 'transformación']
          },
          {
            id: '3',
            title: 'Suministro e instalación de equipamiento informático',
            organization: 'Hospital Central',
            budget: 120000,
            deadline: '2024-02-10',
            category: 'Suministros',
            relevanceScore: 76,
            status: 'sent',
            summary: 'Equipamiento informático para actualización de sistemas hospitalarios.',
            keywords: ['hardware', 'suministros', 'equipamiento']
          }
        ]);

        setLoading(false);
      }, 1500);
    };

    loadDashboardData();
  }, []);

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
    // Simular proceso de actualización de plan
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
        </div>
        <Badge variant={subscription.plan === 'free' ? 'secondary' : 'default'} className="text-sm">
          Plan {subscription.plan === 'free' ? 'Gratuito' : subscription.plan === 'premium' ? 'Premium' : 'Empresarial'}
        </Badge>
      </div>

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
              +12% respecto al mes anterior
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
              {((metrics.relevantTenders / metrics.totalTenders) * 100).toFixed(1)}% de relevancia
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
              +8% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Tasa de conversión: {metrics.conversionRate}%
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
                  {metrics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {activity.action.includes('Nueva') && <Database className="h-4 w-4 text-blue-500" />}
                        {activity.action.includes('Alerta') && <Bell className="h-4 w-4 text-green-500" />}
                        {activity.action.includes('Usuario') && <Users className="h-4 w-4 text-purple-500" />}
                        {activity.action.includes('Clasificación') && <Zap className="h-4 w-4 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.details}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tenders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Licitaciones Recientes</CardTitle>
              <CardDescription>Oportunidades detectadas por el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTenders.map((tender) => (
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
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Presupuesto:</span>
                        <p className="font-medium">€{tender.budget.toLocaleString()}</p>
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
                  </div>
                ))}
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
                      <span>Alertas en tiempo real</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Clasificación con IA</span>
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
                    Las palabras clave determinan qué licitaciones son relevantes para ti. 
                    El sistema buscará coincidencias en títulos y descripciones.
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

            {/* Configuración avanzada */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración Avanzada</CardTitle>
                <CardDescription>Opciones personalizadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frecuencia de alertas</Label>
                  <Select defaultValue="immediate">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Inmediata</SelectItem>
                      <SelectItem value="hourly">Cada hora</SelectItem>
                      <SelectItem value="daily">Diaria</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="budget-range">Rango de presupuesto mínimo</Label>
                  <Input id="budget-range" type="number" placeholder="10000" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="regions">Regiones de interés</Label>
                  <Textarea id="regions" placeholder="España, Madrid, Barcelona..." />
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