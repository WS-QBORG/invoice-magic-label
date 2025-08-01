/**
 * PDF Processing utilities for invoice text extraction
 * Handles PDF.js integration and text parsing
 */

// PDF.js types (simplified)
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

/**
 * Extract text content from PDF file
 * @param file - PDF file to process
 * @returns Promise with extracted text
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    // Dynamically load PDF.js if not already loaded
    if (!window.pdfjsLib) {
      await loadPdfJs();
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join('\n') + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Nie udało się wyodrębnić tekstu z PDF');
  }
}

/**
 * Load PDF.js library dynamically
 */
async function loadPdfJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      // Configure worker
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

/**
 * Extract vendor (Sprzedawca) name from invoice text
 * @param text - Full invoice text
 * @returns Vendor name or "Nie znaleziono"
 */
export function extractVendorName(text: string): string {
  // Try to extract after 'Sprzedawca:' up to next newline
  const sprzedawcaRegex = /Sprzedawca:?\s*\n?([^\n]+)/i;
  let match = text.match(sprzedawcaRegex);
  
  if (match) {
    return match[1].trim();
  }
  
  // Fallback: look for company indicators
  const lines = text.split(/\n/);
  for (let line of lines) {
    if (/sp\.?\s*z\s*o\.?o\.?/i.test(line) && !/Nabywca|NIP/i.test(line)) {
      return line.trim();
    }
  }
  
  return 'Nie znaleziono';
}

/**
 * Extract buyer (Nabywca) name from invoice text
 * @param text - Full invoice text
 * @returns Buyer name or "Nie znaleziono"
 */
export function extractBuyerName(text: string): string {
  const nabywcaRegex = /Nabywca:?\s*\n?([^\n]+)/i;
  let match = text.match(nabywcaRegex);
  
  if (match) {
    return match[1].trim();
  }
  
  return 'Nie znaleziono';
}

/**
 * Extract vendor NIP from invoice text
 * @param text - Full invoice text
 * @returns Vendor NIP or undefined
 */
export function extractVendorNip(text: string): string | undefined {
  // Look for NIP before "Nabywca" section
  const nabywcaIndex = text.search(/Nabywca/i);
  let searchArea = text;
  
  if (nabywcaIndex >= 0) {
    searchArea = text.slice(0, nabywcaIndex);
  }
  
  const nipRegex = /NIP[:\s]*([0-9]{10})/i;
  const match = searchArea.match(nipRegex);
  
  return match ? match[1] : undefined;
}

/**
 * Extract buyer NIP from invoice text
 * @param text - Full invoice text
 * @returns Buyer NIP or "Brak"
 */
export function extractBuyerNip(text: string): string {
  // Look for NIP after "Nabywca" section
  const nabywcaIndex = text.search(/Nabywca/i);
  let searchArea = text;
  
  if (nabywcaIndex >= 0) {
    searchArea = text.slice(nabywcaIndex);
  }
  
  const nipRegex = /NIP[:\s]*([0-9]{10})/i;
  const match = searchArea.match(nipRegex);
  
  if (match) {
    return match[1];
  }
  
  // Fallback: find any 10-digit number in buyer section
  const fallback = searchArea.match(/([0-9]{10})/);
  return fallback ? fallback[1] : 'Brak';
}

/**
 * Extract invoice number from invoice text
 * @param text - Full invoice text
 * @returns Invoice number or "Nieznany"
 */
export function extractInvoiceNumber(text: string): string {
  // Look for patterns like FZ 328/01/2023 or FA/2341/6/2025/R
  const patterns = [
    /([A-Z]{1,3}[\/\s]*\d+[\/\-]\d+[\/\-]\d{2,4}[\/\-]?[A-Z]?)/,
    /(\d+[\/\-]\d+[\/\-]\d{4})/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/\s+/g, ' ').trim();
    }
  }
  
  return 'Nieznany';
}