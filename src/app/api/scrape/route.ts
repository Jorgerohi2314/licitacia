import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { parseAtomXML, extractPrimaryLink, extractCPVCodes, extractCPVCategory } from '@/lib/parser';
import { analyzeWithGroqAI, inferLocationWithGroqAI, inferLocationByRules } from '@/lib/tender-analysis';
import { Prisma } from '@prisma/client';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Tipos para las fuentes de scraping
interface ScrapingSourceConfig {
  id: string;
  name: string;
  url: string;
  type: 'boe' | 'doue' | 'regional' | 'platform';
  region?: string;
  active: boolean;
  lastScraped?: Date | null;
  totalTenders: number;
}

export interface TenderInput {
  title: string;
  organization: string;
  budget: number | null;
  deadline: string; // ISO string
  category: string;
  description: string;
  source: string;
  sourceUrl: string;
  publishedAt: string; // ISO string
  keywords: string[];
  summary?: string;
}

// Configuración inicial para seeding - Solo fuentes robustas con ATOM
const INITIAL_SOURCES = [
  {
    id: 'valencia',
    name: 'Plataforma de Contratación de la Comunidad Valenciana',
    url: 'https://www.contratacion.gva.es/sindicacion/sindicacion_643/licitacionesPerfilContratante',
    type: 'regional',
    region: 'Comunidad Valenciana',
    active: true,
  },
  {
    id: 'contratos-menores',
    name: 'Contratos Menores Perfiles Contratantes',
    url: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1143/contratosMenoresPerfilesContratantes.atom',
    type: 'platform',
    region: null,
    active: true,
  },
  {
    id: 'licitaciones-completo',
    name: 'Licitaciones Perfiles Contratante Completo',
    url: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
    type: 'platform',
    region: null,
    active: true,
  },
  {
    id: 'plataformas-agregadas',
    name: 'Plataformas Agregadas Sin Menores',
    url: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1044/PlataformasAgregadasSinMenores.atom',
    type: 'platform',
    region: null,
    active: true,
  },
];

