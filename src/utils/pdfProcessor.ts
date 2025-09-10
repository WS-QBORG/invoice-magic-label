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
    console.log('Extracting text from image using enhanced OCR...');

    // Load image into canvas
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject as any;
      i.src = URL.createObjectURL(file);
    });

    const baseCanvas = document.createElement('canvas');
    const ctx = baseCanvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('Could not get canvas context');

    // Resize keeping aspect ratio (up to ~2000px on the long edge)
    const maxDim = 2000;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if ((w >= h && w > maxDim) || (h > w && h > maxDim)) {
      if (w >= h) {
        h = Math.round(h * (maxDim / w));
        w = maxDim;
      } else {
        w = Math.round(w * (maxDim / h));
        h = maxDim;
      }
    }
    baseCanvas.width = w;
    baseCanvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    // Simple enhancement: grayscale + adaptive thresholding (binarization)
    const enhance = (input: HTMLCanvasElement) => {
      const c = document.createElement('canvas');
      c.width = input.width;
      c.height = input.height;
const ictx = c.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D;
      ictx.drawImage(input, 0, 0);
      const imageData = ictx.getImageData(0, 0, c.width, c.height);
      const data = imageData.data;

      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = data[i + 1] = data[i + 2] = gray;
        sum += gray;
      }
      const mean = sum / (data.length / 4);
      const threshold = Math.min(225, Math.max(95, mean * 0.95));
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i];
        const bin = v > threshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = bin;
        data[i + 3] = 255;
      }
      ictx.putImageData(imageData, 0, 0);
      return c;
    };

    const rotate = (input: HTMLCanvasElement, angle: number) => {
      const rad = (angle * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const w = input.width, h = input.height;
      const out = document.createElement('canvas');
      out.width = Math.round(w * cos + h * sin);
      out.height = Math.round(w * sin + h * cos);
const octx = out.getContext('2d') as CanvasRenderingContext2D;
      octx.translate(out.width / 2, out.height / 2);
      octx.rotate(rad);
      octx.drawImage(input, -w / 2, -h / 2);
      return out;
    };

    const run = async (canvas: HTMLCanvasElement) => {
      const result = await Tesseract.recognize(canvas, 'pol+eng', {
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round((m.progress || 0) * 100)}%`);
          }
        }
      } as any);
      const conf = (result?.data as any)?.confidence ?? 0;
      return { text: result?.data?.text ?? '', confidence: conf };
    };

    const enhanced = enhance(baseCanvas);
    const angles = [0, 90, 180, 270];
    let best = { text: '', confidence: -1 };
    for (const ang of angles) {
      const rotated = ang === 0 ? enhanced : rotate(enhanced, ang);
      const r = await run(rotated);
      if (r.confidence > best.confidence) best = r;
    }

    return best.text;
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

      // Render PDF page to canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      if (!context) throw new Error('Could not get canvas context');

      await page.render({ canvasContext: context, viewport }).promise;

      // Enhancement helpers
      const enhance = (input: HTMLCanvasElement) => {
        const c = document.createElement('canvas');
        c.width = input.width;
        c.height = input.height;
        const ictx = c.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D;
        ictx.drawImage(input, 0, 0);
        const imageData = ictx.getImageData(0, 0, c.width, c.height);
        const data = imageData.data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = data[i + 1] = data[i + 2] = gray;
          sum += gray;
        }
        const mean = sum / (data.length / 4);
        const threshold = Math.min(225, Math.max(95, mean * 0.95));
        for (let i = 0; i < data.length; i += 4) {
          const v = data[i];
          const bin = v > threshold ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = bin;
          data[i + 3] = 255;
        }
        ictx.putImageData(imageData, 0, 0);
        return c;
      };

      const rotate = (input: HTMLCanvasElement, angle: number) => {
        const rad = (angle * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        const w = input.width, h = input.height;
        const out = document.createElement('canvas');
        out.width = Math.round(w * cos + h * sin);
        out.height = Math.round(w * sin + h * cos);
        const octx = out.getContext('2d') as CanvasRenderingContext2D;
        octx.translate(out.width / 2, out.height / 2);
        octx.rotate(rad);
        octx.drawImage(input, -w / 2, -h / 2);
        return out;
      };

      const run = async (c: HTMLCanvasElement) => {
        const result = await Tesseract.recognize(c, 'pol+eng', {
          tessedit_pageseg_mode: '6',
          preserve_interword_spaces: '1',
          logger: (m: any) => m && m.status === 'recognizing text' && console.log(`Page ${i} OCR: ${Math.round((m.progress || 0) * 100)}%`)
        } as any);
        const conf = (result?.data as any)?.confidence ?? 0;
        return { text: result?.data?.text ?? '', confidence: conf };
      };

      const enhanced = enhance(canvas);
      const angles = [0, 90, 180, 270];
      let best = { text: '', confidence: -1 };
      for (const ang of angles) {
        const rotated = ang === 0 ? enhanced : rotate(enhanced, ang);
        const r = await run(rotated);
        if (r.confidence > best.confidence) best = r;
      }

      fullText += best.text + '\n';
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
  
  const lines = searchArea.split(/\n/).map(line => line.trim()).filter(line => line.length > 1);
  
  // Look for company identifiers in the first part of the document
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    
    // Skip obviously non-company lines
    if (/faktura|invoice|data|nr[\s:]|nip[\s:]|ul[\s\.]|adres|kod|tel[\s:]|email|www\.|http/i.test(line)) {
      continue;
    }
    
    // Look for company patterns or just substantial text that could be a company name
    if (line.length > 2 && (
         /sp\.?\s*z\s*o\.?o\.?/i.test(line) || 
         /s\.a\./i.test(line) || 
         /ltd/i.test(line) ||
         /sp\.\s*j\./i.test(line) ||
         /spółka/i.test(line) ||
         /przedsiębiorstwo/i.test(line) ||
         /ipos/i.test(line) ||
         /^[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]{2,}$/i.test(line) || // Polish company name pattern
         (i < 5 && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(line) && line.length > 2) // Company name in header
       )) {
      return line.trim();
    }
  }
  
  // If still nothing found, try to get any meaningful text from the very beginning
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length > 2 && !/^\d/.test(firstLine)) {
      return firstLine.trim();
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
  // Find all NIPs in the document
  const allNips = text.match(/\b\d{10}\b/g) || [];
  
  if (allNips.length === 0) return undefined;
  if (allNips.length === 1) return allNips[0];
  
  // If multiple NIPs, vendor is typically the first one in the document
  // or the one appearing before "Nabywca" section
  const nabywcaIndex = text.search(/Nabywca/i);
  
  if (nabywcaIndex >= 0) {
    const vendorArea = text.slice(0, nabywcaIndex);
    const vendorNips = vendorArea.match(/\b\d{10}\b/g);
    if (vendorNips && vendorNips.length > 0) {
      return vendorNips[0]; // First NIP in vendor area
    }
  }
  
  // Fallback: return first NIP found
  return allNips[0];
}

/**
 * Extract buyer NIP from invoice text
 * @param text - Full invoice text
 * @returns Buyer NIP or "Brak"
 */
export function extractBuyerNip(text: string): string {
  // Find all NIPs in the document
  const allNips = text.match(/\b\d{10}\b/g) || [];
  
  if (allNips.length === 0) return 'Brak';
  if (allNips.length === 1) return 'Brak'; // Only vendor NIP found
  
  // Get vendor NIP
  const vendorNip = extractVendorNip(text);
  
  // Look for NIPs in the Nabywca section first
  const nabywcaIndex = text.search(/Nabywca/i);
  if (nabywcaIndex >= 0) {
    const nabywcaSection = text.slice(nabywcaIndex);
    const buyerNips = nabywcaSection.match(/\b\d{10}\b/g);
    
    if (buyerNips) {
      // Return first NIP in buyer section that's not the vendor NIP
      for (const nip of buyerNips) {
        if (nip !== vendorNip) {
          return nip;
        }
      }
    }
  }
  
  // Fallback: return any NIP that's not the vendor NIP
  for (const nip of allNips) {
    if (nip !== vendorNip) {
      return nip;
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

/**
 * Extract issue date from invoice text
 * @param text - Full invoice text
 * @returns Issue date or "Nieznana"
 */
export function extractIssueDate(text: string): string {
  // Look for patterns like "Data wystawienia: 06.01.2025" or "Wystawiona: 2025-01-06"
  const patterns = [
    /Data\s+wystawienia:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i,
    /Wystawiona:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i,
    /Data\s+faktury:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i,
    /Dnia:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i,
    // ISO format
    /Data\s+wystawienia:?\s*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/i,
    /Wystawiona:?\s*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeDate(match[1]);
    }
  }
  
  // Fallback: look for any date near the beginning of the document
  const lines = text.split('\n').slice(0, 15); // First 15 lines
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/);
    if (dateMatch && !line.toLowerCase().includes('nip') && !line.toLowerCase().includes('regon')) {
      return normalizeDate(dateMatch[1]);
    }
  }
  
  return 'Nieznana';
}

/**
 * Extract due date from invoice text
 * @param text - Full invoice text
 * @returns Due date or "Nieznana"
 */
export function extractDueDate(text: string): string {
  // Look for patterns like "Termin płatności: 20.01.2025" or "Do zapłaty do: 2025-01-20"
  const patterns = [
    /Termin\s+płatności:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i,
    /Do\s+zapłaty\s+do:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i,
    /Zapłacić\s+do:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i,
    /Data\s+płatności:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i,
    /Płatność\s+do:?\s*(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i,
    // ISO format
    /Termin\s+płatności:?\s*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/i,
    /Do\s+zapłaty\s+do:?\s*(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeDate(match[1]);
    }
  }
  
  return 'Nieznana';
}

/**
 * Extract payment method from invoice text
 * @param text - Full invoice text
 * @returns Payment method or "Nieznany"
 */
export function extractPaymentMethod(text: string): string {
  // Look for payment method patterns
  const methods = [
    { pattern: /przelew/i, method: 'Przelew bankowy' },
    { pattern: /gotówka/i, method: 'Gotówka' },
    { pattern: /karta/i, method: 'Karta płatnicza' },
    { pattern: /blik/i, method: 'BLIK' },
    { pattern: /paypal/i, method: 'PayPal' },
    { pattern: /płatność\s+online/i, method: 'Płatność online' },
    { pattern: /płatność\s+kartą/i, method: 'Karta płatnicza' },
    { pattern: /płatność\s+bezgotówkowa/i, method: 'Przelew bankowy' },
    { pattern: /płatność\s+gotówkowa/i, method: 'Gotówka' },
    { pattern: /bank/i, method: 'Przelew bankowy' },
    { pattern: /przekaz/i, method: 'Przekaz pocztowy' }
  ];
  
  for (const { pattern, method } of methods) {
    if (pattern.test(text)) {
      return method;
    }
  }
  
  // Look for specific payment sections
  const paymentSectionRegex = /Sposób\s+płatności:?\s*([^\n]+)/i;
  const methodMatch = text.match(paymentSectionRegex);
  if (methodMatch) {
    const rawMethod = methodMatch[1].trim();
    // Clean up common payment method descriptions
    if (/przelew/i.test(rawMethod)) return 'Przelew bankowy';
    if (/gotówka/i.test(rawMethod)) return 'Gotówka';
    if (/karta/i.test(rawMethod)) return 'Karta płatnicza';
    return rawMethod;
  }
  
  return 'Nieznany';
}

/**
 * Normalize date format to DD.MM.YYYY
 * @param dateStr - Date string in various formats
 * @returns Normalized date string
 */
function normalizeDate(dateStr: string): string {
  try {
    // Remove any extra spaces
    let cleaned = dateStr.trim();
    
    // Handle different separators
    cleaned = cleaned.replace(/[-\/]/g, '.');
    
    // Handle different formats
    const parts = cleaned.split('.');
    
    if (parts.length === 3) {
      let [part1, part2, part3] = parts;
      
      // Determine if it's DD.MM.YYYY or YYYY.MM.DD
      if (part1.length === 4) {
        // YYYY.MM.DD format
        return `${part3.padStart(2, '0')}.${part2.padStart(2, '0')}.${part1}`;
      } else {
        // DD.MM.YYYY format
        // Handle 2-digit years
        if (part3.length === 2) {
          const year = parseInt(part3);
          part3 = year > 50 ? `19${part3}` : `20${part3}`;
        }
        return `${part1.padStart(2, '0')}.${part2.padStart(2, '0')}.${part3}`;
      }
    }
    
    return dateStr;
  } catch (error) {
    console.error('Error normalizing date:', error);
    return dateStr;
  }
}