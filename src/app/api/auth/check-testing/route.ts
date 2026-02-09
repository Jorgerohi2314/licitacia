import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const testingToken = cookieStore.get('testing-token')?.value;
    const testingUser = cookieStore.get('testing-user')?.value;
    const testingAdmin = cookieStore.get('testing-admin')?.value;

    if (!testingToken || !testingUser) {
      return NextResponse.json({
        isTesting: false,
        isAdminTesting: false,
        user: null
      });
    }

    try {
      // Decodificar token
      const decoded = Buffer.from(testingToken, 'base64').toString('utf-8');
      const tokenData = JSON.parse(decoded);

      // Verificar si es admin testing
      const isAdminTesting = tokenData.type === 'admin-testing' && 
                            tokenData.role === 'ADMIN' &&
                            testingAdmin === 'true';

      // Verificar expiración (2 horas = 7200000 ms)
      const isExpired = Date.now() - tokenData.timestamp > 7200000;

      if (isExpired) {
        return NextResponse.json({
          isTesting: false,
          isAdminTesting: false,
          expired: true,
          user: null
        });
      }

      const user = JSON.parse(testingUser);

      return NextResponse.json({
        isTesting: true,
        isAdminTesting,
        expired: false,
        user: {
          ...user,
          role: tokenData.role || user.role || 'USER'
        },
        expiresAt: new Date(tokenData.timestamp + 7200000).toISOString()
      });

    } catch (error) {
      console.error('[Check Testing] Error parsing token:', error);
      return NextResponse.json({
        isTesting: false,
        isAdminTesting: false,
        user: null,
        error: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('[Check Testing] Error:', error);
    return NextResponse.json({
      isTesting: false,
      isAdminTesting: false,
      user: null,
      error: 'Internal error'
    }, { status: 500 });
  }
}
