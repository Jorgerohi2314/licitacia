import { Groq } from 'groq-sdk';

export interface TenderAnalysis {
  relevanceScore: number;
  sectorTags: string[];
  category: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  keywords: string[];
  requirements: string[];
  recommendations: string[];
}

export interface LocationInference {
  region: string | null;
  province: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

export interface SMEProfile {
  sectors: string[];
  minBudget?: number;
  maxBudget?: number;
  regions: string[];
  companySize?: 'micro' | 'small' | 'medium';
}

const SECTOR_KEYWORDS = {
  'Construcción': [
    'obras', 'edificación', 'rehabilitación', 'urbanización', 'infraestructura',
    'cemento', 'hormigón', 'albañilería', 'fontanería', 'electricidad', 'carpintería'
  ],
  'Tecnología e IT': [
    'software', 'desarrollo', 'aplicación', 'plataforma', 'sistema informático',
    'tic', 'digital', 'tecnología', 'tecnologías', 'servicio técnico', 'equipos informáticos'
  ],
  'Consultoría': [
    'consultoría', 'asesoramiento', 'asesoría', 'estudio', 'informe', 'análisis',
    'auditoría', 'evaluación', 'planificación'
  ],
  'Suministros Médicos': [
    'sanidad', 'salud', 'hospital', 'médico', 'farmacéutico', 'equipamiento médico',
    'material sanitario', 'productos sanitarios'
  ],
  'Servicios Generales': [
    'limpieza', 'seguridad', 'mantenimiento', 'vigilancia', 'catering', 'hostelería',
    'mensajería', 'transporte'
  ],
  'Energía y Medio Ambiente': [
    'energía', 'renovable', 'solar', 'eólica', 'medio ambiente', 'residuos',
    'reciclaje', 'tratamiento', 'contaminación'
  ],
  'Educación': [
    'educación', 'enseñanza', 'formación', 'curso', 'capacitación', 'docente',
    'escuela', 'universidad', 'colegio', 'formación profesional'
  ],
};

export function classifyByKeywords(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const sectors: string[] = [];
  
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    const matches = keywords.filter(kw => text.includes(kw.toLowerCase()));
    if (matches.length > 0) {
      sectors.push(sector);
    }
  }
  
  return sectors.length > 0 ? sectors : ['General'];
}

export function calculateRelevanceScore(
  sectors: string[],
  userSectors: string[],
  budget: number | null,
  minBudget: number | undefined,
  maxBudget: number | undefined,
  keywords: string[]
): number {
  let score = 0;
  
  const sectorMatch = sectors.some(s => userSectors.some(us => 
    s.toLowerCase().includes(us.toLowerCase()) || us.toLowerCase().includes(s.toLowerCase())
  ));
  if (sectorMatch) score += 40;
  
  if (budget && minBudget && budget >= minBudget) score += 20;
  if (budget && maxBudget && budget <= maxBudget) score += 10;
  
  const keywordMatch = keywords.filter(kw => 
    sectors.some(s => s.toLowerCase().includes(kw.toLowerCase()))
  ).length;
  score += Math.min(keywordMatch * 5, 30);
  
  return Math.min(score, 100);
}

export function assessRiskLevel(
  budget: number | null,
  complexity: string,
  requirements: string[]
): 'LOW' | 'MEDIUM' | 'HIGH' {
  let riskScore = 0;
  
  if (budget && budget > 500000) riskScore += 2;
  else if (budget && budget > 100000) riskScore += 1;
  
  if (complexity === 'HIGH') riskScore += 2;
  else if (complexity === 'MEDIUM') riskScore += 1;
  
  if (requirements.length > 10) riskScore += 2;
  else if (requirements.length > 5) riskScore += 1;
  
  if (riskScore >= 4) return 'HIGH';
  if (riskScore >= 2) return 'MEDIUM';
  return 'LOW';
}

export function assessComplexity(
  budget: number | null,
  description: string,
  requirements: string[]
): 'LOW' | 'MEDIUM' | 'HIGH' {
  let complexityScore = 0;
  
  if (budget && budget > 200000) complexityScore += 2;
  else if (budget && budget > 50000) complexityScore += 1;
  
  const descLength = description.length;
  if (descLength > 2000) complexityScore += 2;
  else if (descLength > 1000) complexityScore += 1;
  
  if (requirements.length > 8) complexityScore += 2;
  else if (requirements.length > 4) complexityScore += 1;
  
  if (complexityScore >= 4) return 'HIGH';
  if (complexityScore >= 2) return 'MEDIUM';
  return 'LOW';
}

