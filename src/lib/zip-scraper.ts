import { promises as fs } from 'fs';
import path from 'path';
import { parseAtomXML, AtomEntry } from './parser';
import { extractRegionFromTender } from './regions';

export interface ZipScrapingResult {
  totalFiles: number;
  totalEntries: number;
  processedFiles: string[];
  errors: string[];
  entries: AtomEntry[];
}

export async function scrapeZipFile(zipPath: string): Promise<ZipScrapingResult> {
  const result: ZipScrapingResult = {
    totalFiles: 0,
    totalEntries: 0,
    processedFiles: [],
    errors: [],
    entries: []
  };

  try {
    // Get all .atom files from the directory
    const directory = path.dirname(zipPath);
    const files = await fs.readdir(directory);
    const atomFiles = files.filter(file => file.endsWith('.atom'));
    
    result.totalFiles = atomFiles.length;
    console.log(`Found ${atomFiles.length} .atom files to process`);

    // Process each .atom file
    for (const atomFile of atomFiles) {
      try {
        const filePath = path.join(directory, atomFile);
        console.log(`Processing ${atomFile}...`);
        
        // Read the file content
        const xmlContent = await fs.readFile(filePath, 'utf-8');
        
        // Parse the XML content
        const entries = parseAtomXML(xmlContent);
        
        console.log(`  Found ${entries.length} entries in ${atomFile}`);
        
        // Add entries to result
        result.entries.push(...entries);
        result.totalEntries += entries.length;
        result.processedFiles.push(atomFile);
        
      } catch (error) {
        const errorMsg = `Error processing ${atomFile}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    console.log(`\nScraping Summary:`);
    console.log(`  Total files: ${result.totalFiles}`);
    console.log(`  Processed files: ${result.processedFiles.length}`);
    console.log(`  Total entries: ${result.totalEntries}`);
    console.log(`  Errors: ${result.errors.length}`);

    return result;
    
  } catch (error) {
    const errorMsg = `Error scraping ZIP file: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
    return result;
  }
}

export function extractCodiceData(entry: AtomEntry): any {
  if (!entry.codice) return null;
  
  // Extract relevant CODICE data from the entry
  const codice = entry.codice;
  
  const codiceData: any = {
    contractingParty: codice['cac-place-ext:LocatedContractingParty']?.['cac:Party']?.['cac:PartyName']?.['cbc:Name'] || '',
    projectName: codice['cac:ProcurementProject']?.['cbc:Name'] || entry.title,
    contractType: codice['cac:ProcurementProject']?.['cbc:TypeCode'] || '',
    estimatedAmount: codice['cac:ProcurementProject']?.['cac:BudgetAmount']?.['cbc:EstimatedOverallContractAmount']?.['@_currencyID'] === 'EUR' 
      ? parseFloat(codice['cac:ProcurementProject']['cac:BudgetAmount']['cbc:EstimatedOverallContractAmount']['#text'] || '0')
      : 0,
    cpvCode: codice['cac:ProcurementProject']?.['cac:RequiredCommodityClassification']?.['cbc:ItemClassificationCode']?.['#text'] || '',
    nutsCode: codice['cac:ProcurementProject']?.['cac:RealizedLocation']?.['cbc:CountrySubentityCode']?.['#text'] || '',
    durationDays: codice['cac:ProcurementProject']?.['cac:PlannedPeriod']?.['cbc:DurationMeasure']?.['#text'] || '',
    submissionDeadline: codice['cac:TenderingProcess']?.['cac:TenderSubmissionDeadlinePeriod']?.['cbc:EndDate'] || '',
    submissionTime: codice['cac:TenderingProcess']?.['cac:TenderSubmissionDeadlinePeriod']?.['cbc:EndTime'] || '',
    fundingPrograms: Array.isArray(codice['cac:TenderingTerms']?.['cbc:FundingProgramCode'])
      ? codice['cac:TenderingTerms']['cbc:FundingProgramCode'].map((code: any) => code['@_name'] || '').filter(Boolean)
      : codice['cac:TenderingTerms']?.['cbc:FundingProgramCode']?.['@_name'] 
        ? [codice['cac:TenderingTerms']['cbc:FundingProgramCode']['@_name']]
        : [],
    procedureCode: codice['cac:TenderingProcess']?.['cbc:ProcedureCode']?.['#text'] || '',
    urgencyCode: codice['cac:TenderingProcess']?.['cbc:UrgencyCode']?.['#text'] || '',
    noticeType: codice['cac-place-ext:ValidNoticeInfo']?.['cbc-place-ext:NoticeTypeCode']?.['#text'] || ''
  };

  // Add region extraction
  codiceData.region = extractRegionFromTender({
    title: entry.title,
    description: entry.summary || '',
    nutsCode: codiceData.nutsCode,
    metadata: { codice }
  });

  return codiceData;
}

export function deduplicateEntries(entries: AtomEntry[]): AtomEntry[] {
  const seen = new Set<string>();
  return entries.filter(entry => {
    const id = typeof entry.id === 'string' ? entry.id : entry.id?.['#text'] || '';
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}