'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Region {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface UserPreferences {
  regions: string[];
  provinces: string[];
  categories: string[];
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [provincesByRegion, setProvincesByRegion] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [name, setName] = useState('');
  const [preferences, setPreferences] = useState<UserPreferences>({
    regions: [],
    provinces: [],
    categories: [],
  });

  // Cargar datos del usuario y opciones
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    const loadData = async () => {
      try {
        // Cargar opciones
        const optionsResponse = await fetch('/api/auth/register');
        if (optionsResponse.ok) {
          const data = await optionsResponse.json();
          setRegions(data.regions || []);
          setProvincesByRegion(data.provincesByRegion || {});
          setCategories(data.categories || []);
        }

        // Cargar preferencias del usuario
        if (session?.user?.id) {
          const userResponse = await fetch('/api/user/preferences');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setName(userData.name || '');
            setPreferences({
              regions: userData.preferredRegions || [],
              provinces: userData.preferredProvinces || [],
              categories: userData.preferredCategories || [],
            });
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        toast.error('Error al cargar los datos del perfil');
      }
    };

    if (status === 'authenticated') {
      loadData();
    }
  }, [session, status, router]);

  const toggleRegion = (regionName: string) => {
    setPreferences(prev => {
      const newRegions = prev.regions.includes(regionName)
        ? prev.regions.filter(r => r !== regionName)
        : [...prev.regions, regionName];
      
      // Limpiar provincias de regiones deseleccionadas
      const availableProvinces = newRegions.flatMap(r => provincesByRegion[r] || []);
      const newProvinces = prev.provinces.filter(p => availableProvinces.includes(p));
      
      return { ...prev, regions: newRegions, provinces: newProvinces };
    });
  };

  const toggleProvince = (province: string) => {
    setPreferences(prev => ({
      ...prev,
      provinces: prev.provinces.includes(province)
        ? prev.provinces.filter(p => p !== province)
        : [...prev.provinces, province]
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setPreferences(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          preferredRegions: preferences.regions,
          preferredProvinces: preferences.provinces,
          preferredCategories: preferences.categories,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar los cambios');
      }

      toast.success('Perfil actualizado correctamente');
      
      // Actualizar sesión
      await update({
        ...session,
        user: {
          ...session?.user,
          name,
        },
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const getProvincesForSelectedRegions = () => {
    return preferences.regions.flatMap(region => provincesByRegion[region] || []);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Mi Perfil</h1>
        
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Información personal</TabsTrigger>
            <TabsTrigger value="regions">Ubicación</TabsTrigger>
            <TabsTrigger value="categories">Intereses</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Información personal</CardTitle>
                <CardDescription>
                  Actualiza tu información básica
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={session?.user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    El email no se puede cambiar
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions">
            <Card>
              <CardHeader>
                <CardTitle>Ubicación de interés</CardTitle>
                <CardDescription>
                  Selecciona las comunidades autónomas y provincias donde buscas licitaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Comunidades autónomas *</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {regions.map((region) => (
                      <div key={region.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`region-${region.id}`}
                          checked={preferences.regions.includes(region.name)}
                          onCheckedChange={() => toggleRegion(region.name)}
                        />
                        <Label htmlFor={`region-${region.id}`} className="cursor-pointer">
                          {region.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {preferences.regions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Seleccionadas:</p>
                      <div className="flex flex-wrap gap-2">
                        {preferences.regions.map(region => (
                          <Badge key={region} variant="secondary" className="cursor-pointer" onClick={() => toggleRegion(region)}>
                            {region} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {preferences.regions.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Provincias (opcional)</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Selecciona provincias específicas o déjalo vacío para ver todas las licitaciones de la comunidad autónoma
                    </p>
                    <Accordion type="multiple" className="w-full">
                      {preferences.regions.map((region) => {
                        const provinces = provincesByRegion[region] || [];
                        if (provinces.length === 0) return null;
                        
                        return (
                          <AccordionItem key={region} value={region}>
                            <AccordionTrigger className="text-sm">
                              {region} ({preferences.provinces.filter(p => provinces.includes(p)).length}/{provinces.length})
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="grid grid-cols-2 gap-2 pl-4">
                                {provinces.map((province) => (
                                  <div key={province} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`province-${province}`}
                                      checked={preferences.provinces.includes(province)}
                                      onCheckedChange={() => toggleProvince(province)}
                                    />
                                    <Label htmlFor={`province-${province}`} className="cursor-pointer text-sm">
                                      {province}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                    {preferences.provinces.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Provincias seleccionadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {preferences.provinces.map(province => (
                            <Badge key={province} variant="outline" className="cursor-pointer" onClick={() => toggleProvince(province)}>
                              {province} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Categorías de interés</CardTitle>
                <CardDescription>
                  Selecciona las categorías de licitaciones que te interesan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        preferences.categories.includes(category.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleCategory(category.id)}
                    >
                      <span className="text-2xl">{category.icon}</span>
                      <div className="flex-1">
                        <Label className="cursor-pointer font-medium">
                          {category.name}
                        </Label>
                      </div>
                      <Checkbox
                        checked={preferences.categories.includes(category.id)}
                        onCheckedChange={() => {}}
                      />
                    </div>
                  ))}
                </div>
                {preferences.categories.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-2">Categorías seleccionadas:</p>
                    <div className="flex flex-wrap gap-2">
                      {preferences.categories.map(catId => {
                        const cat = categories.find(c => c.id === catId);
                        return (
                          <Badge key={catId} variant="secondary" className="cursor-pointer" onClick={() => toggleCategory(catId)}>
                            {cat?.icon} {cat?.name} ×
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            size="lg"
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