export async function analyzeWithAI(
  title: string,
  description: string,
  budget: number | null,
  profile?: SMEProfile
): Promise<TenderAnalysis> {
  const sectors = classifyByKeywords(title, description);
  const category = sectors[0] || 'General';
  
  const complexity = assessComplexity(budget, description, []);
  const riskLevel = assessRiskLevel(budget, complexity, []);
  
  const relevanceScore = profile 
    ? calculateRelevanceScore(sectors, profile.sectors, budget, profile.minBudget, profile.maxBudget, [])
    : 50;
  
  const keywords = extractKeywords(title, description);
  
  return {
    relevanceScore,
    sectorTags: sectors,
    category,
    riskLevel,
    complexity,
    summary: generateSummary(title, description, budget),
    keywords,
    requirements: [],
    recommendations: generateRecommendations(category, budget, riskLevel),
  };
}

export async function analyzeWithGroqAI(
  title: string,
  description: string,
  budget: number | null,
  profile?: SMEProfile
): Promise<TenderAnalysis> {
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set, using local analysis');
    return analyzeWithAI(title, description, budget, profile);
  }
  
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const profileStr = profile 
      ? `
Sectores de interés: ${profile.sectors.join(', ')}
Presupuesto mínimo: ${profile.minBudget || 'No especificado'}
Presupuesto máximo: ${profile.maxBudget || 'No especificado'}
Regiones: ${profile.regions.join(', ')}
Tamaño empresa: ${profile.companySize || 'No especificado'}
      `.trim()
      : 'Perfil no especificado';
    
    const prompt = `
Analiza la siguiente licitación pública y genera un análisis estructurado.

DATOS DE LA LICITACIÓN:
Título: ${title}
Descripción: ${description}
Presupuesto: ${budget ? `€${budget.toLocaleString()}` : 'No especificado'}

PERFIL DE LA PYME:
${profileStr}

INSTRUCCIONES:
1. Clasifica la licitación en uno de estos sectores: Construcción, Tecnología e IT, Consultoría, Suministros Médicos, Servicios Generales, Energía y Medio Ambiente, Educación, General
2. Evalúa la relevancia para la PYME (0-100)
3. Evalúa el nivel de riesgo (LOW, MEDIUM, HIGH)
4. Evalúa la complejidad (LOW, MEDIUM, HIGH)
5. Genera un resumen ejecutivo de 1-2 frases
6. Extrae 5-10 palabras clave relevantes
7. Genera 3-5 recomendaciones para la empresa

RESPONDE ÚNICAMENTE con JSON válido en este formato exacto:
{
  "relevanceScore": number (0-100),
  "sectorTags": string[],
  "category": string,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "complexity": "LOW" | "MEDIUM" | "HIGH",
  "summary": string (1-2 frases),
  "keywords": string[],
  "requirements": string[],
  "recommendations": string[]
}
    `.trim();
    
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Eres un analista experto en licitaciones públicas. Responde ÚNICAMENTE con JSON válido, sin markdown ni explicaciones.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from Groq');
    
    const analysis = JSON.parse(content);
    
    return {
      relevanceScore: Math.min(Math.max(analysis.relevanceScore || 50, 0), 100),
      sectorTags: Array.isArray(analysis.sectorTags) ? analysis.sectorTags : [analysis.category || 'General'],
      category: analysis.category || 'General',
      riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(analysis.riskLevel) ? analysis.riskLevel : 'MEDIUM',
      complexity: ['LOW', 'MEDIUM', 'HIGH'].includes(analysis.complexity) ? analysis.complexity : 'MEDIUM',
      summary: analysis.summary || generateSummary(title, description, budget),
      keywords: Array.isArray(analysis.keywords) ? analysis.keywords : extractKeywords(title, description),
      requirements: Array.isArray(analysis.requirements) ? analysis.requirements : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
    };
  } catch (error) {
    console.error('Error using Groq AI, falling back to local analysis:', error);
    return analyzeWithAI(title, description, budget, profile);
  }
}

