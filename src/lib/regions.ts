// Mapeo de códigos NUTS a Comunidades Autónomas de España
export const NUTS_TO_REGION: Record<string, string> = {
  // NUTS-1
  'ES1': 'Noroeste',
  'ES2': 'Noreste', 
  'ES3': 'Madrid',
  'ES4': 'Centro',
  'ES5': 'Este',
  'ES6': 'Sur',
  'ES7': 'Canarias',

  // NUTS-2 (Comunidades Autónomas)
  'ES11': 'Galicia',
  'ES12': 'Principado de Asturias',
  'ES13': 'Cantabria',
  'ES21': 'País Vasco',
  'ES22': 'Comunidad Foral de Navarra',
  'ES23': 'La Rioja',
  'ES24': 'Aragón',
  'ES30': 'Comunidad de Madrid',
  'ES41': 'Castilla y León',
  'ES42': 'Castilla-La Mancha',
  'ES43': 'Extremadura',
  'ES51': 'Cataluña',
  'ES52': 'Comunidad Valenciana',
  'ES53': 'Illes Balears',
  'ES61': 'Andalucía',
  'ES62': 'Región de Murcia',
  'ES63': 'Ciudad Autónoma de Ceuta',
  'ES64': 'Ciudad Autónoma de Melilla',
  'ES70': 'Canarias',

  // NUTS-3 (Provincias - algunas mapeadas directamente)
  'ES111': 'A Coruña',
  'ES112': 'Lugo',
  'ES113': 'Ourense',
  'ES114': 'Pontevedra',
  'ES120': 'Principado de Asturias',
  'ES130': 'Cantabria',
  'ES211': 'Álava',
  'ES212': 'Guipúzcoa',
  'ES213': 'Vizcaya',
  'ES220': 'Comunidad Foral de Navarra',
  'ES230': 'La Rioja',
  'ES241': 'Huesca',
  'ES242': 'Teruel',
  'ES243': 'Zaragoza',
  'ES300': 'Comunidad de Madrid',
  'ES411': 'León',
  'ES412': 'Asturias',
  'ES413': 'Burgos',
  'ES414': 'Palencia',
  'ES415': 'Valladolid',
  'ES416': 'Zamora',
  'ES417': 'Soria',
  'ES418': 'Segovia',
  'ES419': 'Ávila',
  'ES421': 'Toledo',
  'ES422': 'Ciudad Real',
  'ES423': 'Cuenca',
  'ES424': 'Guadalajara',
  'ES425': 'Albacete',
  'ES431': 'Badajoz',
  'ES432': 'Cáceres',
  'ES511': 'Barcelona',
  'ES512': 'Girona',
  'ES513': 'Lleida',
  'ES514': 'Tarragona',
  'ES521': 'Alicante',
  'ES522': 'Castellón',
  'ES523': 'Valencia',
  'ES531': 'Illes Balears',
  'ES611': 'Almería',
  'ES612': 'Cádiz',
  'ES613': 'Córdoba',
  'ES614': 'Granada',
  'ES615': 'Huelva',
  'ES616': 'Jaén',
  'ES617': 'Málaga',
  'ES618': 'Sevilla',
  'ES620': 'Región de Murcia',
  'ES630': 'Ciudad Autónoma de Ceuta',
  'ES640': 'Ciudad Autónoma de Melilla',
  'ES701': 'Santa Cruz de Tenerife',
  'ES702': 'Las Palmas'
};

// Lista de todas las comunidades autónomas para el selector
export const SPANISH_REGIONS = [
  'Andalucía',
  'Aragón', 
  'Principado de Asturias',
  'Illes Balears',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Comunidad Valenciana',
  'Extremadura',
  'Galicia',
  'Comunidad de Madrid',
  'Región de Murcia',
  'Comunidad Foral de Navarra',
  'País Vasco',
  'La Rioja',
  'Ciudad Autónoma de Ceuta',
  'Ciudad Autónoma de Melilla'
];

