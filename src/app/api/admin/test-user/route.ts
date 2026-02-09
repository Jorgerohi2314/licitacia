import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SPANISH_REGIONS } from '@/lib/regions';

export async function POST(request: NextRequest) {
  try {
    // Create a testing user for feedback
    const testUser = await db.user.create({
      data: {
        name: 'Juan Rodríguez Martínez',
        email: 'juan.rodriguez@constructora-sur.com',
        // Note: No password field in User model with NextAuth
        profileSectors: JSON.stringify(['Construcción', 'Obras Públicas', 'Rehabilitación']),
        profileRegions: JSON.stringify(['Andalucía', 'Extremadura']), // Solo regiones del sur
        profileMinBudget: 50000, // Presupuesto mínimo 50k€
        profileMaxBudget: 500000, // Presupuesto máximo 500k€
        profileCompanySize: 'small',
        profileKeywords: JSON.stringify(['construcción', 'obra', 'rehabilitación', 'edificación', 'urbanización']),
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileSectors: true,
        profileRegions: true,
        profileMinBudget: true,
        profileMaxBudget: true,
        profileCompanySize: true,
        profileKeywords: true,
        createdAt: true,
      }
    });

    // Create subscription
    await db.subscription.create({
      data: {
        userId: testUser.id,
        status: 'active',
        plan: 'premium', // Give premium access for testing
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario de testing creado exitosamente',
      user: {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        sectors: JSON.parse(testUser.profileSectors || '[]'),
        regions: JSON.parse(testUser.profileRegions || '[]'),
        minBudget: testUser.profileMinBudget,
        maxBudget: testUser.profileMaxBudget,
        companySize: testUser.profileCompanySize,
        keywords: JSON.parse(testUser.profileKeywords || '[]'),
        plan: 'premium',
      },
      loginInfo: {
        email: testUser.email,
        // Note: Password auth not implemented with current NextAuth setup
        instructions: 'Este usuario usaría NextAuth para autenticación. Para pruebas, puedes crear una sesión manualmente.'
      }
    });

  } catch (error) {
    console.error('Error creating test user:', error);
    
    // Check if user already exists
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'El usuario de testing ya existe' },
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
    // Get sample tender data for testing
    const sampleTenders = await db.tender.findMany({
      take: 10,
      select: {
        id: true,
        title: true,
        organization: true,
        budget: true,
        deadline: true,
        category: true,
        relevanceScore: true,
        aiCategory: true,
        description: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });

    // Analyze regions for demo - remove region field for now
    const categoryStats = await db.tender.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    return NextResponse.json({
      message: 'Información de testing disponible',
      sampleData: {
        tenders: sampleTenders,
        categoryStats,
        availableRegions: SPANISH_REGIONS,
        totalTenders: await db.tender.count(),
      }
    });

  } catch (error) {
    console.error('Error fetching test data:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}