function extractKeywords(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const keywords: string[] = [];
  
  const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'por', 'para', 'con', 'sin', 'sobre', 'entre', 'y', 'o', 'pero', 'si', 'no', 'que', 'como', 'donde', 'cuando', 'a', 'al'];
  
  const words = text.split(/\s+/)
    .map(w => w.replace(/[^\wáéíóúñü]/g, ''))
    .filter(w => w.length > 3 && !stopWords.includes(w));
  
  const wordCount = new Map<string, number>();
  words.forEach(w => wordCount.set(w, (wordCount.get(w) || 0) + 1));
  
  const sorted = [...wordCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(e => e[0]);
  
  return sorted;
}

function generateSummary(title: string, description: string, budget: number | null): string {
  const budgetStr = budget ? `con un presupuesto de €${budget.toLocaleString()}` : '';
  const descPreview = description.length > 150 ? description.substring(0, 150) + '...' : description;
  
  return `${title} ${budgetStr}. ${descPreview}`.trim();
}

function generateRecommendations(category: string, budget: number | null, riskLevel: string): string[] {
  const recommendations: string[] = [];
  
  if (riskLevel === 'HIGH') {
    recommendations.push('Evaluar capacidad técnica y financiera antes de licitar');
    recommendations.push('Considerar alianza con otras empresas para reducir riesgo');
  }
  
  if (budget && budget > 100000) {
    recommendations.push('Revisar requisitos de solvencia económica y técnica');
    recommendations.push('Preparar documentación de clasificación empresarial si es necesario');
  }
  
  if (category === 'Construcción') {
    recommendations.push('Verificar disponibilidad de maquinaria y personal cualificado');
    recommendations.push('Revisar pliegos de condiciones técnicas con detalle');
  }
  
  if (category === 'Tecnología e IT') {
    recommendations.push('Documentar experiencia en proyectos similares');
    recommendations.push('Revisar requisitos de seguridad y protección de datos');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Revisar pliego de cláusulas administrativas');
    recommendations.push('Preparar oferta técnica y económica detallada');
  }
  
  return recommendations.slice(0, 5);
}