export function getRegionFromNutsCode(nutsCode: string): string {
  if (!nutsCode) return 'Nacional';
  
  // Primero buscar coincidencia exacta
  if (NUTS_TO_REGION[nutsCode]) {
    return NUTS_TO_REGION[nutsCode];
  }
  
  // Si no encuentra, buscar por prefijo (NUTS-1 o NUTS-2)
  if (nutsCode.length >= 4) {
    const nuts2Code = nutsCode.substring(0, 4);
    if (NUTS_TO_REGION[nuts2Code]) {
      return NUTS_TO_REGION[nuts2Code];
    }
  }
  
  if (nutsCode.length >= 2) {
    const nuts1Code = nutsCode.substring(0, 2);
    if (NUTS_TO_REGION[nuts1Code]) {
      return NUTS_TO_REGION[nuts1Code];
    }
  }
  
  // Extraer región del código CPV si no hay NUTS
  if (nutsCode.length === 8 && nutsCode.startsWith('ES')) {
    return getRegionFromNutsCode(nutsCode.substring(0, 4));
  }
  
  return 'Nacional';
}

export function extractRegionFromTender(tender: any): string {
  // Intentar obtener del NUTS code
  if (tender.nutsCode) {
    return getRegionFromNutsCode(tender.nutsCode);
  }
  
  // Intentar obtener de metadata CODICE
  if (tender.metadata?.codice?.['cac:ProcurementProject']?.['cac:RealizedLocation']?.['cbc:CountrySubentityCode']?.['#text']) {
    const nutsCode = tender.metadata.codice['cac:ProcurementProject']['cac:RealizedLocation']['cbc:CountrySubentityCode']['#text'];
    return getRegionFromNutsCode(nutsCode);
  }
  
  // Intentar extraer del título o descripción
  const text = `${tender.title} ${tender.description}`.toLowerCase();
  const regionKeywords = {
    'andalucía': 'Andalucía',
    'andalucia': 'Andalucía', 
    'sevilla': 'Andalucía',
    'córdoba': 'Andalucía',
    'málaga': 'Andalucía',
    'granada': 'Andalucía',
    'almería': 'Andalucía',
    'huelva': 'Andalucía',
    'jaén': 'Andalucía',
    'cádiz': 'Andalucía',
    'cataluña': 'Cataluña',
    'catalunya': 'Cataluña',
    'barcelona': 'Cataluña',
    'girona': 'Cataluña',
    'lleida': 'Cataluña',
    'tarragona': 'Cataluña',
    'madrid': 'Comunidad de Madrid',
    'país vasco': 'País Vasco',
    'pais vasco': 'País Vasco',
    'vizcaya': 'País Vasco',
    'guipúzcoa': 'País Vasco',
    'álava': 'País Vasco',
    'bilbao': 'País Vasco',
    'san sebastián': 'País Vasco',
    'vitoria': 'País Vasco',
    'valencia': 'Comunidad Valenciana',
    'alicante': 'Comunidad Valenciana',
    'castellón': 'Comunidad Valenciana',
    'galicia': 'Galicia',
    'a coruña': 'Galicia',
    'lugo': 'Galicia',
    'ourense': 'Galicia',
    'pontevedra': 'Galicia',
    'canarias': 'Canarias',
    'tenerife': 'Canarias',
    'las palmas': 'Canarias',
    'aragón': 'Aragón',
    'zaragoza': 'Aragón',
    'huesca': 'Aragón',
    'teruel': 'Aragón',
    'castilla la mancha': 'Castilla-La Mancha',
    'castilla y león': 'Castilla y León',
    'extremadura': 'Extremadura',
    'navarra': 'Comunidad Foral de Navarra',
    'rioja': 'La Rioja',
    'murcia': 'Región de Murcia',
    'asturias': 'Principado de Asturias',
    'cantabria': 'Cantabria',
    'balear': 'Illes Balears',
    'ceuta': 'Ciudad Autónoma de Ceuta',
    'melilla': 'Ciudad Autónoma de Melilla'
  };
  
  for (const [keyword, region] of Object.entries(regionKeywords)) {
    if (text.includes(keyword)) {
      return region;
    }
  }
  
  return 'Nacional';
}