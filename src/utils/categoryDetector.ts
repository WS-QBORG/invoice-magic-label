/**
 * Category detection utilities for automatic MPK and Group assignment
 * Based on comprehensive MPK mapping from organizational guidelines
 */

export interface CategoryMatch {
  detected: boolean;
  mpk: string;
  group: string;
  description: string;
  confidence: number;
}

export interface CategoryOption {
  id: string;
  name: string;
  mpk: string;
  group: string;
  keywords: string[];
}

/**
 * Complete MPK category mapping based on organizational structure
 */
const MPK_CATEGORIES: CategoryOption[] = [
  // Administracja (Group 1)
  {
    id: 'admin-office',
    name: 'Administracja - Materiały biurowe',
    mpk: 'MPK100',
    group: '1/1',
    keywords: ['materiały', 'biurowe', 'papier', 'długopisy', 'teczki', 'office', 'supplies']
  },
  {
    id: 'admin-tech',
    name: 'Administracja - Urządzenia techniczne',
    mpk: 'MPK110',
    group: '1/2',
    keywords: ['urządzenia', 'techniczne', 'sprzęt', 'equipment', 'technical']
  },
  {
    id: 'admin-services',
    name: 'Administracja - Usługi zewnętrzne',
    mpk: 'MPK121',
    group: '1/4',
    keywords: ['usługi', 'zewnętrzne', 'serwis', 'maintenance', 'external', 'services']
  },
  {
    id: 'admin-surveillance',
    name: 'Administracja - Nadzór/monitoring',
    mpk: 'MPK130',
    group: '1/6',
    keywords: ['monitoring', 'nadzór', 'surveillance', 'security', 'kamery', 'cameras']
  },
  {
    id: 'admin-cleaning',
    name: 'Administracja - Środki czystości',
    mpk: 'MPK131',
    group: '1/7',
    keywords: ['czystość', 'środki', 'cleaning', 'detergenty', 'sprzątanie']
  },
  {
    id: 'admin-banking',
    name: 'Administracja - Opłaty bankowe',
    mpk: 'MPK140',
    group: '1/9',
    keywords: ['bank', 'opłaty', 'prowizja', 'banking', 'fees', 'commission']
  },
  {
    id: 'admin-it',
    name: 'Administracja - IT/Informatyka',
    mpk: 'MPK150',
    group: '1/10',
    keywords: ['informatyka', 'it', 'computer', 'software', 'hardware', 'system']
  },
  {
    id: 'admin-accounting',
    name: 'Administracja - Księgowość',
    mpk: 'MPK160',
    group: '1/11',
    keywords: ['księgowość', 'accounting', 'rachunkowość', 'księgowa']
  },
  {
    id: 'admin-audit',
    name: 'Administracja - Audyt energetyczny',
    mpk: 'MPK170',
    group: '1/12',
    keywords: ['audyt', 'energetyczny', 'energia', 'energy', 'audit']
  },
  {
    id: 'admin-hr',
    name: 'Administracja - Programy administracyjne',
    mpk: 'MPK180',
    group: '1/13',
    keywords: ['programy', 'administracyjne', 'hr', 'kadry', 'personnel']
  },
  {
    id: 'admin-legal',
    name: 'Administracja - Usługi prawne',
    mpk: 'MPK190',
    group: '1/14',
    keywords: ['prawne', 'legal', 'adwokat', 'kancelaria', 'law', 'lawyer']
  },
  {
    id: 'admin-consulting',
    name: 'Administracja - Doradztwo',
    mpk: 'MPK191',
    group: '1/15',
    keywords: ['doradztwo', 'consulting', 'consultant', 'advisory']
  },
  {
    id: 'admin-services2',
    name: 'Administracja - Usługi',
    mpk: 'MPK192',
    group: '1/16',
    keywords: ['usługi', 'services', 'serwis']
  },
  {
    id: 'admin-telecom',
    name: 'Administracja - Telefon',
    mpk: 'MPK193',
    group: '1/17',
    keywords: ['telefon', 'telekomunikacja', 'phone', 'telecom', 'mobile']
  },
  {
    id: 'admin-insurance',
    name: 'Administracja - Ubezpieczenia',
    mpk: 'MPK194',
    group: '1/18',
    keywords: ['ubezpieczenia', 'insurance', 'polisa', 'policy']
  },
  {
    id: 'admin-gas',
    name: 'Administracja - Gaz',
    mpk: 'MPK195',
    group: '1/19',
    keywords: ['gaz', 'gas', 'heating', 'ogrzewanie']
  },
  {
    id: 'admin-electricity',
    name: 'Administracja - Energia elektryczna',
    mpk: 'MPK196',
    group: '1/20',
    keywords: ['energia', 'elektryczna', 'electricity', 'power', 'prąd']
  },
  {
    id: 'admin-provisions',
    name: 'Administracja - Zakupy spożywcze',
    mpk: 'MPK197',
    group: '1/21',
    keywords: ['spożywcze', 'zakupy', 'żywność', 'food', 'groceries']
  },
  {
    id: 'admin-legal-advice',
    name: 'Administracja - Porady prawne',
    mpk: 'MPK199',
    group: '1/23',
    keywords: ['porady', 'prawne', 'legal', 'advice', 'consultation']
  },

  // Marketing (Group 4)
  {
    id: 'marketing-general',
    name: 'Marketing',
    mpk: 'MPK400',
    group: '4/1',
    keywords: ['marketing', 'reklama', 'promotion', 'advertising', 'media', 'social']
  },
  {
    id: 'marketing-digital',
    name: 'Marketing - Media społecznościowe',
    mpk: 'MPK410',
    group: '4/4',
    keywords: ['social', 'media', 'facebook', 'instagram', 'linkedin', 'twitter']
  },
  {
    id: 'marketing-print',
    name: 'Marketing - Wystawiennictwo artykułów',
    mpk: 'MPK420',
    group: '4/5',
    keywords: ['wystawiennictwo', 'artykuły', 'exhibition', 'articles', 'print']
  },
  {
    id: 'marketing-events',
    name: 'Marketing - Warsztaty',
    mpk: 'MPK430',
    group: '4/6',
    keywords: ['warsztaty', 'workshops', 'szkolenia', 'training', 'events']
  },
  {
    id: 'marketing-website',
    name: 'Marketing - Strona www',
    mpk: 'MPK440',
    group: '4/8',
    keywords: ['strona', 'www', 'website', 'web', 'portal', 'internet']
  },
  {
    id: 'marketing-finance',
    name: 'Marketing - Usługi finansowe',
    mpk: 'MPK450',
    group: '4/9',
    keywords: ['finansowe', 'financial', 'services', 'banking', 'credit']
  },

  // Operacyjne (Group 5)
  {
    id: 'operations-materials',
    name: 'Operacyjne - Materiał podstawowy',
    mpk: 'MPK500',
    group: '5/1',
    keywords: ['materiał', 'podstawowy', 'materials', 'basic', 'raw']
  },
  {
    id: 'operations-support',
    name: 'Operacyjne - Materiał pomocniczy',
    mpk: 'MPK510',
    group: '5/2',
    keywords: ['pomocniczy', 'auxiliary', 'support', 'materials']
  },
  {
    id: 'operations-transport-internal',
    name: 'Operacyjne - Transport',
    mpk: 'MPK520',
    group: '5/3',
    keywords: ['transport', 'wewnętrzny', 'internal', 'logistics']
  },
  {
    id: 'operations-waste',
    name: 'Operacyjne - Masa',
    mpk: 'MPK540',
    group: '5/5',
    keywords: ['masa', 'waste', 'odpady', 'mass']
  },
  {
    id: 'operations-work',
    name: 'Operacyjne - Praca ziemne',
    mpk: 'MPK570',
    group: '5/7',
    keywords: ['praca', 'ziemne', 'earthwork', 'excavation']
  },
  {
    id: 'operations-other',
    name: 'Operacyjne - Pozostałe',
    mpk: 'MPK590',
    group: '5/9',
    keywords: ['pozostałe', 'other', 'miscellaneous', 'inne']
  },

  // Transport (Group 7)
  {
    id: 'transport-fuel',
    name: 'Transport - Paliwo',
    mpk: 'MPK710',
    group: '7/2',
    keywords: ['paliwo', 'benzyna', 'diesel', 'fuel', 'gasoline', 'petrol', 'orlen', 'bp', 'shell', 'lotos', 'circle k']
  },
  {
    id: 'transport-service',
    name: 'Transport - Zakupy',
    mpk: 'MPK720',
    group: '7/3',
    keywords: ['zakupy', 'serwis', 'naprawa', 'parts', 'service', 'maintenance', 'repair']
  },
  {
    id: 'transport-fleet',
    name: 'Transport - Przegląd',
    mpk: 'MPK730',
    group: '7/4',
    keywords: ['przegląd', 'inspection', 'pojazd', 'vehicle', 'car', 'fleet', 'verizon', 'gps', 'tracking']
  },
  {
    id: 'transport-aviation',
    name: 'Transport - Lotnictwo',
    mpk: 'MPK740',
    group: '7/5',
    keywords: ['lotnictwo', 'aviation', 'samolot', 'plane', 'aircraft', 'flight']
  },
  {
    id: 'transport-shipping',
    name: 'Transport - Żegluga',
    mpk: 'MPK750',
    group: '7/6',
    keywords: ['żegluga', 'shipping', 'morski', 'maritime', 'ship', 'vessel']
  },
  {
    id: 'transport-rail',
    name: 'Transport - Kolej',
    mpk: 'MPK760',
    group: '7/7',
    keywords: ['kolej', 'railway', 'train', 'rail', 'pociąg']
  },
  {
    id: 'transport-parking',
    name: 'Transport - Parkowanie',
    mpk: 'MPK770',
    group: '7/9',
    keywords: ['parkowanie', 'parking', 'opłata', 'fees', 'zona']
  },
  {
    id: 'transport-gps',
    name: 'Transport - GPS',
    mpk: 'MPK780',
    group: '7/10',
    keywords: ['gps', 'lokalizacja', 'tracking', 'navigation', 'monitoring']
  },

  // Wyposażenie (Group 8)
  {
    id: 'equipment-laptop',
    name: 'Wyposażenie - Laptop',
    mpk: 'MPK810',
    group: '8/2',
    keywords: ['laptop', 'computer', 'notebook', 'komputer']
  },
  {
    id: 'equipment-monitor',
    name: 'Wyposażenie - Monitor',
    mpk: 'MPK820',
    group: '8/3',
    keywords: ['monitor', 'screen', 'display', 'ekran']
  },
  {
    id: 'equipment-etus',
    name: 'Wyposażenie - Etus',
    mpk: 'MPK830',
    group: '8/4',
    keywords: ['etus', 'system', 'software']
  },
  {
    id: 'equipment-printer',
    name: 'Wyposażenie - Telefon',
    mpk: 'MPK840',
    group: '8/5',
    keywords: ['telefon', 'phone', 'mobile', 'smartphone']
  },
  {
    id: 'equipment-tablet',
    name: 'Wyposażenie - Tablet',
    mpk: 'MPK870',
    group: '8/7',
    keywords: ['tablet', 'ipad', 'android', 'touchscreen']
  },
  {
    id: 'equipment-other',
    name: 'Wyposażenie - Inne',
    mpk: 'MPK880',
    group: '8/8',
    keywords: ['inne', 'other', 'wyposażenie', 'equipment']
  },
  {
    id: 'equipment-camera',
    name: 'Wyposażenie - Kamera',
    mpk: 'MPK890',
    group: '8/9',
    keywords: ['kamera', 'camera', 'video', 'recording']
  },
  {
    id: 'equipment-router',
    name: 'Wyposażenie - Router',
    mpk: 'MPK900',
    group: '8/10',
    keywords: ['router', 'network', 'internet', 'wifi', 'sieć']
  },
  {
    id: 'equipment-fiskalna',
    name: 'Wyposażenie - Kasa fiskalna',
    mpk: 'MPK920',
    group: '8/12',
    keywords: ['kasa', 'fiskalna', 'fiscal', 'cash', 'register']
  },

  // Pozostałe (Group 9)
  {
    id: 'other-optimization',
    name: 'Pozostałe - Optymalizacja',
    mpk: 'MPK910',
    group: '9/2',
    keywords: ['optymalizacja', 'optimization', 'improvement', 'efficiency']
  },
  {
    id: 'other-accounting',
    name: 'Pozostałe - Księgowość do analizy',
    mpk: 'MPK930',
    group: '9/3',
    keywords: ['księgowość', 'analiza', 'accounting', 'analysis', 'financial']
  }
];

