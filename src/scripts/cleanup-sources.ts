import { db } from '@/lib/db';

// Fuentes a eliminar (no robustas)
const SOURCES_TO_REMOVE = [
  'boe',
  'doue', 
  'plataforma-contratacion',
  'cat',
  'madrid'
];

async function cleanupSources() {
  console.log('🧹 Limpiando fuentes de scraping no robustas...\n');

  for (const sourceId of SOURCES_TO_REMOVE) {
    try {
      // Verificar si existe
      const existing = await db.scrapingSource.findUnique({
        where: { id: sourceId }
      });

      if (existing) {
        // Eliminar la fuente
        await db.scrapingSource.delete({
          where: { id: sourceId }
        });
        console.log(`✅ Eliminada: ${existing.name} (${sourceId})`);
      } else {
        console.log(`ℹ️ No existe: ${sourceId}`);
      }
    } catch (error: any) {
      console.error(`❌ Error eliminando ${sourceId}:`, error.message);
    }
  }

  // Mostrar fuentes restantes
  const remainingSources = await db.scrapingSource.findMany();
  console.log('\n📊 Fuentes restantes en la base de datos:');
  remainingSources.forEach(source => {
    console.log(`  • ${source.name} (${source.id}) - ${source.active ? 'Activa' : 'Inactiva'}`);
  });

  console.log('\n✨ Limpieza completada!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanupSources()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { cleanupSources };
