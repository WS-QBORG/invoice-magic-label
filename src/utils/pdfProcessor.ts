/**
 * PDF Processing utilities for invoice text extraction
 * Handles PDF.js integration, OCR, and text parsing
 */

import Tesseract from 'tesseract.js';

// PDF.js types (simplified)
interface PdfJsPage {
  getTextContent(): Promise<{ items: { str: string }[] }>
  getOperatorList(): Promise<any>
  render(params: any): { promise: Promise<void> }
  getViewport(params: { scale: number }): any
}

interface PdfJsDocument {
  numPages: number
  getPage(pageNumber: number): Promise<PdfJsPage>
}

interface PdfjsLib {
  getDocument(options: { data: ArrayBuffer }): { promise: Promise<PdfJsDocument> }
  GlobalWorkerOptions: { workerSrc: string }
}

declare global {
  interface Window {
    pdfjsLib: PdfjsLib
  }
}

/**
 * Extract text content from PDF file or image file
 * @param file - PDF or image file to process
 * @returns Promise with extracted text
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    // Handle image files directly with OCR
    if (file.type.startsWith('image/')) {
      return await extractTextFromImage(file);
    }

    // Handle PDF files
    if (!window.pdfjsLib) {
      await loadPdfJs();
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    let hasTextContent = false;
    
    // First try to extract text normally
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      const pageText = strings.join('\n');
      
      if (pageText.trim().length > 0) {
        hasTextContent = true;
        fullText += pageText + '\n';
      }
    }
    
    // If no meaningful text found, try OCR on each page
    if (!hasTextContent || fullText.trim().length < 50) {
      console.log('PDF appears to be scanned, using OCR...');
      fullText = await extractTextFromScannedPdf(pdf);
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Nie udało się wyodrębnić tekstu z PDF');
  }
}

/**
 * Extract text from image file using OCR
 * @param file - Image file to process
 * @returns Promise with extracted text
 */
export async function extractTextFromImage(file: File): Promise<string> {
  try {
    console.log('Extracting text from image using OCR...');
    const { data: { text } } = await Tesseract.recognize(file, 'pol', {
      logger: m => console.log(m)
    });
    return text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Nie udało się wyodrębnić tekstu z obrazu');
  }
}

/**
 * Extract text from scanned PDF using OCR
 * @param pdf - PDF document object
 * @returns Promise with extracted text
 */