export async function inferLocationWithGroqAI(
  title: string,
  description: string,
  organization: string
): Promise<LocationInference> {
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set, cannot infer location');
    return {
      region: null,
      province: null,
      confidence: 'LOW',
      reasoning: 'API key not configured'
    };
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `
Analiza la siguiente licitación pública y determina en qué comunidad autónoma y provincia de España se desarrolla la actividad.

DATOS DE LA LICITACIÓN:
Título: ${title}
Órgano de contratación: ${organization}
Descripción: ${description}

INSTRUCCIONES:
1. Analiza el texto para identificar ubicaciones geográficas mencionadas (ciudades, provincias, comunidades autónomas, direcciones)
2. Si el órgano de contratación es una universidad, ayuntamiento, hospital, o institución pública, infiere la ubicación basándote en el nombre
3. Si la licitación menciona lugares específicos donde se ejecutarán las obras/servicios, usa esa información
4. Considera palabras clave regionales, direcciones completas, o referencias geográficas

COMUNIDADES AUTÓNOMAS DE ESPAÑA:
- Andalucía (Almería, Cádiz, Córdoba, Granada, Huelva, Jaén, Málaga, Sevilla)
- Aragón (Huesca, Teruel, Zaragoza)
- Asturias (Oviedo, Gijón, Avilés)
- Islas Baleares (Palma, Ibiza, Menorca)
- Canarias (Las Palmas de Gran Canaria, Santa Cruz de Tenerife)
- Cantabria (Santander, Torrelavega)
- Castilla y León (Ávila, Burgos, León, Palencia, Salamanca, Segovia, Soria, Valladolid, Zamora)
- Castilla-La Mancha (Albacete, Ciudad Real, Cuenca, Guadalajara, Toledo)
- Cataluña (Barcelona, Girona, Lleida, Tarragona)
- Extremadura (Badajoz, Cáceres)
- Galicia (A Coruña, Lugo, Ourense, Pontevedra)
- Madrid (Madrid capital y provincia)
- Murcia (Murcia capital y provincia)
- Navarra (Pamplona, Tudela)
- País Vasco (Álava, Guipúzcoa, Vizcaya - Vitoria, San Sebastián, Bilbao)
- La Rioja (Logroño, Calahorra)
- Comunidad Valenciana (Alicante, Castellón, Valencia)
- Ceuta
- Melilla

RESPONDE ÚNICAMENTE con JSON válido en este formato exacto:
{
  "region": "Nombre de la comunidad autónoma o null si no se puede determinar",
  "province": "Nombre de la provincia o null si no se puede determinar",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "Breve explicación de por qué se ha determinado esta ubicación (1-2 frases)"
}

Reglas:
- "region" debe ser exactamente uno de los nombres de comunidades autónomas listados arriba
- "province" debe ser el nombre de la provincia correspondiente
- "confidence": HIGH si hay información clara y directa, MEDIUM si es inferencia razonable, LOW si es especulativa
- Si no puedes determinar la ubicación con certeza, usa null para region y province
    `.trim();

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en geografía española y licitaciones públicas. Tu tarea es determinar la ubicación geográfica de licitaciones analizando el texto. Responde ÚNICAMENTE con JSON válido.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from Groq');

    const result = JSON.parse(content);

    // Validar y normalizar el resultado
    const validRegions = [
      'Andalucía', 'Aragón', 'Asturias', 'Islas Baleares', 'Canarias',
      'Cantabria', 'Castilla y León', 'Castilla-La Mancha', 'Cataluña',
      'Extremadura', 'Galicia', 'Madrid', 'Murcia', 'Navarra', 'País Vasco',
      'La Rioja', 'Comunidad Valenciana', 'Ceuta', 'Melilla'
    ];

    const region = validRegions.includes(result.region) ? result.region : null;
    const province = result.province && typeof result.province === 'string' ? result.province : null;
    const confidence = ['HIGH', 'MEDIUM', 'LOW'].includes(result.confidence) ? result.confidence : 'LOW';

    return {
      region,
      province,
      confidence,
      reasoning: result.reasoning || 'Sin explicación disponible'
    };

  } catch (error) {
    console.error('Error inferring location with Groq AI:', error);
    return {
      region: null,
      province: null,
      confidence: 'LOW',
      reasoning: `Error en la inferencia: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Función para inferir ubicación basada en reglas simples (fallback)
export function inferLocationByRules(
  title: string,
  description: string,
  organization: string
): LocationInference {
  const text = `${title} ${description} ${organization}`.toLowerCase();

  // Mapeo de palabras clave a ubicaciones
  const locationKeywords: Record<string, { region: string; provinces: string[] }> = {
    // Andalucía
    'andalucía': { region: 'Andalucía', provinces: [] },
    'almería': { region: 'Andalucía', provinces: ['Almería'] },
    'cádiz': { region: 'Andalucía', provinces: ['Cádiz'] },
    'córdoba': { region: 'Andalucía', provinces: ['Córdoba'] },
    'granada': { region: 'Andalucía', provinces: ['Granada'] },
    'huelva': { region: 'Andalucía', provinces: ['Huelva'] },
    'jaén': { region: 'Andalucía', provinces: ['Jaén'] },
    'málaga': { region: 'Andalucía', provinces: ['Málaga'] },
    'sevilla': { region: 'Andalucía', provinces: ['Sevilla'] },
    
    // Cataluña
    'cataluña': { region: 'Cataluña', provinces: [] },
    'barcelona': { region: 'Cataluña', provinces: ['Barcelona'] },
    'girona': { region: 'Cataluña', provinces: ['Girona'] },
    'lleida': { region: 'Cataluña', provinces: ['Lleida'] },
    'tarragona': { region: 'Cataluña', provinces: ['Tarragona'] },
    
    // Madrid
    'madrid': { region: 'Madrid', provinces: ['Madrid'] },
    
    // Comunidad Valenciana
    'valencia': { region: 'Comunidad Valenciana', provinces: ['Valencia', 'Castellón', 'Alicante'] },
    'alicante': { region: 'Comunidad Valenciana', provinces: ['Alicante'] },
    'castellón': { region: 'Comunidad Valenciana', provinces: ['Castellón'] },
    
    // País Vasco
    'país vasco': { region: 'País Vasco', provinces: [] },
    'euskadi': { region: 'País Vasco', provinces: [] },
    'bilbao': { region: 'País Vasco', provinces: ['Vizcaya'] },
    'vizcaya': { region: 'País Vasco', provinces: ['Vizcaya'] },
    'gipuzkoa': { region: 'País Vasco', provinces: ['Guipúzcoa'] },
    'guipúzcoa': { region: 'País Vasco', provinces: ['Guipúzcoa'] },
    'álava': { region: 'País Vasco', provinces: ['Álava'] },
    
    // Galicia
    'galicia': { region: 'Galicia', provinces: [] },
    'a coruña': { region: 'Galicia', provinces: ['A Coruña'] },
    'lugo': { region: 'Galicia', provinces: ['Lugo'] },
    'ourense': { region: 'Galicia', provinces: ['Ourense'] },
    'pontevedra': { region: 'Galicia', provinces: ['Pontevedra'] },
    
    // Castilla y León
    'castilla y león': { region: 'Castilla y León', provinces: [] },
    'burgos': { region: 'Castilla y León', provinces: ['Burgos'] },
    'león': { region: 'Castilla y León', provinces: ['León'] },
    'salamanca': { region: 'Castilla y León', provinces: ['Salamanca'] },
    'segovia': { region: 'Castilla y León', provinces: ['Segovia'] },
    'soria': { region: 'Castilla y León', provinces: ['Soria'] },
    'valladolid': { region: 'Castilla y León', provinces: ['Valladolid'] },
    'ávila': { region: 'Castilla y León', provinces: ['Ávila'] },
    'palencia': { region: 'Castilla y León', provinces: ['Palencia'] },
    'zamora': { region: 'Castilla y León', provinces: ['Zamora'] },
    
    // Aragón
    'aragón': { region: 'Aragón', provinces: [] },
    'zaragoza': { region: 'Aragón', provinces: ['Zaragoza'] },
    'huesca': { region: 'Aragón', provinces: ['Huesca'] },
    'teruel': { region: 'Aragón', provinces: ['Teruel'] },
    
    // Murcia
    'murcia': { region: 'Murcia', provinces: ['Murcia'] },
    
    // Extremadura
    'extremadura': { region: 'Extremadura', provinces: [] },
    'badajoz': { region: 'Extremadura', provinces: ['Badajoz'] },
    'cáceres': { region: 'Extremadura', provinces: ['Cáceres'] },
    
    // Asturias
    'asturias': { region: 'Asturias', provinces: ['Asturias'] },
    'oviedo': { region: 'Asturias', provinces: ['Asturias'] },
    'gijón': { region: 'Asturias', provinces: ['Asturias'] },
    
    // Canarias
    'canarias': { region: 'Canarias', provinces: [] },
    'tenerife': { region: 'Canarias', provinces: ['Santa Cruz de Tenerife'] },
    'gran canaria': { region: 'Canarias', provinces: ['Las Palmas'] },
    'lanzarote': { region: 'Canarias', provinces: ['Las Palmas'] },
    'fuerteventura': { region: 'Canarias', provinces: ['Las Palmas'] },
    
    // Castilla-La Mancha
    'castilla-la mancha': { region: 'Castilla-La Mancha', provinces: [] },
    'toledo': { region: 'Castilla-La Mancha', provinces: ['Toledo'] },
    'ciudad real': { region: 'Castilla-La Mancha', provinces: ['Ciudad Real'] },
    'guadalajara': { region: 'Castilla-La Mancha', provinces: ['Guadalajara'] },
    'cuenca': { region: 'Castilla-La Mancha', provinces: ['Cuenca'] },
    'albacete': { region: 'Castilla-La Mancha', provinces: ['Albacete'] },
    
    // Navarra
    'navarra': { region: 'Navarra', provinces: ['Navarra'] },
    'pamplona': { region: 'Navarra', provinces: ['Navarra'] },
    
    // Cantabria
    'cantabria': { region: 'Cantabria', provinces: ['Cantabria'] },
    'santander': { region: 'Cantabria', provinces: ['Cantabria'] },
    
    // La Rioja
    'la rioja': { region: 'La Rioja', provinces: ['La Rioja'] },
    'logroño': { region: 'La Rioja', provinces: ['La Rioja'] },
    
    // Islas Baleares
    'baleares': { region: 'Islas Baleares', provinces: ['Islas Baleares'] },
    'mallorca': { region: 'Islas Baleares', provinces: ['Islas Baleares'] },
    'menorca': { region: 'Islas Baleares', provinces: ['Islas Baleares'] },
    'ibiza': { region: 'Islas Baleares', provinces: ['Islas Baleares'] },
  };

  for (const [keyword, location] of Object.entries(locationKeywords)) {
    if (text.includes(keyword.toLowerCase())) {
      return {
        region: location.region,
        province: location.provinces.length === 1 ? location.provinces[0] : null,
        confidence: 'MEDIUM',
        reasoning: `Detectada referencia a "${keyword}" en el texto`
      };
    }
  }

  return {
    region: null,
    province: null,
    confidence: 'LOW',
    reasoning: 'No se encontraron referencias geográficas claras en el texto'
  };
}

export { analyzeWithAI as default };
