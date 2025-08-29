import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import * as cheerio from 'cheerio';

interface ScrapingSource {
  id: string;
  name: string;
  url: string;
  type: 'boe' | 'doue' | 'regional' | 'platform';
  region?: string;
  active: boolean;
  lastScraped?: string;
  totalTenders: number;
}

interface ScrapedTender {
  id: string;
  title: string;
  organization: string;
  budget?: number;
  deadline: string;
  category: string;
  description: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  scrapedAt: string;
}

// Fuentes de scraping configuradas
const scrapingSources: ScrapingSource[] = [
  {
    id: 'boe',
    name: 'Boletín Oficial del Estado',
    url: 'https://www.boe.es/',
    type: 'boe',
    active: true,
    lastScraped: '2024-01-15T10:30:00Z',
    totalTenders: 89
  },
  {
    id: 'doue',
    name: 'Diario Oficial de la Unión Europea',
    url: 'https://ted.europa.eu/',
    type: 'doue',
    active: true,
    lastScraped: '2024-01-15T09:15:00Z',
    totalTenders: 156
  },
  {
    id: 'plataforma-contratacion',
    name: 'Plataforma de Contratación del Sector Público',
    url: 'https://contrataciondelestado.es/',
    type: 'platform',
    active: true,
    lastScraped: '2024-01-15T08:45:00Z',
    totalTenders: 234
  },
  {
    id: 'cat',
    name: 'Plataforma de Contratación de Cataluña',
    url: 'https://contractaciopublica.gencat.cat/',
    type: 'regional',
    region: 'Cataluña',
    active: true,
    lastScraped: '2024-01-15T08:30:00Z',
    totalTenders: 67
  },
  {
    id: 'madrid',
    name: 'Plataforma de Contratación de la Comunidad de Madrid',
    url: 'https://www.madrid.org/contratacionpublica/',
    type: 'regional',
    region: 'Madrid',
    active: true,
    lastScraped: '2024-01-15T08:20:00Z',
    totalTenders: 45
  }
];

