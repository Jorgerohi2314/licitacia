import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';

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

// Configuración inicial para seeding
const INITIAL_SOURCES = [
  {
    id: 'boe',
    name: 'Boletín Oficial del Estado',
    url: 'https://www.boe.es/',
    type: 'boe',
    region: null,
    active: true,
  },
  {
    id: 'doue',
    name: 'Diario Oficial de la Unión Europea',
    url: 'https://ted.europa.eu/',
    type: 'doue',
    region: null,
    active: true,
  },
  {
    id: 'plataforma-contratacion',
    name: 'Plataforma de Contratación del Sector Público',
    url: 'https://contrataciondelestado.es/',
    type: 'platform',
    region: null,
    active: true,
  },
  {
    id: 'cat',
    name: 'Plataforma de Contratación de Cataluña',
    url: 'https://contractaciopublica.gencat.cat/',
    type: 'regional',
    region: 'Cataluña',
    active: true,
  },
  {
    id: 'madrid',
    name: 'Plataforma de Contratación de la Comunidad de Madrid',
    url: 'https://www.madrid.org/contratacionpublica/sindicacion/sindicacion.atom',
    type: 'regional',
    region: 'Madrid',
    active: true,
  }
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
    await db.scrapingSource.createMany({
      data: INITIAL_SOURCES.map(s => ({
        ...s,
        type: s.type as string, // Cast simple para Prisma
      }))
    });
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
    // 1. Obtener URLs de los tenders encontrados para verificar existencia
    const sourceUrls = tenders.map(t => t.sourceUrl).filter(Boolean);

    // 2. Buscar tenders existentes en una sola consulta
    const existingTenders = await db.tender.findMany({
      where: {
        sourceUrl: { in: sourceUrls }
      },
      select: { id: true, sourceUrl: true, summary: true }
    });

    const existingUrlMap = new Map(existingTenders.map(t => [t.sourceUrl, t]));

    // 3. Separar nuevos de existentes
    const tendersToCreate: Prisma.TenderCreateManyInput[] = [];
    const tendersToUpdate: { id: string, data: any }[] = [];

    for (const tender of tenders) {
      const existing = existingUrlMap.get(tender.sourceUrl);

      if (existing) {
        // Solo actualizamos si hay cambios relevantes (simple check por ahora)
        if (existing.summary !== tender.summary) {
          tendersToUpdate.push({
            id: existing.id,
            data: {
              description: tender.description,
              scrapedAt: new Date(),
              summary: tender.summary,
              // No actualizamos status ni otros campos manuales
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
          relevanceScore: 50, // Default score
          scrapedAt: new Date(),
          keywords: JSON.stringify(tender.keywords || []),
          summary: tender.description.substring(0, 200),
          requirements: JSON.stringify([]),
          complexity: 'MEDIUM',
          riskLevel: 'MEDIUM'
        });
      }
    }

    // 4. Ejecutar inserciones masivas
    if (tendersToCreate.length > 0) {
      await db.tender.createMany({
        data: tendersToCreate,
        skipDuplicates: true // Seguridad adicional
      });
      newTendersCount = tendersToCreate.length;
    }

    // 5. Ejecutar actualizaciones en paralelo con límite de concurrencia
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

// Función específica para scraping del BOE
async function scrapeBOE() {
  try {
    const boeUrl = 'https://www.boe.es/buscar/boe.php?campo%5B0%5D=ID&dato%5B0%5D=con&type=pdf&accion=Buscar';
    console.log(`Fetching BOE from: ${boeUrl}`);

    const response = await fetch(boeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TenderScraper/1.0)'
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const tenders: TenderInput[] = [];

    // Helpers de extracción (reutilizados pero limpiados)
    const extractKeywords = (title: string): string[] => {
      const keywords = [];
      const titleLower = title.toLowerCase();
      if (titleLower.match(/tecnolog|software|informática|tic|digital|sistema/i)) keywords.push('tecnología', 'software');
      if (titleLower.match(/consultor|asesor|asistencia|servicio técnico/i)) keywords.push('consultoría');
      if (titleLower.match(/construcción|obra|edificación|urbanización|reforma/i)) keywords.push('construcción');
      if (titleLower.match(/sanidad|salud|hospital|clínica|médico/i)) keywords.push('sanidad');
      if (titleLower.match(/educación|enseñanza|colegio|universidad|formación/i)) keywords.push('educación');
      if (titleLower.match(/mantenimiento|reparación|conservación/i)) keywords.push('mantenimiento');
      return keywords.length > 0 ? keywords : ['licitación', 'contratación', 'administración'];
    };

    const extractOrganization = (title: string): string => {
      const titleLower = title.toLowerCase();
      if (titleLower.match(/ministerio|min\./i)) return 'Ministerio';
      if (titleLower.match(/ayuntamiento|ayto|municipio/i)) return 'Ayuntamiento';
      if (titleLower.match(/comunidad|autónoma|regional/i)) return 'Comunidad Autónoma';
      if (titleLower.match(/diputación|provincial/i)) return 'Diputación Provincial';
      return 'Organismo Público';
    };

    const extractBudget = (title: string): number | null => {
      const budgetMatch = title.match(/(\d[\d.,]*)\s*€/i) || title.match(/(\d[\d.,]*)\s*euro/i);
      if (budgetMatch) {
        const amount = parseFloat(budgetMatch[1].replace(/\./g, '').replace(',', '.'));
        return isNaN(amount) ? null : amount;
      }
      return null;
    };

    // Lógica de extracción principal
    $('a').each((_, element) => {
      const $el = $(element);
      const title = $el.text().trim();
      const href = $el.attr('href');

      if (!title || !href) return;

      const url = new URL(href, boeUrl).toString();
      const titleLower = title.toLowerCase();

      const isRelevantLink = (
        (titleLower.match(/licitación|contratación|concurso|adjudicación|contrato|pliego/i) ||
          url.match(/licitacion|contratacion|concurso|adjudicacion/i)) &&
        !titleLower.match(/(pdf|boe|pág|página|kb|mb|anuncio|notificación|índice|sumario)/i)
      );

      if (isRelevantLink && title.length > 20) {
        tenders.push({
          title: title,
          organization: extractOrganization(title),
          budget: extractBudget(title),
          deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
          category: 'Administrativo', // Simplificado
          description: `Licitación pública: ${title}`,
          source: 'BOE',
          sourceUrl: url,
          publishedAt: new Date().toISOString(),
          keywords: extractKeywords(title)
        });
      }
    });

    // Fallback search si encontramos pocos
    if (tenders.length < 5) {
      $('.resultado-busqueda, .listado-resultados, .item-resultado').each((_, element) => {
        const $el = $(element);
        const title = $el.find('h3, .titulo, a').first().text().trim();
        const href = $el.find('a').attr('href');

        if (title && href && title.length > 30) {
          const url = new URL(href, boeUrl).toString();
          if (title.toLowerCase().match(/licitación|contratación|concurso/i)) {
            tenders.push({
              title: title,
              organization: extractOrganization(title),
              budget: extractBudget(title),
              deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
              category: 'Administrativo',
              description: title,
              source: 'BOE',
              sourceUrl: url,
              publishedAt: new Date().toISOString(),
              keywords: extractKeywords(title)
            });
          }
        }
      });
    }

    console.log(`Found ${tenders.length} tenders from BOE`);

    const saveResult = await processAndSaveTenders(tenders, 'boe');

    return {
      sourceId: 'boe',
      scrapedAt: new Date().toISOString(),
      totalFound: tenders.length,
      newTenders: saveResult.new,
      updatedTenders: saveResult.updated,
      errors: saveResult.errors,
      status: 'completed'
    };

  } catch (error: any) {
    console.error('BOE scraping error:', error);
    return {
      sourceId: 'boe',
      scrapedAt: new Date().toISOString(),
      totalFound: 0,
      newTenders: 0,
      updatedTenders: 0,
      errors: [error.message],
      status: 'failed'
    };
  }
}

// Parser XML mejorado usando Cheerio
function parseAtomFeed(xml: string, sourceId: string): TenderInput[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: TenderInput[] = [];

  $('entry').each((_, element) => {
    const $el = $(element);
    const title = $el.find('title').text().trim();
    const summary = $el.find('summary').text().trim() || $el.find('content').text().trim();
    const updated = $el.find('updated').text().trim() || $el.find('published').text().trim();
    const link = $el.find('link[rel="alternate"]').attr('href') || $el.find('link').attr('href');
    const author = $el.find('author name').text().trim();

    if (title) {
      items.push({
        title: title || 'Sin título',
        organization: author || 'Organismo Público',
        description: summary || title,
        summary: summary,
        source: sourceId.toUpperCase(),
        sourceUrl: link || '',
        publishedAt: updated || new Date().toISOString(),
        deadline: new Date(Date.now() + 15 * 86400000).toISOString(), // Default 15 days
        category: 'General',
        keywords: [],
        budget: null // Difícil de extraer genéricamente sin regex específico
      });
    }
  });

  return items;
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

    const { action, sourceId, config } = parseResult.data;

    if (action === 'configure') {
      if (!sourceId) return NextResponse.json({ error: 'sourceId requerido' }, { status: 400 });

      const updated = await db.scrapingSource.update({
        where: { id: sourceId },
        data: {
          ...config,
          updatedAt: new Date()
        }
      });
      return NextResponse.json(updated);
    }

    if (action === 'scrape') {
      if (!sourceId) return NextResponse.json({ error: 'sourceId requerido' }, { status: 400 });

      // BOE tiene lógica especial
      if (sourceId === 'boe') {
        const result = await scrapeBOE();
        // Actualizar estadísticas del source
        await db.scrapingSource.update({
          where: { id: 'boe' },
          data: {
            lastScraped: new Date(),
            totalTenders: { increment: result.newTenders }
          }
        });
        return NextResponse.json(result);
      }

      // Otras fuentes
      const source = await db.scrapingSource.findUnique({ where: { id: sourceId } });
      if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

      // Fallback endpoints si la URL de la DB no es específica para el feed
      const fallbackEndpoints: Record<string, string> = {
        'doue': 'https://ted.europa.eu/TED/misc/atomFeed.do',
        'plataforma-contratacion': 'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilContratante',
        'cat': 'https://contractaciopublica.gencat.cat/ecofin_ps/Atom/ES/indexAtom.xml',
        'madrid': 'https://www.madrid.org/contratacionpublica/sindicacion/sindicacion.atom'
      };

      // Priorizar la URL de la base de datos, usar fallback si es necesario
      // Asumimos que si la URL en DB es la genérica de la web, queremos el feed específico si existe
      const endpoint = fallbackEndpoints[sourceId] || source.url;
      console.log(`Fetching from endpoint: ${endpoint} (Source: ${source.name})`);

      const res = await fetch(endpoint, {
        headers: {
          'Accept': 'application/xml, application/atom+xml, application/json, text/xml',
          'User-Agent': 'Mozilla/5.0 (compatible; TenderScraper/1.0)'
        },
        timeout: 30000
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const text = await res.text();
      // Detectar si es JSON o XML
      let items: TenderInput[] = [];
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          const json = JSON.parse(text);
          items = Array.isArray(json) ? json : (json.items || []);
        } catch (e) { console.error('JSON parse error', e); }
      } else {
        items = parseAtomFeed(text, sourceId);
      }

      const saveResult = await processAndSaveTenders(items, sourceId);

      // Actualizar estadísticas
      await db.scrapingSource.update({
        where: { id: sourceId },
        data: {
          lastScraped: new Date(),
          totalTenders: { increment: saveResult.new }
        }
      });

      return NextResponse.json({
        sourceId,
        scrapedAt: new Date().toISOString(),
        totalFound: items.length,
        newTenders: saveResult.new,
        updatedTenders: saveResult.updated,
        errors: saveResult.errors,
        status: 'completed'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error in scraping POST:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}