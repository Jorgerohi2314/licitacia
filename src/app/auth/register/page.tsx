'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Region {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface RegistrationData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  regions: string[];
  provinces: string[];
  categories: string[];
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [provincesByRegion, setProvincesByRegion] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [formData, setFormData] = useState<RegistrationData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    regions: [],
    provinces: [],
    categories: [],
  });

  // Cargar opciones de registro
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await fetch('/api/auth/register');
        if (response.ok) {
          const data = await response.json();
          setRegions(data.regions || []);
          setProvincesByRegion(data.provincesByRegion || {});
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Error loading registration options:', error);
      }
    };
    loadOptions();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleRegion = (regionName: string) => {
    setFormData(prev => {
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
    setFormData(prev => ({
      ...prev,
      provinces: prev.provinces.includes(province)
        ? prev.provinces.filter(p => p !== province)
        : [...prev.provinces, province]
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) return 'El nombre es obligatorio';
        if (!formData.email.trim()) return 'El email es obligatorio';
        if (!formData.email.includes('@')) return 'Email inválido';
        if (!formData.password) return 'La contraseña es obligatoria';
        if (formData.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
        if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden';
        return '';
      case 2:
        if (formData.regions.length === 0) return 'Selecciona al menos una comunidad autónoma';
        return '';
      case 3:
        // Las provincias son opcionales
        return '';
      case 4:
        if (formData.categories.length === 0) return 'Selecciona al menos una categoría de interés';
        return '';
      default:
        return '';
    }
  };

  const handleNext = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrevious = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          regions: formData.regions,
          provinces: formData.provinces,
          categories: formData.categories,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la cuenta');
      }

      // Redirigir al login con mensaje de éxito
      router.push('/auth/signin?registered=true');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const getProvincesForSelectedRegions = () => {
    return formData.regions.flatMap(region => provincesByRegion[region] || []);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Tu nombre"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="tu@email.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mínimo 6 caracteres"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Repite la contraseña"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona las comunidades autónomas donde te interesa encontrar licitaciones
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {regions.map((region) => (
                <div key={region.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={region.id}
                    checked={formData.regions.includes(region.name)}
                    onCheckedChange={() => toggleRegion(region.name)}
                  />
                  <Label htmlFor={region.id} className="cursor-pointer text-sm">
                    {region.name}
                  </Label>
                </div>
              ))}
            </div>
            {formData.regions.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Seleccionadas:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.regions.map(region => (
                    <Badge key={region} variant="secondary" className="cursor-pointer" onClick={() => toggleRegion(region)}>
                      {region} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        const availableProvinces = getProvincesForSelectedRegions();
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona provincias específicas (opcional). Si no seleccionas ninguna, se mostrarán licitaciones de toda la comunidad autónoma.
            </p>
            <Accordion type="multiple" className="w-full">
              {formData.regions.map((region) => {
                const provinces = provincesByRegion[region] || [];
                if (provinces.length === 0) return null;
                
                return (
                  <AccordionItem key={region} value={region}>
                    <AccordionTrigger className="text-sm">
                      {region} ({formData.provinces.filter(p => provinces.includes(p)).length}/{provinces.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-2 pl-4">
                        {provinces.map((province) => (
                          <div key={province} className="flex items-center space-x-2">
                            <Checkbox
                              id={`province-${province}`}
                              checked={formData.provinces.includes(province)}
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
            {formData.provinces.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Provincias seleccionadas:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.provinces.map(province => (
                    <Badge key={province} variant="secondary" className="cursor-pointer" onClick={() => toggleProvince(province)}>
                      {province} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona las categorías de licitaciones que te interesan
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.categories.includes(category.id)
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
                    checked={formData.categories.includes(category.id)}
                    onCheckedChange={() => {}}
                  />
                </div>
              ))}
            </div>
            {formData.categories.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Categorías seleccionadas:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.categories.map(catId => {
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
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">Resumen de tu perfil</h3>
            
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Información personal</p>
                <p className="font-medium">{formData.name}</p>
                <p className="text-sm text-muted-foreground">{formData.email}</p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Comunidades autónomas</p>
                <div className="flex flex-wrap gap-2">
                  {formData.regions.map(region => (
                    <Badge key={region} variant="secondary">{region}</Badge>
                  ))}
                </div>
              </div>

              {formData.provinces.length > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Provincias seleccionadas</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.provinces.map(province => (
                      <Badge key={province} variant="outline">{province}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Categorías de interés</p>
                <div className="flex flex-wrap gap-2">
                  {formData.categories.map(catId => {
                    const cat = categories.find(c => c.id === catId);
                    return (
                      <Badge key={catId} variant="secondary">
                        {cat?.icon} {cat?.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Podrás modificar estas preferencias en cualquier momento desde tu perfil.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    'Datos personales',
    'Comunidades autónomas',
    'Provincias (opcional)',
    'Categorías de interés',
    'Resumen'
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Crear cuenta</CardTitle>
          <CardDescription className="text-center">
            Paso {step} de 5: {stepTitles[step - 1]}
          </CardDescription>
          <Progress value={(step / 5) * 100} className="mt-2" />
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {renderStep()}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 1 || isLoading}
            >
              Anterior
            </Button>
            
            {step < 5 ? (
              <Button onClick={handleNext} disabled={isLoading}>
                Siguiente
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            ¿Ya tienes cuenta?{' '}
            <a href="/auth/signin" className="text-primary hover:underline">
              Inicia sesión
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