/**
 * Vendor-specific detection rules with high confidence
 */
const VENDOR_SPECIFIC_RULES: Record<string, { mpk: string; group: string; description: string }> = {
  'verizon': {
    mpk: 'MPK730',
    group: '7/4',
    description: 'Transport - Lokalizacja GPS pojazdów'
  },
  'orlen': {
    mpk: 'MPK710',
    group: '7/2',
    description: 'Transport - Paliwo'
  },
  'bp': {
    mpk: 'MPK710',
    group: '7/2',
    description: 'Transport - Paliwo'
  },
  'shell': {
    mpk: 'MPK710',
    group: '7/2',
    description: 'Transport - Paliwo'
  },
  'lotos': {
    mpk: 'MPK710',
    group: '7/2',
    description: 'Transport - Paliwo'
  },
  'circle k': {
    mpk: 'MPK710',
    group: '7/2',
    description: 'Transport - Paliwo'
  },
  'microsoft': {
    mpk: 'MPK150',
    group: '1/10',
    description: 'Administracja - Licencje IT'
  },
  'google': {
    mpk: 'MPK410',
    group: '4/4',
    description: 'Marketing - Reklama online'
  },
  'facebook': {
    mpk: 'MPK410',
    group: '4/4',
    description: 'Marketing - Media społecznościowe'
  }
};

