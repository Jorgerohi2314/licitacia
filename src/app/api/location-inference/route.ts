import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inferLocationWithGroqAI, inferLocationByRules } from '@/lib/tender-analysis';
import { Prisma } from '@prisma/client';

interface LocationInferenceResult {
  tenderId: string;
  success: boolean;
  region?: string | null;
  province?: string | null;
  confidence?: string;
  reasoning?: string;
  error?: string;
}

// Inferir ubicación para una sola licitación
async function inferSingleLocation(tenderId: string): Promise<LocationInferenceResult> {
  try {
    const tender = await db.tender.findUnique({
      where: { id: tenderId }
    });

    if (!tender) {
      return { tenderId, success: false, error: 'Licitación no encontrada' };
    }

    // Si ya tiene ubicación, no hacer nada
    if (tender.region && tender.province) {
      return {
        tenderId,
        success: true,
        region: tender.region,
        province: tender.province,
        confidence: 'EXISTING',
        reasoning: 'La licitación ya tenía ubicación definida'
      };
    }

    // Intentar inferir con IA
    let location = await inferLocationWithGroqAI(
      tender.title,
      tender.description,
      tender.organization
    );

    // Si la IA no pudo determinarlo con alta confianza, usar reglas
    if (!location.region || location.confidence === 'LOW') {
      location = inferLocationByRules(
        tender.title,
        tender.description,
        tender.organization
      );
    }

    // Actualizar la licitación si se determinó una ubicación
    if (location.region) {
      await db.tender.update({
        where: { id: tenderId },
        data: {
          region: location.region,
          province: location.province
        }
      });

      return {
        tenderId,
        success: true,
        region: location.region,
        province: location.province,
        confidence: location.confidence,
        reasoning: location.reasoning
      };
    }

    return {
      tenderId,
      success: false,
      error: location.reasoning || 'No se pudo inferir la ubicación'
    };

  } catch (error) {
    console.error(`Error inferring location for tender ${tenderId}:`, error);
    return {
      tenderId,
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// GET: Obtener estadísticas de licitaciones sin ubicación o inferir una específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const tenderId = searchParams.get('tenderId');

    // Inferir ubicación para una licitación específica
    if (action === 'infer' && tenderId) {
      const result = await inferSingleLocation(tenderId);
      return NextResponse.json(result);
    }

    // Obtener estadísticas de licitaciones sin ubicación
    if (action === 'stats') {
      const totalTenders = await db.tender.count();
      const withoutRegion = await db.tender.count({
        where: { region: null }
      });
      const withoutProvince = await db.tender.count({
        where: { province: null }
      });

      // Contar por comunidades autónomas existentes
      const byRegion = await db.tender.groupBy({
        by: ['region'],
        _count: { id: true }
      });

      return NextResponse.json({
        total: totalTenders,
        withoutRegion,
        withoutProvince,
        withLocation: totalTenders - withoutRegion,
        byRegion: byRegion.map(r => ({
          region: r.region || 'Sin definir',
          count: r._count.id
        }))
      });
    }

    // Listar licitaciones sin ubicación (para depuración)
    if (action === 'list-missing') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const missing = await db.tender.findMany({
        where: { region: null },
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          organization: true,
          description: true,
          publishedAt: true,
          source: true
        }
      });

      return NextResponse.json({ count: missing.length, tenders: missing });
    }

    return NextResponse.json({
      message: 'Usa ?action=stats, ?action=list-missing, o ?action=infer&tenderId=XXX'
    });

  } catch (error) {
    console.error('Error in location inference endpoint:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Procesar licitaciones sin ubicación en lote
export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { action, limit = 10, tenderIds } = json;

    // Procesar licitaciones específicas por ID
    if (action === 'infer-specific' && Array.isArray(tenderIds)) {
      const results: LocationInferenceResult[] = [];

      for (const tenderId of tenderIds) {
        const result = await inferSingleLocation(tenderId);
        results.push(result);
      }

      return NextResponse.json({
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      });
    }

    // Procesar licitaciones sin ubicación en lote
    if (action === 'infer-batch') {
      // Obtener licitaciones sin región definida
      const tendersWithoutLocation = await db.tender.findMany({
        where: { region: null },
        take: limit,
        orderBy: { publishedAt: 'desc' }
      });

      if (tendersWithoutLocation.length === 0) {
        return NextResponse.json({
          message: 'No hay licitaciones sin ubicación para procesar',
          processed: 0,
          successful: 0,
          failed: 0,
          results: []
        });
      }

      const results: LocationInferenceResult[] = [];

      for (const tender of tendersWithoutLocation) {
        console.log(`[Location Batch] Processing tender ${tender.id}: ${tender.title.substring(0, 50)}...`);
        const result = await inferSingleLocation(tender.id);
        results.push(result);
      }

      const stats = {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        withLocation: results.filter(r => r.region).length
      };

      console.log(`[Location Batch] Completed: ${stats.successful}/${stats.processed} successful`);

      return NextResponse.json({
        ...stats,
        results
      });
    }

    return NextResponse.json(
      { error: 'Acción no válida. Usa "infer-specific" o "infer-batch"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in location inference POST:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
