import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().optional(),
  regions: z.array(z.string()).optional().nullable(),
  provinces: z.array(z.string()).optional().nullable(),
  categories: z.array(z.string()).optional().nullable(),
  sectors: z.array(z.string()).optional().nullable(),
  minBudget: z.number().optional(),
  maxBudget: z.number().optional(),
  companySize: z.enum(['micro', 'small', 'medium']).default('small'),
  keywords: z.array(z.string()).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user with preferences
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        // Nuevos campos de preferencias
        preferredRegions: validatedData.regions && validatedData.regions.length > 0 
          ? JSON.stringify(validatedData.regions) 
          : null,
        preferredProvinces: validatedData.provinces && validatedData.provinces.length > 0 
          ? JSON.stringify(validatedData.provinces) 
          : null,
        preferredCategories: validatedData.categories && validatedData.categories.length > 0 
          ? JSON.stringify(validatedData.categories) 
          : null,
        // Legacy fields (mantener compatibilidad)
        profileSectors: JSON.stringify(validatedData.sectors || validatedData.categories || []),
        profileRegions: JSON.stringify(validatedData.regions || []),
        profileMinBudget: validatedData.minBudget || null,
        profileMaxBudget: validatedData.maxBudget || null,
        profileCompanySize: validatedData.companySize,
        profileKeywords: JSON.stringify(validatedData.keywords || []),
      },
      select: {
        id: true,
        name: true,
        email: true,
        preferredRegions: true,
        preferredProvinces: true,
        preferredCategories: true,
        createdAt: true,
      }
    });

    // Create subscription record
    await db.subscription.create({
      data: {
        userId: user.id,
        status: 'active',
        plan: 'free',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: 'free',
        preferences: {
          regions: validatedData.regions || [],
          provinces: validatedData.provinces || [],
          categories: validatedData.categories || [],
        },
        createdAt: user.createdAt,
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Endpoint to get available options for the registration form
    
    // Comunidades Autónomas
    const regions = [
      { id: 'andalucia', name: 'Andalucía' },
      { id: 'aragon', name: 'Aragón' },
      { id: 'asturias', name: 'Principado de Asturias' },
      { id: 'baleares', name: 'Illes Balears' },
      { id: 'canarias', name: 'Canarias' },
      { id: 'cantabria', name: 'Cantabria' },
      { id: 'castilla-mancha', name: 'Castilla-La Mancha' },
      { id: 'castilla-leon', name: 'Castilla y León' },
      { id: 'cataluna', name: 'Cataluña' },
      { id: 'valencia', name: 'Comunidad Valenciana' },
      { id: 'extremadura', name: 'Extremadura' },
      { id: 'galicia', name: 'Galicia' },
      { id: 'madrid', name: 'Comunidad de Madrid' },
      { id: 'murcia', name: 'Región de Murcia' },
      { id: 'navarra', name: 'Comunidad Foral de Navarra' },
      { id: 'pais-vasco', name: 'País Vasco' },
      { id: 'rioja', name: 'La Rioja' },
      { id: 'ceuta', name: 'Ciudad Autónoma de Ceuta' },
      { id: 'melilla', name: 'Ciudad Autónoma de Melilla' }
    ];

    // Provincias por comunidad autónoma
    const provincesByRegion: Record<string, string[]> = {
      'Andalucía': ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
      'Aragón': ['Huesca', 'Teruel', 'Zaragoza'],
      'Principado de Asturias': ['Asturias'],
      'Illes Balears': ['Illes Balears'],
      'Canarias': ['Las Palmas', 'Santa Cruz de Tenerife'],
      'Cantabria': ['Cantabria'],
      'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
      'Castilla y León': ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
      'Cataluña': ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
      'Comunidad Valenciana': ['Alicante', 'Castellón', 'Valencia'],
      'Extremadura': ['Badajoz', 'Cáceres'],
      'Galicia': ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
      'Comunidad de Madrid': ['Madrid'],
      'Región de Murcia': ['Murcia'],
      'Comunidad Foral de Navarra': ['Navarra'],
      'País Vasco': ['Álava', 'Gipuzkoa', 'Bizkaia'],
      'La Rioja': ['La Rioja'],
      'Ciudad Autónoma de Ceuta': ['Ceuta'],
      'Ciudad Autónoma de Melilla': ['Melilla']
    };

    // Categorías de interés
    const categories = [
      { id: 'construccion', name: 'Construcción', icon: '🏗️' },
      { id: 'tecnologia', name: 'Tecnología e IT', icon: '💻' },
      { id: 'consultoria', name: 'Consultoría', icon: '📊' },
      { id: 'suministros-medicos', name: 'Suministros Médicos', icon: '🏥' },
      { id: 'servicios-generales', name: 'Servicios Generales', icon: '🛠️' },
      { id: 'energia-medio-ambiente', name: 'Energía y Medio Ambiente', icon: '🌱' },
      { id: 'educacion', name: 'Educación', icon: '📚' },
      { id: 'transporte-logistica', name: 'Transporte y Logística', icon: '🚛' },
      { id: 'servicios-financieros', name: 'Servicios Financieros', icon: '💰' },
      { id: 'servicios-juridicos', name: 'Servicios Jurídicos', icon: '⚖️' },
      { id: 'marketing-publicidad', name: 'Marketing y Publicidad', icon: '📢' },
      { id: 'recursos-humanos', name: 'Recursos Humanos', icon: '👥' },
      { id: 'seguridad', name: 'Seguridad', icon: '🔒' },
      { id: 'turismo-hosteleria', name: 'Turismo y Hostelería', icon: '🏨' },
      { id: 'agricultura-ganaderia', name: 'Agricultura y Ganadería', icon: '🌾' },
      { id: 'industria', name: 'Industria', icon: '🏭' },
      { id: 'comercio', name: 'Comercio', icon: '🏪' },
      { id: 'telecomunicaciones', name: 'Telecomunicaciones', icon: '📡' }
    ];

    // Legacy sectors (for backward compatibility)
    const sectors = categories.map(c => c.name);

    return NextResponse.json({
      regions,
      provincesByRegion,
      categories,
      sectors
    });

  } catch (error) {
    console.error('Error fetching registration options:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}