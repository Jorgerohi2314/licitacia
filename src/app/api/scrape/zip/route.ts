import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { scrapeZipFile, extractCodiceData, deduplicateEntries } from '../../../../lib/zip-scraper';
import { analyzeWithGroqAI } from '../../../../lib/tender-analysis';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting ZIP file scraping...');
    
    // Scrape the ZIP file
    const scrapingResult = await scrapeZipFile('./PlataformasAgregadasSinMenores_2026.zip');
    
    if (scrapingResult.errors.length > 0) {
      console.warn('Scraping completed with errors:', scrapingResult.errors);
    }
    
    // Deduplicate entries
    const uniqueEntries = deduplicateEntries(scrapingResult.entries);
    console.log(`Deduplicated ${scrapingResult.entries.length} entries to ${uniqueEntries.length} unique entries`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process entries in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < uniqueEntries.length; i += BATCH_SIZE) {
      const batch = uniqueEntries.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (entry) => {
        try {
          // Check if tender already exists
          const existingTender = await db.tender.findFirst({
            where: { 
              title: entry.title || 'Sin título',
              source: 'PlataformasAgregadas'
            }
          });
          
          if (existingTender) {
            skippedCount++;
            return;
          }
          
          // Extract CODICE data
          const codiceData = extractCodiceData(entry);
          
          // Prepare tender data
          const tenderData = {
            title: entry.title || 'Sin título',
            organization: codiceData?.contractingParty || 'Organización desconocida',
            description: entry.summary || '',
            source: 'PlataformasAgregadas',
            sourceUrl: entry.link?.find((l: any) => l['@_rel'] === 'alternate')?.['@_href'] || '',
            budget: codiceData?.estimatedAmount || 0,
            deadline: codiceData?.submissionDeadline 
              ? new Date(`${codiceData.submissionDeadline}T${codiceData.submissionTime || '23:59:59'}`) 
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            category: codiceData?.cpvCode || 'General',
            keywords: JSON.stringify([codiceData?.cpvCode, codiceData?.projectName, entry.title, codiceData?.region].filter(Boolean)),
            publishedAt: entry.published ? new Date(entry.published) : new Date(),
            region: codiceData?.region || 'Nacional',
          };
          
          // Create tender in database
          const tender = await db.tender.create({ data: tenderData });
          
          // Analyze tender with AI
          try {
            const analysis = await analyzeWithGroqAI(tender.title, tender.description, tender.budget);
            await db.tender.update({
              where: { id: tender.id },
              data: {
                aiCategory: analysis.category,
                aiSectorTags: JSON.stringify(analysis.sectorTags),
                aiSummary: analysis.summary,
                aiKeywords: JSON.stringify(analysis.keywords),
                aiRecommendations: JSON.stringify(analysis.recommendations),
                relevanceScore: analysis.relevanceScore,
                complexity: analysis.complexity,
                riskLevel: analysis.riskLevel,
                aiAnalyzedAt: new Date()
              }
            });
          } catch (analysisError) {
            console.error(`AI analysis failed for tender ${tender.id}:`, analysisError);
            errorCount++;
          }
          
          processedCount++;
          
        } catch (error) {
          console.error(`Error processing entry ${entry.id}:`, error);
          errorCount++;
        }
      }));
      
      // Add delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < uniqueEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\nProcessing Summary:`);
    console.log(`  Total entries: ${uniqueEntries.length}`);
    console.log(`  Processed: ${processedCount}`);
    console.log(`  Skipped (duplicates): ${skippedCount}`);
    console.log(`  Errors: ${errorCount}`);
    
    return NextResponse.json({
      success: true,
      message: 'ZIP file scraping completed',
      stats: {
        totalFiles: scrapingResult.totalFiles,
        processedFiles: scrapingResult.processedFiles.length,
        totalEntries: scrapingResult.totalEntries,
        uniqueEntries: uniqueEntries.length,
        processed: processedCount,
        skipped: skippedCount,
        errors: errorCount,
        scrapingErrors: scrapingResult.errors.length
      }
    });
    
  } catch (error) {
    console.error('Error in ZIP scraping endpoint:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el archivo ZIP' },
      { status: 500 }
    );
  }
}