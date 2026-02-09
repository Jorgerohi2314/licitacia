import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name, jpath, isLeafNode, isAttribute) => {
    if (['entry', 'link', 'category', 'author'].includes(name)) return true;
    if (jpath.includes('content')) return true;
    return false;
  },
});

export interface AtomEntry {
  id: string | any;
  title: string | any;
  summary?: string | any;
  content?: string | any;
  updated: string;
  published?: string;
  link?: Array<{
    '@_href'?: string;
    '@_rel'?: string;
    '@_type'?: string;
  }>;
  author?: {
    name: string | any;
    uri?: string;
  };
  category?: Array<{
    '@_term'?: string;
    '@_scheme'?: string;
    '@_label'?: string;
  }>;
  codice?: any;
}

export interface AtomFeed {
  feed?: {
    '@_xmlns'?: string;
    '@_xmlns:atom'?: string;
    '@_xmlns:dc'?: string;
    title?: string;
    subtitle?: string;
    updated?: string;
    link?: Array<{
      '@_href'?: string;
      '@_rel'?: string;
      '@_type'?: string;
    }>;
    entry?: AtomEntry[];
  };
  entry?: AtomEntry[];
}

export function parseAtomXML(xmlString: string): AtomEntry[] {
  try {
    const result = parser.parse(xmlString);
    
    let entries: AtomEntry[] = [];
    
    if (result.feed && result.feed.entry) {
      entries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
    } else if (result.entry) {
      entries = Array.isArray(result.entry) ? result.entry : [result.entry];
    }
    
    const extractText = (value: any): string => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && value['#text']) return value['#text'];
      if (Array.isArray(value) && value[0] && typeof value[0] === 'object' && value[0]['#text']) return value[0]['#text'];
      return '';
    };

    return entries.map(entry => ({
      id: extractText(entry.id) || '',
      title: extractText(entry.title) || 'Sin título',
      summary: extractText(entry.summary) || extractText(entry.content) || '',
      updated: entry.updated || new Date().toISOString(),
      published: entry.published || entry.updated || new Date().toISOString(),
      link: entry.link || [],
      author: entry.author,
      category: entry.category || [],
      codice: entry.codice,
    }));
  } catch (error) {
    console.error('Error parsing Atom XML:', error);
    return [];
  }
}

export function extractLinkByRel(entry: AtomEntry, rel: string): string | null {
  if (!entry.link) return null;
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  const found = links.find(l => l['@_rel'] === rel);
  return found?.['@_href'] || null;
}

export function extractPrimaryLink(entry: AtomEntry): string {
  const alternateLink = extractLinkByRel(entry, 'alternate');
  if (alternateLink) return alternateLink;
  
  if (entry.link && Array.isArray(entry.link) && entry.link.length > 0) {
    return entry.link[0]['@_href'] || '';
  }
  
  if (entry.link && typeof entry.link === 'object' && entry.link['@_href']) {
    return entry.link['@_href'] || '';
  }
  
  return '';
}

export function extractCPVCodes(entry: AtomEntry): string[] {
  if (!entry.category) return [];
  
  const cpvScheme = 'http://cpv.data.europa.eu/cpv/';
  const categories = Array.isArray(entry.category) ? entry.category : [entry.category];
  
  return categories
    .filter(c => c['@_scheme']?.includes('cpv') || c['@_scheme']?.includes('CPV'))
    .map(c => c['@_term'])
    .filter((c): c is string => Boolean(c));
}

export function extractCPVCategory(cpvCode: string): string {
  if (!cpvCode || cpvCode.length < 2) return 'General';
  
  const firstTwoDigits = cpvCode.substring(0, 2);
  
  const cpvCategories: Record<string, string> = {
    '03': 'Agricultura',
    '09': 'Combustibles',
    '14': 'Minerales',
    '15': 'Productos alimenticios',
    '16': 'Productos agrarios',
    '18': 'Artículos de vestir',
    '19': 'Cuero y calzado',
    '21': 'Suministros domésticos',
    '22': 'Herramientas',
    '23': 'Equipos eléctricos',
    '24': 'Máquinas',
    '25': 'Suministros de calefacción',
    '30': 'Equipos informáticos',
    '31': 'Aparatos eléctricos',
    '32': 'Componentes electrónicos',
    '33': 'Instrumentos científicos',
    '34': 'Vehículos',
    '35': 'Equipos de defensa',
    '37': 'Instrumentos musicales',
    '38': 'Suministros de oficina',
    '39': 'Mobiliario',
    '41': 'Equipos de bombeo',
    '42': 'Componentes mecánicos',
    '43': 'Tuberías',
    '44': 'Material de construcción',
    '45': 'Construcción',
    '48': 'Software',
    '49': 'Servicios de TI',
    '50': 'Servicios de reparación',
    '51': 'Instalaciones',
    '55': 'Hoteles',
    '60': 'Servicios de transporte',
    '63': 'Servicios postales',
    '64': 'Servicios financieros',
    '65': 'Servicios inmobiliarios',
    '66': 'Servicios jurídicos',
    '67': 'Servicios contables',
    '70': 'Servicios de investigación',
    '71': 'Servicios arquitectónicos',
    '72': 'Servicios de ingeniería',
    '73': 'Publicidad',
    '74': 'Consultoría',
    '75': 'Administración',
    '76': 'Servicios policiales',
    '77': 'Servicios educativos',
    '78': 'Servicios sanitarios',
    '79': 'Servicios sociales',
    '80': 'Servicios de seguridad',
    '81': 'Servicios medioambientales',
    '82': 'Servicios recreativos',
    '85': 'Servicios de personal',
    '90': 'Servicios públicos',
    '92': 'Servicios de entretenimiento',
    '98': 'Otros servicios',
  };
  
  return cpvCategories[firstTwoDigits] || 'General';
}
