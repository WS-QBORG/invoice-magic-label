import { useState } from 'react';
import { extractTextFromPdf, extractVendorName, extractVendorNip, extractBuyerName, extractBuyerNip, extractInvoiceNumber, extractIssueDate, extractDueDate, extractPaymentMethod } from '@/utils/pdfProcessor';
import { detectInvoiceCategory, detectVendorSpecificCategory } from '@/utils/categoryDetector';
import { InvoiceData } from '@/types/invoice';
import { useFirebaseVendors } from './useFirebaseVendors';
import { useVendorNipMapping } from './useVendorNipMapping';
import { useVendorNipToMapping } from './useVendorNipToMapping';
import { useBuyerNipMapping } from './useBuyerNipMapping';
import { useInvoiceStorage } from './useInvoiceStorage';
import { useInvoiceCounters } from './useInvoiceCounters';
import { useToast } from './use-toast';

interface OneDriveFile {
  driveItemId: string;
  name: string;
  mimeType: string;
  size: number;
  fullPath: string;
  eTag: string;
  sha1Hash?: string;
  downloadUrl: string;
  webUrl: string;
  modifiedDateTime: string;
}

interface ProcessingResult {
  success: boolean;
  invoiceData?: InvoiceData;
  error?: string;
}

export const useOneDriveIntegration = () => {
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { 
    findVendorMapping, 
    saveVendorMapping, 
    updateVendorLastUsed 
  } = useFirebaseVendors();

  const { 
    checkVendorNameUpdate,
    saveVendorNipMapping
  } = useVendorNipMapping();

  const {
    saveVendorNipMapping: saveVendorNipToMapping
  } = useVendorNipToMapping();

  const {
    verifyBuyerNip,
    updateBuyerLastUsed
  } = useBuyerNipMapping();

  const {
    saveInvoice
  } = useInvoiceStorage();

  const { 
    getNextSequentialNumber 
  } = useInvoiceCounters();

  /**
   * Process a single OneDrive file using the existing invoice processing pipeline
   */
  const processOneDriveFile = async (
    file: OneDriveFile, 
    blob: Blob,
    clientNumber: string = ''
  ): Promise<ProcessingResult> => {
    const fileId = file.driveItemId;
    
    if (processingFiles.has(fileId)) {
      return { success: false, error: 'Plik jest już przetwarzany' };
    }

    setProcessingFiles(prev => new Set(prev).add(fileId));

    try {
      // Create File object from blob
      const fileObj = new File([blob], file.name, { type: file.mimeType });

      // Extract text from PDF or image
      const invoiceText = await extractTextFromPdf(fileObj);
      
      // Extract basic invoice data
      let vendorName = extractVendorName(invoiceText);
      const vendorNip = extractVendorNip(invoiceText);
      let buyerName = extractBuyerName(invoiceText);
      const rawBuyerNip = extractBuyerNip(invoiceText);
      
      const sanitizeNip = (nip?: string) => {
        const digits = (nip || '').replace(/\D/g, '');
        return digits.length === 10 ? digits : '';
      };
      let buyerNip = sanitizeNip(rawBuyerNip);
      
      const invoiceNumber = extractInvoiceNumber(invoiceText);
      const issueDate = extractIssueDate(invoiceText);
      const dueDate = extractDueDate(invoiceText);
      const paymentMethod = extractPaymentMethod(invoiceText);

      // Verify buyer NIP using three-level verification
      const buyerVerification = verifyBuyerNip(buyerName, buyerNip);
      let finalBuyerNip = buyerNip;
      
      if (!buyerVerification.isValid && buyerVerification.correctedNip) {
        finalBuyerNip = buyerVerification.correctedNip;
        
        // Update buyer name based on corrected NIP
        if (buyerVerification.correctedNip === '8522482321') {
          buyerName = 'TWÓJ INSTALATOR PIOTR MURAWSKI';
        } else if (buyerVerification.correctedNip === '8522669232') {
          buyerName = 'QBORG SPÓŁKA';
        }
      }

      // Check vendor name against NIP mapping
      const vendorNameCheck = checkVendorNameUpdate(vendorName, vendorNip);
      
      if (vendorNameCheck.shouldUpdate) {
        vendorName = vendorNameCheck.suggestedName;
      }

      // Check if we have a mapping for this vendor
      const existingMapping = findVendorMapping(vendorName);
      
      let mpk: string, group: string, category: string | undefined;

      if (existingMapping) {
        // We have a mapping - use it
        mpk = existingMapping.mpk;
        group = existingMapping.group;
        category = existingMapping.category;
        
        // Update last used timestamp
        await updateVendorLastUsed(vendorName);
        
        // Save vendor NIP to mapping assignment for future auto-population
        if (vendorNip) {
          await saveVendorNipToMapping(vendorNip, vendorName, mpk, group, category);
        }
        
        // Update buyer usage tracking if NIP was corrected
        if (buyerVerification.correctedNip) {
          await updateBuyerLastUsed(buyerVerification.correctedNip);
        }
        
      } else {
        // No mapping found - try automatic detection
        let detectedCategory = detectVendorSpecificCategory(vendorName);
        
        // If no vendor-specific rule, try general detection
        if (!detectedCategory || !detectedCategory.detected) {
          detectedCategory = detectInvoiceCategory(vendorName, invoiceText);
        }

        if (detectedCategory.detected && detectedCategory.confidence > 0.7) {
          // High confidence detection - auto-assign and save mapping
          mpk = detectedCategory.mpk;
          group = detectedCategory.group;
          category = detectedCategory.description;
          
          await saveVendorMapping(vendorName, mpk, group, category);
          
          // Save vendor NIP to mapping assignment for future auto-population
          if (vendorNip) {
            await saveVendorNipToMapping(vendorNip, vendorName, mpk, group, category);
          }
          
        } else {
          // Low confidence or no detection - use default values and require manual assignment later
          throw new Error(`Brak mapowania dla sprzedawcy: ${vendorName}. Dodaj mapowanie ręcznie w głównej aplikacji.`);
        }
      }

      // Generate sequential number for this buyer NIP + MPK + Group combination
      const normalizedNip = (finalBuyerNip || '').replace(/[^0-9]/g, '');
      const { number, year } = await getNextSequentialNumber(normalizedNip, mpk, group, vendorName);
      
      // Special formatting for specific buyer NIPs
      let sequentialNumber: string;
      let label: string;
      
      if (normalizedNip === '8522482321') {
        // Extract first alphabetic character from vendor name
        const firstLetter = (vendorName?.trim()?.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/i)?.[0] || 'X').toUpperCase();
        sequentialNumber = `KJ_${firstLetter}_${String(number).padStart(4, '0')}`;
        label = clientNumber ? `${group};${mpk};${sequentialNumber};${clientNumber}` : `${group};${mpk};${sequentialNumber}`;
      } else if (normalizedNip === '8522669232') {
        // Extract first alphabetic character from vendor name
        const firstLetter = (vendorName?.trim()?.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/i)?.[0] || 'X').toUpperCase();
        sequentialNumber = `KT_${firstLetter}_${String(number).padStart(4, '0')}`;
        label = clientNumber ? `${group};${mpk};${sequentialNumber};${clientNumber}` : `${group};${mpk};${sequentialNumber}`;
      } else {
        // Standard formatting for other buyers
        sequentialNumber = `${String(number).padStart(3, '0')}/${year}`;
        label = clientNumber ? `${group};${mpk};${sequentialNumber};${clientNumber}` : `${group};${mpk};${sequentialNumber}`;
      }
      
      const invoiceData: InvoiceData = {
        vendorName,
        vendorNip,
        buyerName,
        buyerNip: finalBuyerNip,
        clientNumber,
        invoiceNumber,
        issueDate,
        dueDate,
        paymentMethod,
        mpk,
        group,
        sequentialNumber,
        label,
        processedAt: Date.now(),
        fileName: file.name,
        source: file.webUrl?.startsWith('local://') ? 'Local' : 'OneDrive', // Detect source based on URL
        sourceFile: file.fullPath // Store original OneDrive path
      };

      // Save to Firebase
      const savedInvoiceId = await saveInvoice(invoiceData);
      
      // Update invoice with Firebase ID
      const invoiceWithId = {
        ...invoiceData,
        id: savedInvoiceId
      };

      return { 
        success: true, 
        invoiceData: invoiceWithId 
      };

    } catch (error) {
      console.error('Error processing OneDrive file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Nieznany błąd przetwarzania' 
      };
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  /**
   * Process multiple OneDrive files in batch
   */
  const processOneDriveFiles = async (
    files: OneDriveFile[],
    downloadFile: (file: OneDriveFile) => Promise<Blob>,
    clientNumber: string = '',
    onProgress?: (processed: number, total: number, currentFile?: string) => void
  ) => {
    const results: ProcessingResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        onProgress?.(i, files.length, file.name);
        
        // Download file
        const blob = await downloadFile(file);
        
        // Process file
        const result = await processOneDriveFile(file, blob, clientNumber);
        results.push(result);
        
        if (result.success) {
          toast({
            title: "Plik przetworzony",
            description: `${file.name} został pomyślnie opisany.`
          });
        } else {
          toast({
            title: "Błąd przetwarzania",
            description: `${file.name}: ${result.error}`,
            variant: "destructive"
          });
        }
        
      } catch (error) {
        const errorResult: ProcessingResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Nieznany błąd'
        };
        results.push(errorResult);
        
        toast({
          title: "Błąd pobierania",
          description: `Nie udało się pobrać ${file.name}`,
          variant: "destructive"
        });
      }
      
      onProgress?.(i + 1, files.length);
    }
    
    const successCount = results.filter(r => r.success).length;
    
    toast({
      title: "Przetwarzanie zakończone",
      description: `Opisano ${successCount} z ${files.length} plików.`,
      variant: successCount === files.length ? "default" : "destructive"
    });
    
    return results;
  };

  return {
    processOneDriveFile,
    processOneDriveFiles,
    processingFiles
  };
};