// Schema de validación
const ScrapeBody = z.object({
  action: z.string(),
  sourceId: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

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
    console.log(`Received ${html.length} characters from BOE`);

    const $ = cheerio.load(html);
    const tenders: any[] = [];

    // Función para extraer keywords del título
    const extractKeywords = (title: string): string[] => {
      const keywords = [];
      const titleLower = title.toLowerCase();
      
      if (titleLower.match(/tecnolog|software|informática|tic|digital|sistema/i)) {
        keywords.push('tecnología', 'software');
      }
      if (titleLower.match(/consultor|asesor|asistencia|servicio técnico/i)) {
        keywords.push('consultoría');
      }
      if (titleLower.match(/construcción|obra|edificación|urbanización|reforma/i)) {
        keywords.push('construcción');
      }
      if (titleLower.match(/sanidad|salud|hospital|clínica|médico/i)) {
        keywords.push('sanidad');
      }
      if (titleLower.match(/educación|enseñanza|colegio|universidad|formación/i)) {
        keywords.push('educación');
      }
      if (titleLower.match(/mantenimiento|reparación|conservación/i)) {
        keywords.push('mantenimiento');
      }
      
      // Palabras clave generales de contratación
      return keywords.length > 0 ? keywords : ['licitación', 'contratación', 'administración'];
    };

    // Función para extraer organización del título
    const extractOrganization = (title: string): string => {
      const titleLower = title.toLowerCase();
      if (titleLower.match(/ministerio|min\./i)) return 'Ministerio';
      if (titleLower.match(/ayuntamiento|ayto|municipio/i)) return 'Ayuntamiento';
      if (titleLower.match(/comunidad|autónoma|regional/i)) return 'Comunidad Autónoma';
      if (titleLower.match(/diputación|provincial/i)) return 'Diputación Provincial';
      if (titleLower.match(/gobierno|estado|administración general/i)) return 'Administración General del Estado';
      return 'Organismo Público';
    };

    // Función para extraer categoría del título
    const extractCategory = (title: string): string => {
      const titleLower = title.toLowerCase();
      if (titleLower.match(/tecnolog|software|informática|tic|digital/i)) return 'Tecnología';
      if (titleLower.match(/consultor|asesor|asistencia/i)) return 'Consultoría';
      if (titleLower.match(/construcción|obra|edificación|urbanización/i)) return 'Construcción';
      if (titleLower.match(/sanidad|salud|hospital|médico/i)) return 'Sanidad';
      if (titleLower.match(/educación|enseñanza|formación/i)) return 'Educación';
      if (titleLower.match(/mantenimiento|reparación/i)) return 'Mantenimiento';
      return 'Administrativo';
    };

    // Función para intentar extraer presupuesto del título
    const extractBudget = (title: string): number | null => {
      const budgetMatch = title.match(/(\d[\d.,]*)\s*€/i) || title.match(/(\d[\d.,]*)\s*euro/i);
      if (budgetMatch) {
        const amount = parseFloat(budgetMatch[1].replace(/\./g, '').replace(',', '.'));
        return isNaN(amount) ? null : amount;
      }
      return null;
    };

    // BUSCAR ENLACES RELEVANTES CON FILTRADO INTELIGENTE
    $('a').each((index, element) => {
      const $el = $(element);
      const title = $el.text().trim();
      const href = $el.attr('href');
      
      if (!title || !href) return;
      
      const url = new URL(href, boeUrl).toString();
      const titleLower = title.toLowerCase();

      // FILTRO INTELIGENTE - Solo enlaces que parezcan licitaciones reales
      const isRelevantLink = (
        // Palabras clave en el título
        titleLower.match(/licitación|contratación|concurso|adjudicación|contrato|pliego|expediente|procedimiento/i) ||
        titleLower.match(/\b(convocatoria|adquisición|suministro|servicio|obra|proyecto)\b/i) ||
        
        // Palabras clave en la URL
        url.match(/licitacion|contratacion|concurso|adjudicacion|contrato|pliego|expediente/i) ||
        
        // Exclusiones - evitar documentos genéricos
        !titleLower.match(/(pdf|boe|pág|página|kb|mb|anuncio|notificación|índice|sumario)/i)
      );

      if (isRelevantLink && title.length > 20) { // Títulos significativos
        const keywords = extractKeywords(title);
        const organization = extractOrganization(title);
        const category = extractCategory(title);
        const budget = extractBudget(title);

        tenders.push({
          title: title,
          organization: organization,
          budget: budget,
          deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          category: category,
          description: `Licitación pública: ${title}`,
          source: 'BOE',
          sourceUrl: url,
          publishedAt: new Date().toISOString(),
          keywords: keywords // Esto será importante para las búsquedas
        });
      }
    });

    console.log(`Found ${tenders.length} potential tenders from BOE after intelligent filtering`);

    // Si no encontramos enough resultados, buscar en resultados de búsqueda
    if (tenders.length < 5) {
      console.log('Using fallback search...');
      $('.resultado-busqueda, .listado-resultados, .item-resultado').each((index, element) => {
        const $el = $(element);
        const title = $el.find('h3, .titulo, a').first().text().trim();
        const href = $el.find('a').attr('href');
        
        if (title && href && title.length > 30) {
          const url = new URL(href, boeUrl).toString();
          const titleLower = title.toLowerCase();
          
          if (titleLower.match(/licitación|contratación|concurso|adjudicación/i)) {
            const keywords = extractKeywords(title);
            const organization = extractOrganization(title);
            const category = extractCategory(title);
            const budget = extractBudget(title);

            tenders.push({
              title: title,
              organization: organization,
              budget: budget,
              deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              category: category,
              description: `Licitación pública encontrada: ${title}`,
              source: 'BOE',
              sourceUrl: url,
              publishedAt: new Date().toISOString(),
              keywords: keywords
            });
          }
        }
      });
    }

    console.log(`Total found after all searches: ${tenders.length} tenders`);

    // Procesar los tenders encontrados
    let newTenders = 0;
    let updatedTenders = 0;
    const errors: string[] = [];

    for (const tender of tenders) {
      try {
        const existing = await db.tender.findFirst({
          where: {
            OR: [
              { sourceUrl: tender.sourceUrl },
              { 
                AND: [
                  { title: tender.title },
                  { publishedAt: new Date(tender.publishedAt) }
                ]
              }
            ]
          }
        });

        if (existing) {
          await db.tender.update({
            where: { id: existing.id },
            data: {
              description: tender.description,
              scrapedAt: new Date(),
              keywords: existing.keywords,
              summary: existing.summary,
              requirements: existing.requirements,
              complexity: existing.complexity,
              riskLevel: existing.riskLevel
            }
          });
          updatedTenders++;
        } else {
          await db.tender.create({
            data: {
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
              keywords: JSON.stringify(tender.keywords || []), // Keywords reales
              summary: tender.description.substring(0, 200), // Resumen automático
              requirements: JSON.stringify([]),
              complexity: 'MEDIUM',
              riskLevel: 'MEDIUM'
            }
          });
          newTenders++;
        }
      } catch (dbError: any) {
        errors.push(`Error processing tender: ${dbError.message}`);
      }
    }

    return {
      sourceId: 'boe',
      scrapedAt: new Date().toISOString(),
      totalFound: tenders.length,
      newTenders,
      updatedTenders,
      errors,
      status: 'completed',
      warning: tenders.length === 0 ? 'No relevant contract sections found in BOE' : undefined
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

function tryParseJsonArray(text: string): any[] | null {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.items)) return data.items;
    if (data && typeof data === 'object' && Array.isArray(data.feed?.entry)) return data.feed.entry;
    return null;
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
}

function extractItemsFromAtom(xml: string): any[] {
  try {
    const entries = xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
    console.log(`Found ${entries.length} XML entries`);
    
    return entries.map((entry, index) => ({ 
      raw: entry,
      index 
    })).slice(0, 50);
  } catch (e) {
    console.error('XML parse error:', e);
    return [];
  }
}

function extractBetween(text: string, start: string, end: string): string {
  const s = text.indexOf(start);
  if (s === -1) return '';
  const e = text.indexOf(end, s + start.length);
  if (e === -1) return '';
  return text.substring(s + start.length, e)
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizePcspItem(item: any) {
  try {
    const isXml = !!item.raw;
    
    if (isXml) {
      const title = extractBetween(item.raw, '<title>', '</title>') || 
                    extractBetween(item.raw, '<title type="text">', '</title>') ||
                    extractBetween(item.raw, '<title type="html">', '</title>');
      
      const published = extractBetween(item.raw, '<updated>', '</updated>') || 
                        extractBetween(item.raw, '<published>', '</published>') ||
                        new Date().toISOString();
      
      const link = extractBetween(item.raw, '<link href="', '"') || 
                  extractBetween(item.raw, '<link rel="alternate" href="', '"') ||
                  '';
      
      const summary = extractBetween(item.raw, '<summary>', '</summary>') ||
                      extractBetween(item.raw, '<summary type="html">', '</summary>') ||
                      extractBetween(item.raw, '<content>', '</content>') ||
                      '';
      
      const author = extractBetween(item.raw, '<author><name>', '</name></author>') ||
                    'Organismo público';

      return {
        title: title.trim() || `Licitación ${item.index || Date.now()}`,
        organization: author.trim(),
        budget: undefined,
        deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        category: 'General',
        description: summary || title || 'Sin descripción disponible',
        summary: summary || undefined,
        keywords: [],
        source: 'PCSP',
        sourceUrl: link || undefined,
        publishedAt: published,
      };
    } else {
      const budget = Number(item.budget || item.amount || NaN);
      const deadline = item.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
      
      return {
        title: String(item.title || '').trim() || 'Sin título',
        organization: String(item.organization || item.author || 'Organismo público').trim(),
        budget: Number.isNaN(budget) ? undefined : budget,
        deadline,
        category: item.category || 'General',
        description: item.description || item.summary || item.title || 'Sin descripción',
        summary: item.summary || undefined,
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        source: 'PCSP',
        sourceUrl: item.link || item.url || undefined,
        publishedAt: item.publishedAt || item.pubDate || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error('Error normalizing item:', e);
    return {
      title: `Error al procesar item ${Date.now()}`,
      organization: 'Desconocido',
      budget: undefined,
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      category: 'General',
      description: 'Error al procesar la información de esta licitación',
      summary: undefined,
      keywords: [],
      source: 'PCSP',
      sourceUrl: undefined,
      publishedAt: new Date().toISOString(),
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'sources') {
      return NextResponse.json(scrapingSources);
    }

    if (action === 'status') {
      const status = {
        totalSources: scrapingSources.length,
        activeSources: scrapingSources.filter(s => s.active).length,
        totalTenders: scrapingSources.reduce((sum, s) => sum + s.totalTenders, 0),
        lastScraped: scrapingSources.reduce((latest, s) => 
          s.lastScraped && (!latest || s.lastScraped > latest) ? s.lastScraped : latest, 
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
      id: t.id,
      title: t.title,
      organization: t.organization,
      budget: t.budget ?? undefined,
      deadline: t.deadline.toISOString().split('T')[0],
      category: t.category,
      description: t.description,
      source: t.source,
      sourceUrl: t.sourceUrl ?? '',
      publishedAt: t.publishedAt.toISOString(),
      scrapedAt: t.scrapedAt.toISOString(),
    })));
  } catch (error) {
    console.error('Error in scraping endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let json;
    try {
      json = await request.json();
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('Received request body:', JSON.stringify(json, null, 2));

    const parseResult = ScrapeBody.safeParse(json);
    if (!parseResult.success) {
      console.error('Validation errors:', parseResult.error.issues);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: parseResult.error.issues,
          received: json 
        },
        { status: 400 }
      );
    }

    const { action, sourceId, config } = parseResult.data;

    if (!['scrape', 'configure'].includes(action)) {
      return NextResponse.json(
        { 
          error: 'Invalid action',
          allowed: ['scrape', 'configure'],
          received: action 
        },
        { status: 400 }
      );
    }

    if (action === 'scrape') {
      if (!sourceId) {
        return NextResponse.json({ error: 'sourceId requerido' }, { status: 400 });
      }

      const source = scrapingSources.find(s => s.id === sourceId);
      if (!source) {
        return NextResponse.json(
          { 
            error: 'Source not found',
            availableSources: scrapingSources.map(s => s.id)
          },
          { status: 404 }
        );
      }

      console.log(`Starting scrape for source: ${sourceId}`);

      // Scraping especial para BOE
      if (sourceId === 'boe') {
        const boeResult = await scrapeBOE();
        return NextResponse.json(boeResult);
      }

      // Scraping para otras fuentes
      const endpoints: Record<string, string> = {
        'doue': 'https://ted.europa.eu/TED/misc/atomFeed.do',
        'plataforma-contratacion': 'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilContratante',
        'cat': 'https://contractaciopublica.gencat.cat/ecofin_ps/Atom/ES/indexAtom.xml',
        'madrid': 'https://www.madrid.org/contratacionpublica/sindicacion/sindicacion.atom'
      };

      const endpoint = endpoints[sourceId] || source.url;
      console.log(`Fetching from endpoint: ${endpoint}`);

      let res;
      try {
        res = await fetch(endpoint, { 
          headers: { 
            'Accept': 'application/xml, application/atom+xml, application/json, text/xml',
            'User-Agent': 'Mozilla/5.0 (compatible; TenderScraper/1.0)'
          },
          timeout: 30000
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        return NextResponse.json(
          { 
            error: 'Failed to fetch from source',
            details: fetchError.message,
            endpoint 
          },
          { status: 502 }
        );
      }

      const text = await res.text();
      console.log(`Received ${text.length} characters from source`);

      const items = tryParseJsonArray(text) ?? extractItemsFromAtom(text);
      console.log(`Extracted ${items.length} items`);

      if (items.length === 0) {
        return NextResponse.json({
          sourceId,
          scrapedAt: new Date().toISOString(),
          totalFound: 0,
          newTenders: 0,
          updatedTenders: 0,
          errors: ['No items found in response'],
          status: 'completed',
          warning: 'No data found from source'
        });
      }

      let totalFound = 0;
      let newTenders = 0;
      let updatedTenders = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          totalFound += 1;
          const normalized = normalizePcspItem(item);

          if (!normalized.title || !normalized.publishedAt) {
            errors.push(`Item ${totalFound}: Missing required fields (title or publishedAt)`);
            continue;
          }

          const existing = await db.tender.findFirst({
            where: {
              OR: [
                { 
                  AND: [
                    { source: normalized.source }, 
                    { sourceUrl: normalized.sourceUrl }
                  ] 
                },
                { 
                  AND: [
                    { title: normalized.title }, 
                    { publishedAt: new Date(normalized.publishedAt) }
                  ] 
                },
              ],
            },
          });

          if (existing) {
            await db.tender.update({
              where: { id: existing.id },
              data: {
                description: normalized.description,
                budget: normalized.budget ?? existing.budget,
                deadline: new Date(normalized.deadline),
                category: normalized.category,
                keywords: JSON.stringify(normalized.keywords),
                summary: normalized.summary ?? existing.summary,
                scrapedAt: new Date(),
              },
            });
            updatedTenders += 1;
          } else {
            await db.tender.create({
              data: {
                title: normalized.title,
                organization: normalized.organization,
                budget: normalized.budget ?? null,
                deadline: new Date(normalized.deadline),
                category: normalized.category,
                description: normalized.description,
                summary: normalized.summary ?? null,
                keywords: JSON.stringify(normalized.keywords),
                requirements: JSON.stringify([]),
                source: normalized.source,
                sourceUrl: normalized.sourceUrl ?? null,
                publishedAt: new Date(normalized.publishedAt),
                status: 'NEW',
                relevanceScore: 0,
                complexity: 'MEDIUM',
                riskLevel: 'MEDIUM',
              },
            });
            newTenders += 1;
          }
        } catch (e: any) {
          console.error(`Error processing item ${totalFound}:`, e);
          errors.push(`Item ${totalFound}: ${e?.message || 'Unknown error'}`);
        }
      }

      const sourceIndex = scrapingSources.findIndex(s => s.id === sourceId);
      if (sourceIndex !== -1) {
        scrapingSources[sourceIndex].lastScraped = new Date().toISOString();
        scrapingSources[sourceIndex].totalTenders += newTenders;
      }

      return NextResponse.json({
        sourceId,
        scrapedAt: new Date().toISOString(),
        totalFound,
        newTenders,
        updatedTenders,
        errors,
        status: 'completed',
      });
    }

    if (action === 'configure') {
      if (!sourceId) {
        return NextResponse.json({ error: 'sourceId requerido' }, { status: 400 });
      }

      const sourceIndex = scrapingSources.findIndex(s => s.id === sourceId);
      
      if (sourceIndex === -1) {
        return NextResponse.json(
          { 
            error: 'Source not found',
            availableSources: scrapingSources.map(s => s.id)
          },
          { status: 404 }
        );
      }

      scrapingSources[sourceIndex] = {
        ...scrapingSources[sourceIndex],
        ...config,
        updatedAt: new Date().toISOString()
      };

      return NextResponse.json(scrapingSources[sourceIndex]);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error in scraping POST:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}