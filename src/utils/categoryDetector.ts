/**
 * Smart category detection for invoices
 * Analyzes invoice content to suggest appropriate MPK and Group codes
 */

// Category mapping based on keywords and vendor patterns
const CATEGORY_MAPPINGS = {
  // Vehicle-related expenses
  vehicles: {
    keywords: ['verizon', 'connect', 'gps', 'tracking', 'pojazd', 'samochód', 'auto', 'flota'],
    mpk: 'MPK610',
    group: '3/8',
    description: 'Koszty pojazdów'
  },
  
  // Office supplies and equipment
  office: {
    keywords: ['biuro', 'papier', 'długopis', 'komputer', 'monitor', 'krzesło', 'biurko'],
    mpk: 'MPK300',
    group: '2/5',
    description: 'Wyposażenie biura'
  },
  
  // Telecommunications
  telecom: {
    keywords: ['telefon', 'internet', 'telekom', 'orange', 'play', 'plus', 't-mobile'],
    mpk: 'MPK400',
    group: '4/1',
    description: 'Telekomunikacja'
  },
  
  // Utilities
  utilities: {
    keywords: ['prąd', 'energia', 'gaz', 'woda', 'pge', 'tauron', 'enea'],
    mpk: 'MPK500',
    group: '5/2',
    description: 'Media'
  },
  
  // Software and licenses
  software: {
    keywords: ['licencja', 'oprogramowanie', 'software', 'microsoft', 'adobe', 'aplikacja'],
    mpk: 'MPK200',
    group: '1/3',
    description: 'Oprogramowanie'
  },
  
  // Professional services
  services: {
    keywords: ['konsultacje', 'doradztwo', 'prawnik', 'księgowy', 'audyt', 'szkolenie'],
    mpk: 'MPK700',
    group: '6/4',
    description: 'Usługi profesjonalne'
  }
};

/**
 * Analyze invoice content and suggest category
 * @param vendorName - Name of the vendor
 * @param invoiceText - Full invoice text content
 * @returns Suggested category with MPK and Group
 */
export function detectInvoiceCategory(vendorName: string, invoiceText: string) {
  const searchText = `${vendorName} ${invoiceText}`.toLowerCase();
  
  // Score each category based on keyword matches
  const categoryScores: Array<{ category: string; score: number; data: any }> = [];
  
  for (const [categoryName, categoryData] of Object.entries(CATEGORY_MAPPINGS)) {
    let score = 0;
    
    // Check keywords in vendor name (higher weight)
    for (const keyword of categoryData.keywords) {
      if (vendorName.toLowerCase().includes(keyword)) {
        score += 10;
      }
    }
    
    // Check keywords in invoice text (lower weight)
    for (const keyword of categoryData.keywords) {
      if (invoiceText.toLowerCase().includes(keyword)) {
        score += 3;
      }
    }
    
    if (score > 0) {
      categoryScores.push({
        category: categoryName,
        score,
        data: categoryData
      });
    }
  }
  
  // Sort by score and return best match
  categoryScores.sort((a, b) => b.score - a.score);
  
  if (categoryScores.length > 0 && categoryScores[0].score >= 5) {
    return {
      detected: true,
      category: categoryScores[0].category,
      mpk: categoryScores[0].data.mpk,
      group: categoryScores[0].data.group,
      description: categoryScores[0].data.description,
      confidence: Math.min(categoryScores[0].score / 20, 1) // Normalize to 0-1
    };
  }
  
  // No confident match found
  return {
    detected: false,
    category: 'unknown',
    mpk: 'MPK000',
    group: '0/0',
    description: 'Kategoria nieznana',
    confidence: 0
  };
}

/**
 * Get all available categories for manual selection
 */
export function getAvailableCategories() {
  return Object.entries(CATEGORY_MAPPINGS).map(([key, data]) => ({
    id: key,
    name: data.description,
    mpk: data.mpk,
    group: data.group,
    keywords: data.keywords
  }));
}

/**
 * Custom category detection for known vendors
 * This allows for vendor-specific rules that override general category detection
 */
export function detectVendorSpecificCategory(vendorName: string): ReturnType<typeof detectInvoiceCategory> | null {
  const normalizedVendor = vendorName.toLowerCase();
  
  // Verizon Connect - always vehicle tracking
  if (normalizedVendor.includes('verizon') && normalizedVendor.includes('connect')) {
    return {
      detected: true,
      category: 'vehicles',
      mpk: 'MPK610',
      group: '3/8',
      description: 'Koszty pojazdów - lokalizacja GPS',
      confidence: 1.0
    };
  }
  
  // Add more vendor-specific rules here as needed
  
  return null;
}