async function extractTextFromScannedPdf(pdf: PdfJsDocument): Promise<string> {
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas to render PDF page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to blob and run OCR
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      });
      
      const { data: { text } } = await Tesseract.recognize(blob, 'pol', {
        logger: m => console.log(`Page ${i}:`, m)
      });
      
      fullText += text + '\n';
    } catch (error) {
      console.error(`Error processing page ${i} with OCR:`, error);
    }
  }
  
  return fullText;
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
  // First try to find explicit "Sprzedawca:" pattern
  const sprzedawcaRegex = /Sprzedawca:?\s*\n?([^\n]+)/i;
  let match = text.match(sprzedawcaRegex);
  
  if (match && match[1].trim() && !match[1].trim().toLowerCase().includes('nabywca')) {
    return match[1].trim();
  }
  
  // Try alternative patterns for vendor name
  const vendorPatterns = [
    /Wystawca:?\s*\n?([^\n]+)/i,
    /Supplier:?\s*\n?([^\n]+)/i,
    /Dostawca:?\s*\n?([^\n]+)/i
  ];
  
  for (const pattern of vendorPatterns) {
    match = text.match(pattern);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }
  
  // Look for company name in the header (first few lines before "Nabywca")
  const nabywcaIndex = text.search(/Nabywca/i);
  const searchArea = nabywcaIndex >= 0 ? text.slice(0, nabywcaIndex) : text.slice(0, Math.min(500, text.length));
  
  const lines = searchArea.split(/\n/).map(line => line.trim()).filter(line => line.length > 2);
  
  // Look for company identifiers in the first part of the document
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    
    // Skip obviously non-company lines
    if (/faktura|invoice|data|nr[\s:]|nip[\s:]|ul[\s\.]|adres|kod|tel[\s:]|email|www\.|http/i.test(line)) {
      continue;
    }
    
    // Look for company patterns or just substantial text that could be a company name
    if (line.length > 5 && (
         /sp\.?\s*z\s*o\.?o\.?/i.test(line) || 
         /s\.a\./i.test(line) || 
         /ltd/i.test(line) ||
         /sp\.\s*j\./i.test(line) ||
         /spółka/i.test(line) ||
         /przedsiębiorstwo/i.test(line) ||
         /ipos/i.test(line) ||
         (i < 3 && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(line) && line.length > 8) // Company name in header
       )) {
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
  // Look for "Nabywca:" followed by the name
  const nabywcaRegex = /Nabywca:?\s*\n?([^\n]+)/i;
  const match = text.match(nabywcaRegex);
  
  if (match) {
    let buyerName = match[1].trim();
    
    // Clean up common prefixes that might be part of vendor name
    // Remove vendor names that might be included
    const vendorPrefixes = [
      /^iPOS\s+SA\s*/i,
      /^ipos\s*/i,
      /^firma\s*/i,
      /^sp\.\s*z\s*o\.o\.?\s*/i,
      /^s\.a\.\s*/i
    ];
    
    for (const prefix of vendorPrefixes) {
      buyerName = buyerName.replace(prefix, '').trim();
    }
    
    // If there's still content, return it
    if (buyerName.length > 0) {
      return buyerName;
    }
  }
  
  // Alternative: look for buyer in structured format
  const buyerPatterns = [
    /Nabywca\s*[:]\s*([^NIP\n]+?)(?=NIP|$)/i,
    /Buyer\s*[:]\s*([^NIP\n]+?)(?=NIP|$)/i,
    /Odbiorca\s*[:]\s*([^NIP\n]+?)(?=NIP|$)/i
  ];
  
  for (const pattern of buyerPatterns) {
    const altMatch = text.match(pattern);
    if (altMatch) {
      return altMatch[1].trim();
    }
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
  
  // Look for NIP in the Sprzedawca section
  const sprzedawcaMatch = searchArea.match(/Sprzedawca[\s\S]*?NIP[:\s-]*([0-9\s-]{10,})/i);
  if (sprzedawcaMatch) {
    const digits = sprzedawcaMatch[1].replace(/\D/g, '');
    if (digits.length === 10) {
      return digits;
    }
  }
  
  // Fallback: look for the first NIP in the vendor area
  const nipRegex = /NIP[:\s-]*([0-9\s-]{10,})/i;
  const match = searchArea.match(nipRegex);

  if (match) {
    const digits = match[1].replace(/\D/g, '');
    if (digits.length === 10) {
      return digits;
    }
  }

  return undefined;
}

/**
 * Extract buyer NIP from invoice text
 * @param text - Full invoice text
 * @returns Buyer NIP or "Brak"
 */
export function extractBuyerNip(text: string): string {
  // Look for NIP specifically in the Nabywca section
  const nabywcaIndex = text.search(/Nabywca/i);
  if (nabywcaIndex === -1) {
    return 'Brak';
  }
  
  // Get text starting from "Nabywca" to end of document
  const nabywcaSection = text.slice(nabywcaIndex);
  
  // First, try to find NIP explicitly mentioned after Nabywca
  const nabywcaNipMatch = nabywcaSection.match(/Nabywca[\s\S]{1,200}?NIP[:\s-]*([0-9\s-]{10,})/i);
  if (nabywcaNipMatch) {
    const digits = nabywcaNipMatch[1].replace(/\D/g, '');
    if (digits.length === 10) {
      return digits;
    }
  }
  
  // Get vendor NIP to avoid confusion
  const vendorNip = extractVendorNip(text);
  
  // Look for any 10-digit number in the Nabywca section that's not the vendor NIP
  const nipMatches = nabywcaSection.match(/\b\d{10}\b/g);
  if (nipMatches) {
    for (const nipMatch of nipMatches) {
      if (nipMatch !== vendorNip && nipMatch.length === 10) {
        return nipMatch;
      }
    }
  }
  
  // Fallback: look for any sequence of 10 digits with possible spaces/hyphens
  const allNumbers = nabywcaSection.match(/[0-9\s-]{10,}/g);
  if (allNumbers) {
    for (const numberSeq of allNumbers) {
      const digits = numberSeq.replace(/\D/g, '');
      if (digits.length === 10 && digits !== vendorNip) {
        return digits;
      }
    }
  }

  return 'Brak';
}

/**
 * Extract invoice number from invoice text
 * @param text - Full invoice text
 * @returns Invoice number or "Nieznany"
 */
export function extractInvoiceNumber(text: string): string {
  // Look for patterns like FZ 328/01/2023 or FA/2341/6/2025/R
  const patterns = [
    /([A-Z]{1,3}[/\s]*\d+[/-]\d+[/-]\d{2,4}[/-]?[A-Z]?)/,
    /(\d+[/-]\d+[/-]\d{4})/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/\s+/g, ' ').trim();
    }
  }
  
  return 'Nieznany';
}