import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_EMAIL = 'admin@testing.test';

export async function POST(request: NextRequest) {
  try {
    // Solo permitir en modo desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Admin bypass solo disponible en modo desarrollo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { secret } = body;

    // Verificar secret simple (opcional, para algo de seguridad)
    const expectedSecret = process.env.ADMIN_TEST_SECRET || 'test123';
    if (secret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Secret incorrecto' },
        { status: 401 }
      );
    }

    // Crear usuario admin de testing
    const adminUser = {
      id: 'admin-test-001',
      name: 'Admin Testing',
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      image: null,
    };

    // Generar token de testing para admin
    const token = Buffer.from(JSON.stringify({
      type: 'admin-testing',
      email: adminUser.email,
      role: 'ADMIN',
      timestamp: Date.now()
    })).toString('base64');

    // Establecer cookies
    const cookieStore = await cookies();
    
    cookieStore.set('testing-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7200, // 2 horas
      path: '/',
    });

    cookieStore.set('testing-user', JSON.stringify(adminUser), {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7200,
      path: '/',
    });

    cookieStore.set('testing-admin', 'true', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7200,
      path: '/',
    });

    console.log(`[ADMIN BYPASS] Admin testing access granted at ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Bypass de admin configurado',
      user: adminUser,
      redirectTo: '/admin',
      testing: true,
      isAdmin: true,
      expiresIn: '2 horas',
      info: `
🔓 BYPASS DE ADMIN ACTIVADO
============================
Email: ${ADMIN_EMAIL}
Rol: ADMIN

✅ ACCESO DIRECTO:
1. Serás redirigido automáticamente al panel de admin
2. Puedes ejecutar scraping manual
3. Gestionar fuentes de licitaciones
4. El modo expirará en 2 horas

🛠️ FUNCIONES DISPONIBLES:
• Scraping inicial (ZIP)
• Scraping diario manual
• Gestión de fuentes
• Ver resultados de scraping
      `
    });

  } catch (error) {
    console.error('Error en admin bypass:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Admin bypass endpoint',
    usage: {
      method: 'POST',
      url: '/api/auth/admin-bypass',
      body: {
        secret: 'opcional - usar ADMIN_TEST_SECRET o test123 por defecto'
      }
    },
    curlExample: 'curl -X POST http://localhost:3000/api/auth/admin-bypass -H "Content-Type: application/json" -d \'{}\'',
    note: 'Solo disponible en modo desarrollo (NODE_ENV !== production)'
  });
}
