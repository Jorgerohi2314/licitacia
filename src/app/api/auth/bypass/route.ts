import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface TestUser {
  id: string;
  name: string;
  email: string;
  company: string;
  sectors: string[];
  regions: string[];
  minBudget?: number;
  maxBudget?: number;
  companySize: string;
  keywords: string[];
  plan: string;
  dailyLimit: number;
  budgetRange?: string;
}

const TEST_USERS: Record<string, TestUser> = {
  'jorge@testing.test': {
    id: 'test-user-123',
    name: 'Jorge Testing',
    email: 'jorge@testing.test',
    company: 'Testing Solutions S.L.',
    sectors: ['Construcción', 'Obras Públicas', 'Rehabilitación'],
    regions: ['Andalucía', 'Extremadura'], // Solo regiones del sur
    minBudget: 50000, // Presupuesto mínimo 50k€
    maxBudget: 500000, // Presupuesto máximo 500k€
    companySize: 'small',
    keywords: ['construcción', 'obra', 'rehabilitación', 'edificación', 'urbanización'],
    plan: 'premium',
    dailyLimit: 50,
  },
  'test@example.com': {
    id: 'test-user-456',
    name: 'Juan Testing',
    email: 'test@example.com',
    company: 'Constructora Sur S.L.',
    sectors: ['Construcción', 'Obras Públicas', 'Rehabilitación'],
    regions: ['Andalucía', 'Extremadura'],
    minBudget: 50000,
    maxBudget: 500000,
    companySize: 'small',
    keywords: ['construcción', 'obra', 'rehabilitación', 'edificación', 'urbanización'],
    plan: 'premium',
    dailyLimit: 50,
  }
};

export async function POST(request: NextRequest) {
  try {
    console.log('[BYPASS POST] Processing request...');
    
    // Solo permitir en modo desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Bypass solo disponible en modo desarrollo' },
        { status: 403 }
      );
    }

    let email;
    try {
      const body = await request.json();
      email = body.email;
      console.log('[BYPASS POST] Received email:', email);
    } catch (error) {
      console.error('[BYPASS POST] JSON parse error:', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    if (!email) {
      return NextResponse.json(
        { error: 'Se requiere el email del usuario' },
        { status: 400 }
      );
    }

    const testUser = TEST_USERS[email];
    
    if (!testUser) {
      return NextResponse.json(
        { error: 'Usuario de testing no encontrado' },
        { status: 404 }
      );
    }

    // Generar token de testing simple
    const token = Buffer.from(JSON.stringify({
      type: 'testing',
      email: testUser.email,
      timestamp: Date.now()
    })).toString('base64');

    // Establecer cookies para simular sesión
    const cookieStore = await cookies();
    cookieStore.set('testing-token', token, {
      httpOnly: true,
      secure: false, // Para testing local
      sameSite: 'lax',
      maxAge: 7200, // 2 horas
      path: '/',
    });

    cookieStore.set('testing-user', JSON.stringify(testUser), {
      httpOnly: true,
      secure: false, // Para testing local
      sameSite: 'lax',
      maxAge: 7200,
      path: '/',
    });

    // Log de acceso para debugging
    console.log(`[TESTING BYPASS] User: ${testUser.email} accessed at ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Bypass de autenticación configurado',
      token,
      user: testUser,
      testing: true,
      redirectTo: '/dashboard',
      expiresIn: '2 horas',
      testingInfo: {
        email: testUser.email,
        regions: testUser.regions,
        sectors: testUser.sectors,
        budgetRange: `€${testUser.minBudget?.toLocaleString() || '0'} - €${testUser.maxBudget?.toLocaleString() || '∞'}`,
        plan: testUser.plan,
        instructions: `
🚀 BYPASS DE AUTENTICACIÓN ACTIVADO
======================================
Email: ${testUser.email}
Regiones: ${testUser.regions.join(' • ')}
Sectores: ${testUser.sectors.join(' • ')}
Plan: ${testUser.plan} (${testUser.dailyLimit} licitaciones/día)

✅ ACCESO DIRECTO:
1. Serás redirigido automáticamente al dashboard
2. Las cookies de testing se han establecido
3. No necesitas iniciar sesión tradicionalmente
4. El modo expirará en 2 horas

🎯 OBJETIVOS DE TESTING:
• Filtrar licitaciones por: ${testUser.regions.join(', ')}
• NO deben aparecer licitaciones de: País Vasco, Cataluña, Madrid
• Buscar por keywords: ${testUser.keywords.join(', ')}
• Verificar presupuesto: ${testUser.budgetRange}
• Probar análisis IA de licitaciones
        `
      }
    });

  } catch (error) {
    console.error('Error en bypass de autenticación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Eliminar cookies de testing
    cookieStore.delete('testing-token');
    cookieStore.delete('testing-user');
    
    console.log('[TESTING BYPASS] Testing session cleared');

    return NextResponse.json({
      success: true,
      message: 'Sesión de testing eliminada'
    });

  } catch (error) {
    console.error('Error clearing testing session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Forzar respuesta limpia para GET
    return NextResponse.json({
      method: 'GET',
      message: 'Use POST method for bypass',
      availableUsers: Object.keys(TEST_USERS),
      usage: {
        method: 'POST',
        url: '/api/auth/bypass',
        contentType: 'application/json',
        body: {
          email: 'jorge@testing.test'
        }
      },
      curlExample: 'curl -X POST http://localhost:3000/api/auth/bypass -H "Content-Type: application/json" -d \'{"email":"jorge@testing.test"}\'',
      features: [
        '🔓 Bypass de autenticación',
        '🍪 Cookies de sesión (2 horas)',
        '📝 Logs de acceso',
        '🎯 Usuario preconfigurado',
        '🏗️ Modo desarrollo exclusivo'
      ],
      security: {
        onlyDevelopment: true,
        autoExpiry: '2 horas',
        httpOnly: true,
        secureCookie: 'Producción únicamente'
      },
      testUsers: Object.keys(TEST_USERS).map(email => ({
        email,
        regions: TEST_USERS[email].regions,
        sectors: TEST_USERS[email].sectors,
        plan: TEST_USERS[email].plan
      }))
    });

  } catch (error) {
    console.error('Error en bypass GET:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}