/**
 * Detect category based on vendor-specific rules
 */
export function detectVendorSpecificCategory(vendorName: string): CategoryMatch {
  const normalized = vendorName.toLowerCase();
  
  for (const [key, mapping] of Object.entries(VENDOR_SPECIFIC_RULES)) {
    if (normalized.includes(key)) {
      return {
        detected: true,
        mpk: mapping.mpk,
        group: mapping.group,
        description: mapping.description,
        confidence: 1.0
      };
    }
  }
  
  return {
    detected: false,
    mpk: '',
    group: '',
    description: '',
    confidence: 0
  };
}

/**
 * General category detection based on content analysis
 */
export function detectInvoiceCategory(vendorName: string, invoiceText: string): CategoryMatch {
  const searchText = (vendorName + ' ' + invoiceText).toLowerCase();
  
  let bestMatch: CategoryMatch = {
    detected: false,
    mpk: '',
    group: '',
    description: '',
    confidence: 0
  };
  
  for (const category of MPK_CATEGORIES) {
    let score = 0;
    let keywordMatches = 0;
    
    for (const keyword of category.keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = searchText.match(regex);
      if (matches) {
        keywordMatches++;
        score += matches.length;
      }
    }
    
    if (keywordMatches > 0) {
      const confidence = Math.min(keywordMatches / category.keywords.length + (score * 0.1), 1.0);
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          detected: true,
          mpk: category.mpk,
          group: category.group,
          description: category.name,
          confidence
        };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Get all available categories for manual selection
 */
export function getAvailableCategories(): CategoryOption[] {
  return MPK_CATEGORIES;
}