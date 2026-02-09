import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Fuentes activas para scraping automático
const ACTIVE_SOURCES = [
  {
    id: 'contratos-menores',
    name: 'Contratos Menores Perfiles Contratantes',
    endpoint: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1143/contratosMenoresPerfilesContratantes.atom',
  },
  {
    id: 'licitaciones-completo',
    name: 'Licitaciones Perfiles Contratante Completo',
    endpoint: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
  },
  {
    id: 'plataformas-agregadas',
    name: 'Plataformas Agregadas Sin Menores',
    endpoint: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1044/PlataformasAgregadasSinMenores.atom',
  },
  {
    id: 'valencia',
    name: 'Plataforma de Contratación de la Comunidad Valenciana',
    endpoint: 'https://www.contratacion.gva.es/sindicacion/sindicacion_643/licitacionesPerfilContratante',
  },
];

// Función para ejecutar scraping de una fuente
async function scrapeSource(sourceId: string, endpoint: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'scrape', sourceId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    return {
      sourceId,
      success: true,
      newTenders: result.newTenders || 0,
      updatedTenders: result.updatedTenders || 0,
      errors: result.errors || [],
    };
  } catch (error: any) {
    console.error(`[Cron Scrape] Error scraping ${sourceId}:`, error);
    return {
      sourceId,
      success: false,
      error: error.message,
    };
  }
}

// Función para limpiar licitaciones expiradas
async function cleanupExpiredTenders() {
  try {
    const now = new Date();
    
    // Buscar licitaciones con fecha límite pasada
    const expiredTenders = await db.tender.findMany({
      where: {
        deadline: {
          lt: now,
        },
      },
      select: { id: true, title: true, deadline: true },
    });

    if (expiredTenders.length === 0) {
      return { deleted: 0, message: 'No hay licitaciones expiradas' };
    }

    // Eliminar licitaciones expiradas
    const deleteResult = await db.tender.deleteMany({
      where: {
        deadline: {
          lt: now,
        },
      },
    });

    console.log(`[Cron Cleanup] Eliminadas ${deleteResult.count} licitaciones expiradas`);
    
    return {
      deleted: deleteResult.count,
      expiredTenders: expiredTenders.map(t => ({
        id: t.id,
        title: t.title.substring(0, 50) + (t.title.length > 50 ? '...' : ''),
        deadline: t.deadline.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error('[Cron Cleanup] Error:', error);
    return { error: error.message };
  }
}

// GET endpoint para cron job (puede ser llamado por Vercel Cron o similar)
export async function GET(request: NextRequest) {
  try {
    // Verificar autorización (opcional - usar secret en producción)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'cron-test-secret';
    
    // Solo verificar secret si está configurado
    if (process.env.CRON_SECRET && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const timestamp = new Date().toISOString();
    console.log(`[Cron Job] Starting daily scrape at ${timestamp}`);

    // Ejecutar scraping de todas las fuentes activas
    const scrapeResults = [];
    for (const source of ACTIVE_SOURCES) {
      console.log(`[Cron Job] Scraping ${source.name}...`);
      const result = await scrapeSource(source.id, source.endpoint);
      scrapeResults.push(result);
      
      // Pequeña pausa entre peticiones para no saturar
      if (source !== ACTIVE_SOURCES[ACTIVE_SOURCES.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Limpiar licitaciones expiradas
    console.log('[Cron Job] Cleaning up expired tenders...');
    const cleanupResult = await cleanupExpiredTenders();

    // Calcular totales
    const totalNew = scrapeResults.reduce((sum, r) => sum + (r.newTenders || 0), 0);
    const totalUpdated = scrapeResults.reduce((sum, r) => sum + (r.updatedTenders || 0), 0);
    const successfulScrapes = scrapeResults.filter(r => r.success).length;

    const summary = {
      timestamp,
      scrapeResults,
      summary: {
        totalSources: ACTIVE_SOURCES.length,
        successfulScrapes,
        failedScrapes: ACTIVE_SOURCES.length - successfulScrapes,
        totalNewTenders: totalNew,
        totalUpdatedTenders: totalUpdated,
      },
      cleanup: cleanupResult,
      status: 'completed',
    };

    console.log(`[Cron Job] Completed at ${new Date().toISOString()}`);
    console.log(`[Cron Job] New tenders: ${totalNew}, Updated: ${totalUpdated}, Deleted expired: ${cleanupResult.deleted || 0}`);

    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('[Cron Job] Fatal error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}

// POST endpoint para ejecutar manualmente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;
    
    // Verificar autorización
    const expectedSecret = process.env.CRON_SECRET || 'cron-test-secret';
    if (process.env.CRON_SECRET && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ejecutar el mismo proceso que GET
    const timestamp = new Date().toISOString();
    console.log(`[Manual Cron] Starting scrape at ${timestamp}`);

    const scrapeResults = [];
    for (const source of ACTIVE_SOURCES) {
      const result = await scrapeSource(source.id, source.endpoint);
      scrapeResults.push(result);
      
      if (source !== ACTIVE_SOURCES[ACTIVE_SOURCES.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const cleanupResult = await cleanupExpiredTenders();

    const totalNew = scrapeResults.reduce((sum, r) => sum + (r.newTenders || 0), 0);
    const totalUpdated = scrapeResults.reduce((sum, r) => sum + (r.updatedTenders || 0), 0);
    const successfulScrapes = scrapeResults.filter(r => r.success).length;

    return NextResponse.json({
      timestamp,
      scrapeResults,
      summary: {
        totalSources: ACTIVE_SOURCES.length,
        successfulScrapes,
        failedScrapes: ACTIVE_SOURCES.length - successfulScrapes,
        totalNewTenders: totalNew,
        totalUpdatedTenders: totalUpdated,
      },
      cleanup: cleanupResult,
      status: 'completed',
      triggered: 'manual',
    });

  } catch (error: any) {
    console.error('[Manual Cron] Error:', error);
    return NextResponse.json(
      { error: 'Manual execution failed', details: error.message },
      { status: 500 }
    );
  }
}
