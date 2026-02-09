import { scrapeAtomFeed } from '../app/api/scrape/route';
import { db } from '../lib/db';

export async function runDailyScrape() {
  console.log('Starting daily scrape...');

  // Seed sources if not exist
  const existingSources = await db.scrapingSource.findMany();
  if (existingSources.length === 0) {
    console.log('Seeding initial scraping sources...');
    const initialSources = [
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
      },
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
    await db.scrapingSource.createMany({
      data: initialSources.map(s => ({
        ...s,
        type: s.type as string,
      }))
    });
  }

  const sources = ['contratos-menores', 'licitaciones-completo', 'plataformas-agregadas'];

  const endpoints: Record<string, string> = {
    'contratos-menores': 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1143/contratosMenoresPerfilesContratantes.atom',
    'licitaciones-completo': 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
    'plataformas-agregadas': 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1044/PlataformasAgregadasSinMenores.atom',
  };

  for (const sourceId of sources) {
    try {
      console.log(`Scraping ${sourceId}...`);
      const result = await scrapeAtomFeed(sourceId, endpoints[sourceId]);

      // Update source stats
      await db.scrapingSource.update({
        where: { id: sourceId },
        data: {
          lastScraped: new Date(),
          totalTenders: { increment: result.newTenders }
        }
      });

      console.log(`Completed ${sourceId}: ${result.newTenders} new, ${result.updatedTenders} updated`);
    } catch (error) {
      console.error(`Error scraping ${sourceId}:`, error);
    }
  }

  console.log('Daily scrape completed.');
}

// If run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runDailyScrape().catch(console.error);
}