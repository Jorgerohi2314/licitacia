import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'sources') {
      // Devolver fuentes de scraping configuradas
      return NextResponse.json(scrapingSources);
    }

    if (action === 'status') {
      // Devolver estado del scraping
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

    // Por defecto, listar últimos tenders persistidos (scrapeados) desde BD
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

const ScrapeBody = z.object({
  action: z.enum(['scrape', 'configure']),
  sourceId: z.string().optional(),
  config: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = ScrapeBody.parse(json);
    const { action, sourceId, config } = body;

    if (action === 'scrape') {
      if (!sourceId) {
        return NextResponse.json({ error: 'sourceId requerido' }, { status: 400 });
      }

      // Scraper inicial: Plataforma de Contratación del Sector Público (PCSP) API pública TED/PCSP si disponible o RSS/HTML
      // Para PoC, usamos una URL configurable y parseo básico JSON/Atom.
      const endpoint = process.env.PCSP_FEED_URL || '';
      if (!endpoint) {
        return NextResponse.json({ error: 'Configura PCSP_FEED_URL en entorno' }, { status: 500 });
      }

      const res = await fetch(endpoint, { headers: { 'Accept': 'application/json, application/atom+xml;q=0.9' } });
      const text = await res.text();

      const items = tryParseJsonArray(text) ?? extractItemsFromAtom(text);

      let totalFound = 0;
      let newTenders = 0;
      let updatedTenders = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          totalFound += 1;
          const normalized = normalizePcspItem(item);

          // upsert por combinación única source+sourceUrl o title+publishedAt
          const existing = await db.tender.findFirst({
            where: {
              OR: [
                { AND: [{ source: normalized.source }, { sourceUrl: normalized.sourceUrl }] },
                { AND: [{ title: normalized.title }, { publishedAt: new Date(normalized.publishedAt) }] },
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
          errors.push(e?.message || 'error procesando item');
        }
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
      // Configurar fuente de scraping
      const sourceIndex = scrapingSources.findIndex(s => s.id === sourceId);
      
      if (sourceIndex === -1) {
        return NextResponse.json(
          { error: 'Source not found' },
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
  } catch (error) {
    console.error('Error in scraping POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function tryParseJsonArray(text: string): any[] | null {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any).items)) return (data as any).items;
    return null;
  } catch {
    return null;
  }
}

function extractItemsFromAtom(xml: string): any[] {
  // Parser simple por regex para PoC; para producción usar xml2js/fast-xml-parser
  const entries = xml.split('<entry').slice(1);
  return entries.map(e => ({ raw: e })).slice(0, 50);
}

function normalizePcspItem(item: any) {
  // Normalización defensiva: asumir JSON con campos típicos; fallback si viene de Atom
  const isXml = !!item.raw;
  const title = isXml ? extractBetween(item.raw, '<title>', '</title>') : (item.title || '');
  const published = isXml ? extractBetween(item.raw, '<updated>', '</updated>') : (item.publishedAt || item.pubDate || new Date().toISOString());
  const link = isXml ? extractBetween(item.raw, '<link rel="alternate" href="', '"') : (item.link || item.url || '');
  const summary = isXml ? extractBetween(item.raw, '<summary>', '</summary>') : (item.summary || '');
  const org = item.organization || item.author || '';
  const budget = Number(item.budget || item.amount || NaN);
  const deadline = item.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const category = item.category || 'General';
  const description = item.description || summary || title;
  const keywords: string[] = [];
  return {
    title: String(title).trim(),
    organization: String(org || 'Organismo público').trim(),
    budget: Number.isNaN(budget) ? undefined : budget,
    deadline,
    category,
    description,
    summary: summary || undefined,
    keywords,
    source: 'PCSP',
    sourceUrl: link || undefined,
    publishedAt: published,
  };
}

function extractBetween(text: string, start: string, end: string): string {
  const s = text.indexOf(start);
  if (s === -1) return '';
  const e = text.indexOf(end, s + start.length);
  if (e === -1) return '';
  return text.substring(s + start.length, e).replace(/<[^>]+>/g, '').trim();
}