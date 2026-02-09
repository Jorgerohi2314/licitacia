import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const INITIAL_SOURCES = [
  { id: 'boe', name: 'Boletín Oficial del Estado', url: 'https://www.boe.es/', type: 'boe', region: null, active: true },
  { id: 'doue', name: 'Diario Oficial de la Unión Europea', url: 'https://ted.europa.eu/', type: 'doue', region: null, active: true },
  { id: 'plataforma-contratacion', name: 'Plataforma de Contratación del Sector Público', url: 'https://contrataciondelestado.es/', type: 'platform', region: null, active: true },
  { id: 'cat', name: 'Plataforma de Contratación de Cataluña', url: 'https://contractaciopublica.gencat.cat/', type: 'regional', region: 'Cataluña', active: true },
  { id: 'madrid', name: 'Plataforma de Contratación de la Comunidad de Madrid', url: 'https://contratos-publicos.comunidad.madrid/perfil-contratante/publicidad-contrataciones/rss-suscripcion-contrataciones', type: 'regional', region: 'Madrid', active: false },
  { id: 'valencia', name: 'Plataforma de Contratación de la Comunidad Valenciana', url: 'https://www.contratacion.gva.es/', type: 'regional', region: 'Comunidad Valenciana', active: false },
  { id: 'contratos-menores', name: 'Contratos Menores Perfiles Contratantes', url: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1143/contratosMenoresPerfilesContratantes.atom', type: 'platform', region: null, active: true },
  { id: 'licitaciones-completo', name: 'Licitaciones Perfiles Contratante Completo', url: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom', type: 'platform', region: null, active: true },
  { id: 'plataformas-agregadas', name: 'Plataformas Agregadas Sin Menores', url: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1044/PlataformasAgregadasSinMenores.atom', type: 'platform', region: null, active: true },
];

export async function POST(request: NextRequest) {
  try {
    let sources = await db.scrapingSource.findMany();

    if (sources.length === 0) {
      console.log('Seeding initial scraping sources...');
      await db.scrapingSource.createMany({
        data: INITIAL_SOURCES.map(s => ({
          ...s,
          type: s.type as string,
        }))
      });
      sources = await db.scrapingSource.findMany();
      return NextResponse.json({ message: 'Sources seeded successfully', sources });
    } else {
      return NextResponse.json({ message: 'Sources already exist', sources });
    }
  } catch (error: any) {
    console.error('Error seeding sources:', error);
    return NextResponse.json({ error: 'Failed to seed sources', details: error.message }, { status: 500 });
  }
}