// Schema de validación
const ScrapeBody = z.object({
  action: z.string(),
  sourceId: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

// Helper para obtener fuentes (con auto-seeding)
async function getScrapingSources() {
  let sources = await db.scrapingSource.findMany();

  if (sources.length === 0) {
    console.log('Seeding initial scraping sources...');
    for (const sourceData of INITIAL_SOURCES) {
      await db.scrapingSource.upsert({
        where: { id: sourceData.id },
        update: sourceData,
        create: {
          ...sourceData,
          type: sourceData.type as string,
        },
      });
    }
    sources = await db.scrapingSource.findMany();
  }

  return sources;
}

// Función para procesar y guardar tenders en lote
export async function processAndSaveTenders(tenders: TenderInput[], sourceId: string) {
  if (tenders.length === 0) return { new: 0, updated: 0, errors: [] };

  const errors: string[] = [];
  let newTendersCount = 0;
  let updatedTendersCount = 0;

  try {
    const sourceUrls = tenders.map(t => t.sourceUrl).filter(Boolean);

    const existingTenders = await db.tender.findMany({
      where: {
        sourceUrl: { in: sourceUrls }
      },
      select: { id: true, sourceUrl: true, summary: true }
    });

    const existingUrlMap = new Map(existingTenders.map(t => [t.sourceUrl, t]));

    const tendersToCreate: Prisma.TenderCreateManyInput[] = [];
    const tendersToUpdate: { id: string, data: any }[] = [];

    for (const tender of tenders) {
      const existing = existingUrlMap.get(tender.sourceUrl);

      if (existing) {
        if (existing.summary !== tender.summary) {
          tendersToUpdate.push({
            id: existing.id,
            data: {
              description: tender.description,
              scrapedAt: new Date(),
              summary: tender.summary,
            }
          });
        }
      } else {
        tendersToCreate.push({
          title: tender.title,
          organization: tender.organization,
          budget: tender.budget,
          deadline: new Date(tender.deadline),
          category: tender.category,
          description: tender.description,
          source: tender.source,
          sourceUrl: tender.sourceUrl,
          publishedAt: new Date(tender.publishedAt),
          status: 'NEW',
          relevanceScore: 50,
          scrapedAt: new Date(),
          keywords: JSON.stringify(tender.keywords || []),
          summary: tender.summary || (tender.description ? tender.description.substring(0, 200) : ''),
          requirements: JSON.stringify([]),
          complexity: 'MEDIUM' as const,
          riskLevel: 'MEDIUM' as const
        });
      }
    }

    if (tendersToCreate.length > 0) {
      await db.tender.createMany({
        data: tendersToCreate,
      });
      newTendersCount = tendersToCreate.length;
    }

    const BATCH_SIZE = 10;
    for (let i = 0; i < tendersToUpdate.length; i += BATCH_SIZE) {
      const batch = tendersToUpdate.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(update =>
        db.tender.update({
          where: { id: update.id },
          data: update.data
        }).catch(err => {
          console.error(`Error updating tender ${update.id}:`, err);
          errors.push(`Update error for ${update.id}: ${err.message}`);
        })
      ));
      updatedTendersCount += batch.length;
    }

  } catch (error: any) {
    console.error('Error in batch processing:', error);
    errors.push(`Batch processing error: ${error.message}`);
  }

  return {
    new: newTendersCount,
    updated: updatedTendersCount,
    errors
  };
}

// Función para analizar una licitación con IA
async function analyzeTenderWithAI(tenderId: string) {
  try {
    const tender = await db.tender.findUnique({
      where: { id: tenderId }
    });

    if (!tender) return null;

    // Análisis principal de la licitación
    const analysis = await analyzeWithGroqAI(
      tender.title,
      tender.description,
      tender.budget,
      undefined
    );

    // Inferir ubicación si no está definida
    let locationData = {
      region: tender.region,
      province: tender.province
    };

    if (!tender.region || !tender.province) {
      console.log(`[Location Inference] Inferring location for tender ${tenderId}...`);
      
      // Intentar con IA primero
      let location = await inferLocationWithGroqAI(
        tender.title,
        tender.description,
        tender.organization
      );

      // Si la IA no pudo determinarlo o confianza es baja, usar reglas
      if (!location.region || location.confidence === 'LOW') {
        console.log(`[Location Inference] Falling back to rule-based inference for tender ${tenderId}`);
        location = inferLocationByRules(
          tender.title,
          tender.description,
          tender.organization
        );
      }

      if (location.region) {
        locationData.region = location.region;
        locationData.province = location.province;
        console.log(`[Location Inference] Location inferred for tender ${tenderId}: ${location.region}${location.province ? ` - ${location.province}` : ''} (${location.confidence})`);
      } else {
        console.log(`[Location Inference] Could not infer location for tender ${tenderId}: ${location.reasoning}`);
      }
    }

    await db.tender.update({
      where: { id: tenderId },
      data: {
        aiCategory: analysis.category,
        aiSectorTags: JSON.stringify(analysis.sectorTags),
        aiSummary: analysis.summary,
        aiKeywords: JSON.stringify(analysis.keywords),
        aiRecommendations: JSON.stringify(analysis.recommendations),
        relevanceScore: analysis.relevanceScore,
        riskLevel: analysis.riskLevel,
        complexity: analysis.complexity,
        aiAnalyzedAt: new Date(),
        status: 'PROCESSED',
        region: locationData.region,
        province: locationData.province
      }
    });

    return { ...analysis, region: locationData.region, province: locationData.province };
  } catch (error: any) {
    console.error(`Error analyzing tender ${tenderId}:`, error);
    return null;
  }
}

// Función para procesar feeds ATOM (Madrid, Valencia, etc.)
export async function scrapeAtomFeed(sourceId: string, url: string): Promise<any> {
  try {
    console.log(`Fetching ATOM feed from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/xml, application/atom+xml, text/xml',
        'User-Agent': 'Mozilla/5.0 (compatible; TenderScraper/1.0)'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const xmlText = await response.text();
    const entries = parseAtomXML(xmlText);

    const tenders: TenderInput[] = entries
      .filter(entry => entry.title && entry.title.length > 20)
      .map(entry => {
        const link = extractPrimaryLink(entry);
        const cpvCodes = extractCPVCodes(entry);
        const cpvCategory = cpvCodes.length > 0 
          ? extractCPVCategory(cpvCodes[0]) 
          : 'General';

        const extractText = (value: any): string => {
          if (typeof value === 'string') return value;
          if (value && typeof value === 'object' && value['#text']) return value['#text'];
          if (Array.isArray(value) && value[0] && typeof value[0] === 'object' && value[0]['#text']) return value[0]['#text'];
          return '';
        };

        return {
          title: extractText(entry.title) || 'Sin título',
          organization: extractText(entry.author?.name) || 'Organismo Público',
          description: extractText(entry.summary) || extractText(entry.content) || extractText(entry.title) || '',
          summary: extractText(entry.summary) || extractText(entry.content) || '',
          source: sourceId.toUpperCase(),
          sourceUrl: link || '',
          publishedAt: entry.published || new Date().toISOString(),
          deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
          category: cpvCategory,
          keywords: cpvCodes,
          budget: null
        };
      });

    console.log(`Parsed ${tenders.length} tenders from ATOM feed`);
    const saveResult = await processAndSaveTenders(tenders, sourceId);

    return {
      sourceId,
      scrapedAt: new Date().toISOString(),
      totalFound: tenders.length,
      newTenders: saveResult.new,
      updatedTenders: saveResult.updated,
      errors: saveResult.errors,
      status: 'completed'
    };
  } catch (error: any) {
    console.error(`ATOM feed scraping error for ${sourceId}:`, error);
    return {
      sourceId,
      scrapedAt: new Date().toISOString(),
      totalFound: 0,
      newTenders: 0,
      updatedTenders: 0,
      errors: [error.message],
      status: 'failed'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'sources') {
      const sources = await getScrapingSources();
      return NextResponse.json(sources);
    }

    if (action === 'status') {
      const sources = await getScrapingSources();
      const status = {
        totalSources: sources.length,
        activeSources: sources.filter(s => s.active).length,
        totalTenders: sources.reduce((sum, s) => sum + s.totalTenders, 0),
        lastScraped: sources.reduce((latest, s) =>
          s.lastScraped && (!latest || new Date(s.lastScraped) > new Date(latest)) ? s.lastScraped.toISOString() : latest,
          ''
        )
      };
      return NextResponse.json(status);
    }

    if (action === 'analyze') {
      const tenderId = searchParams.get('tenderId');
      if (!tenderId) {
        return NextResponse.json({ error: 'tenderId requerido' }, { status: 400 });
      }
      
      const analysis = await analyzeTenderWithAI(tenderId);
      return NextResponse.json({ success: !!analysis, analysis });
    }

    const latest = await db.tender.findMany({
      orderBy: [{ scrapedAt: 'desc' }],
      take: 50
    });

    return NextResponse.json(latest.map(t => ({
      ...t,
      deadline: t.deadline.toISOString().split('T')[0],
      publishedAt: t.publishedAt.toISOString(),
      scrapedAt: t.scrapedAt.toISOString(),
    })));
  } catch (error) {
    console.error('Error in scraping endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parseResult = ScrapeBody.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseResult.error.issues }, { status: 400 });
    }

    const { action, sourceId } = parseResult.data;

    if (action === 'scrape') {
      if (!sourceId) return NextResponse.json({ error: 'sourceId requerido' }, { status: 400 });

      const source = await db.scrapingSource.findUnique({ where: { id: sourceId } });
      if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

      const endpoints: Record<string, string> = {
        'contratos-menores': 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1143/contratosMenoresPerfilesContratantes.atom',
        'licitaciones-completo': 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
        'plataformas-agregadas': 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1044/PlataformasAgregadasSinMenores.atom',
        'valencia': 'https://www.contratacion.gva.es/sindicacion/sindicacion_643/licitacionesPerfilContratante',
      };

      const endpoint = endpoints[sourceId] || source.url;

      let result;
      if (endpoints[sourceId]) {
        result = await scrapeAtomFeed(sourceId, endpoint);
      } else {
        return NextResponse.json({ error: 'Source not configured for ATOM feed' }, { status: 400 });
      }

      await db.scrapingSource.update({
        where: { id: sourceId },
        data: {
          lastScraped: new Date(),
          totalTenders: { increment: result.newTenders }
        }
      });

      return NextResponse.json(result);
    }

    if (action === 'analyze-batch') {
      const limit = parseInt(json.limit || '5');
      
      const unanalyzedTenders = await db.tender.findMany({
        where: {
          aiAnalyzedAt: null,
          status: 'NEW'
        },
        take: limit,
        orderBy: { publishedAt: 'desc' }
      });

      const results: { tenderId: string; success: boolean }[] = [];
      for (const tender of unanalyzedTenders) {
        const analysis = await analyzeTenderWithAI(tender.id);
        if (analysis) {
          results.push({ tenderId: tender.id, success: true });
        } else {
          results.push({ tenderId: tender.id, success: false });
        }
      }

      return NextResponse.json({
        analyzed: results.length,
        successful: results.filter(r => r.success).length,
        results
      });
    }

    if (action === 'initial-scrape') {
      const zipUrl = json.zipUrl;
      if (!zipUrl) return NextResponse.json({ error: 'zipUrl requerido' }, { status: 400 });

      try {
        console.log(`Downloading ZIP from: ${zipUrl}`);

        const response = await fetch(zipUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TenderScraper/1.0)'
          },
          signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const buffer = await response.arrayBuffer();
        const zip = new AdmZip(Buffer.from(buffer));

        const tempDir = path.join(process.cwd(), 'temp', Date.now().toString());
        fs.mkdirSync(tempDir, { recursive: true });

        zip.extractAllTo(tempDir, true);

        const atomFiles = await glob('**/*.atom', { cwd: tempDir });

        let totalProcessed = 0;
        let totalNew = 0;
        let totalUpdated = 0;

        for (const file of atomFiles) {
          const filePath = path.join(tempDir, file);
          const xmlText = fs.readFileSync(filePath, 'utf8');
          const entries = parseAtomXML(xmlText);

          const tenders: TenderInput[] = entries
            .filter(entry => entry.title && entry.title.length > 20)
            .map(entry => {
              const link = extractPrimaryLink(entry);
              const cpvCodes = extractCPVCodes(entry);
              const cpvCategory = cpvCodes.length > 0
                ? extractCPVCategory(cpvCodes[0])
                : 'General';

              return {
                title: entry.title,
                organization: entry.author?.name || 'Organismo Público',
                description: entry.summary || entry.title,
                summary: entry.summary,
                source: 'INITIAL',
                sourceUrl: link || '',
                publishedAt: entry.published || new Date().toISOString(),
                deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
                category: cpvCategory,
                keywords: cpvCodes,
                budget: null
              };
            });

          const saveResult = await processAndSaveTenders(tenders, 'initial');
          totalProcessed += tenders.length;
          totalNew += saveResult.new;
          totalUpdated += saveResult.updated;
        }

        // Cleanup temp dir
        fs.rmSync(tempDir, { recursive: true });

        return NextResponse.json({
          zipUrl,
          atomFiles: atomFiles.length,
          totalProcessed,
          totalNew,
          totalUpdated,
          status: 'completed'
        });
      } catch (error: any) {
        console.error('Initial scrape error:', error);
        return NextResponse.json({ error: 'Initial scrape failed', details: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error in scraping POST:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
