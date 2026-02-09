import { NextRequest, NextResponse } from 'next/server';

// Endpoint simple para configurar testing sin dependencias de base de datos
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Se requiere el email del usuario' },
        { status: 400 }
      );
    }

    // Usuario de testing predefinido
    const testUser = {
      id: 'test-user-123',
      name: 'Jorge Testing',
      email: email,
      phone: '+34 600 123 456',
      company: 'Testing Solutions S.L.',
      sectors: ['Construcción', 'Obras Públicas', 'Rehabilitación'],
      regions: ['Andalucía', 'Extremadura'], // Solo regiones del sur
      minBudget: 50000, // Presupuesto mínimo 50k€
      maxBudget: 500000, // Presupuesto máximo 500k€
      companySize: 'small',
      keywords: ['construcción', 'obra', 'rehabilitación', 'edificación', 'urbanización'],
      plan: 'premium',
      dailyLimit: 50,
    };

    // Generar URL de login
    const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/signin`;

    return NextResponse.json({
      success: true,
      message: 'Acceso configurado para testing',
      user: testUser,
      loginUrl,
      testingInfo: {
        email: testUser.email,
        instructions: `
🚀 ACCESO CONFIGURADO PARA TESTING
=====================================
Email: ${testUser.email}
Empresa: ${testUser.company}
Plan: PREMIUM (50 licitaciones/día)

📍 REGIONS CONFIGURADAS:
${testUser.regions.join(' • ')}

🏗️ SECTORES DE INTERÉS:
${testUser.sectors.join(' • ')}

💰 RANGO DE PRESUPUESTO:
€${testUser.minBudget?.toLocaleString()} - €${testUser.maxBudget?.toLocaleString()}

🔍 KEYWORDS PERSONALIZADAS:
${testUser.keywords.join(', ')}

🚨 BYPASS DISPONIBLE:
Para acceso directo sin autenticación, usa:
curl -X POST http://localhost:3000/api/auth/bypass -H "Content-Type: application/json" -d '{"email":"${testUser.email}"}'

1. Opción A: Ve a: ${loginUrl}
2. Opción B: Usa bypass directo (arriba)
3. Explora el dashboard con filtros regionales
4. Prueba las notificaciones personalizadas

Notas:
- Solo recibirá licitaciones de sus regiones configuradas
- El análisis IA filtrará por relevancia
- Bypass solo disponible en modo desarrollo
- Puede ajustar preferencias en Configuración
        `,
        features: [
          '✅ Filtro regional automático',
          '✅ Análisis IA de licitaciones',
          '✅ Notificaciones personalizadas',
          '✅ 50 licitaciones/día (testing)',
          '✅ Búsqueda por keywords',
          '✅ Filtrado por presupuesto',
          '✅ Dashboard con métricas',
          '✅ Exportación de datos'
        ],
        testScenarios: [
          '🔍 Buscar licitaciones en "Andalucía" - deberían aparecer',
          '🚫 Buscar licitaciones en "País Vasco" - NO deberían aparecer',
          '💰 Filtrar por presupuesto €50,000-€200,000',
          '🏗️ Buscar por keywords: "construcción", "rehabilitación"',
          '📊 Verificar métricas de dashboard',
          '🔔 Probar sistema de notificaciones'
        ]
      }
    });

  } catch (error) {
    console.error('Error configuring test access:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      message: 'Endpoint para configurar acceso de testing',
      usage: {
        method: 'POST',
        url: '/api/admin/setup-test-access',
        body: {
          email: 'usuario@ejemplo.com'
        },
        example: 'curl -X POST http://localhost:3000/api/admin/setup-test-access -H "Content-Type: application/json" -d \'{"email":"test@example.com"}\''
      },
      availableRegions: [
        'Andalucía', 'Aragón', 'Principado de Asturias', 'Illes Balears',
        'Canarias', 'Cantabria', 'Castilla-La Mancha', 'Castilla y León',
        'Cataluña', 'Comunidad Valenciana', 'Extremadura', 'Galicia',
        'Comunidad de Madrid', 'Región de Murcia', 'Comunidad Foral de Navarra',
        'País Vasco', 'La Rioja', 'Ciudad Autónoma de Ceuta', 'Ciudad Autónoma de Melilla'
      ],
      testUserPreview: {
        name: 'Juan Rodríguez Martínez',
        email: 'test@example.com',
        company: 'Constructora Sur S.L.',
        regions: ['Andalucía', 'Extremadura'],
        sectors: ['Construcción', 'Obras Públicas', 'Rehabilitación'],
        budgetRange: '€50,000 - €500,000',
        keywords: ['construcción', 'obra', 'rehabilitación', 'edificación', 'urbanización']
      }
    });

  } catch (error) {
    console.error('Error in test access GET:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}