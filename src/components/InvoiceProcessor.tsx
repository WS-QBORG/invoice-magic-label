import { useState } from 'react';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, Download, CheckCircle2, AlertCircle, Loader2, Edit2, Trash2, FileImage } from 'lucide-react';
import { EditInvoiceDialog } from './EditInvoiceDialog';
import { VendorMappingDialog } from './VendorMappingDialog';
import { useFirebaseVendors } from '@/hooks/useFirebaseVendors';
import { useVendorNipMapping } from '@/hooks/useVendorNipMapping';
import { useVendorNipToMapping } from '@/hooks/useVendorNipToMapping';
import { useBuyerNipMapping } from '@/hooks/useBuyerNipMapping';
import { useInvoiceStorage } from '@/hooks/useInvoiceStorage';
import { useInvoiceCounters } from '@/hooks/useInvoiceCounters';
import { extractTextFromPdf, extractVendorName, extractVendorNip, extractBuyerName, extractBuyerNip, extractInvoiceNumber, extractIssueDate, extractDueDate, extractPaymentMethod } from '@/utils/pdfProcessor';
import { detectInvoiceCategory, detectVendorSpecificCategory, type CategoryMatch } from '@/utils/categoryDetector';
import { InvoiceData, type PendingInvoiceData } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Main component for processing invoices
 * Handles file upload, text extraction, vendor mapping, and Firebase integration
 */
export function InvoiceProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processedInvoices, setProcessedInvoices] = useState<InvoiceData[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [currentVendor, setCurrentVendor] = useState<string>('');
  const [suggestedMapping, setSuggestedMapping] = useState<CategoryMatch | null>(null);
  const [pendingInvoiceData, setPendingInvoiceData] = useState<PendingInvoiceData | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceData | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [fileStorage, setFileStorage] = useState<Map<string, File>>(new Map()); // Store original files
  const [resetNip, setResetNip] = useState('');
  const [resetNumber, setResetNumber] = useState('');
  const [clientNumber, setClientNumber] = useState('');

  const { toast } = useToast();
  const { 
    findVendorMapping, 
    saveVendorMapping, 
    updateVendorLastUsed, 
    loading: vendorsLoading 
  } = useFirebaseVendors();
  
  const { 
    getNextSequentialNumber, 
    resetCounter,
    loading: countersLoading 
  } = useInvoiceCounters();

  // Reset counter for custom NIP and number
  const handleCustomResetCounter = async () => {
    if (!resetNip || !resetNumber) {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Podaj NIP i numer startowy"
      });
      return;
    }

    try {
      const startNumber = parseInt(resetNumber) - 1; // Subtract 1 so next invoice gets the desired number
      await resetCounter(resetNip, '', '', startNumber);
      toast({
        title: "Licznik zresetowany",
        description: `Licznik dla NIP ${resetNip} został ustawiony. Następny numer: ${resetNumber}`
      });
      setResetNip('');
      setResetNumber('');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Nie udało się zresetować licznika"
      });
    }
  };

  const {
    findVendorNameByNip,
    saveVendorNipMapping,
    checkVendorNameUpdate,
    loading: nipMappingLoading
  } = useVendorNipMapping();

  const {
    findVendorMappingByNip,
    saveVendorNipMapping: saveVendorNipToMapping,
    updateVendorNipMappingLastUsed
  } = useVendorNipToMapping();

  const {
    verifyBuyerNip,
    saveBuyerMapping,
    updateBuyerLastUsed
  } = useBuyerNipMapping();

  const {
    savedInvoices,
    saveInvoice,
    updateInvoice,
    deleteInvoice,
    reloadInvoices,
    loading: invoiceStorageLoading
  } = useInvoiceStorage();

  // Listen for events from local folder processing
  React.useEffect(() => {
    const handleInvoicesProcessed = () => {
      // Reload invoices when local files are processed
      reloadInvoices();
    };

    window.addEventListener('invoicesProcessed', handleInvoicesProcessed);
    return () => window.removeEventListener('invoicesProcessed', handleInvoicesProcessed);
  }, [reloadInvoices]);

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isValidType = file.type === 'application/pdf' || file.type.startsWith('image/');
      if (isValidType) {
        setSelectedFile(file);
      } else {
        toast({
          variant: "destructive",
          title: "Nieprawidłowy format",
          description: "Proszę wybrać plik PDF lub obraz (JPG, PNG)."
        });
      }
    }
  };

  /**
   * Process the selected invoice file
   */
  const processInvoice = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Brak pliku",
        description: "Proszę wybrać plik PDF lub obraz z fakturą."
      });
      return;
    }

    setProcessing(true);

    try {
      // Extract text from PDF
      const invoiceText = await extractTextFromPdf(selectedFile);
      
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
        console.log('🔧 Buyer NIP correction suggested:', {
          original: buyerNip,
          corrected: buyerVerification.correctedNip,
          matchedBy: buyerVerification.matchedBy,
          confidence: buyerVerification.confidence
        });
        
        finalBuyerNip = buyerVerification.correctedNip;
        
        // Update buyer name based on corrected NIP
        if (buyerVerification.correctedNip === '8522482321') {
          buyerName = 'TWÓJ INSTALATOR PIOTR MURAWSKI';
        } else if (buyerVerification.correctedNip === '8522669232') {
          buyerName = 'QBORG SPÓŁKA';
        }
        
        toast({
          title: "NIP nabywcy poprawiony",
          description: `Wykryto: ${buyerVerification.matchedBy === 'name' ? 'po nazwie' : 'po adresie'} (${Math.round(buyerVerification.confidence * 100)}% pewności)`
        });
      }

      console.log('📄 Extracted invoice data:', {
        vendorName,
        vendorNip,
        buyerName,
        buyerNip: finalBuyerNip,
        invoiceNumber,
        issueDate,
        dueDate,
        paymentMethod
      });

      // Check vendor name against NIP mapping
      const vendorNameCheck = checkVendorNameUpdate(vendorName, vendorNip);
      
      if (vendorNameCheck.shouldUpdate) {
        console.log('🔄 Using saved vendor name for NIP:', vendorNip, '→', vendorNameCheck.suggestedName);
        vendorName = vendorNameCheck.suggestedName;
        
        toast({
          title: "Użyto zapisanej nazwy sprzedawcy",
          description: `Dla NIP ${vendorNip}: ${vendorNameCheck.suggestedName}`
        });
      }

      // If buyer data is missing, try to reuse last saved buyer for this vendor
      {
        const norm = (s: string | undefined) => s ? s.toLowerCase().replace(/\s+/g, ' ').trim() : '';
        const isNipMissing = !finalBuyerNip || finalBuyerNip.trim() === '' || finalBuyerNip.replace(/\D/g, '').length !== 10;
        console.log('🔍 Buyer lookup debug:', { 
          vendorName, 
          finalBuyerNip, 
          isNipMissing,
          processedInvoicesCount: processedInvoices.length,
          savedInvoicesCount: savedInvoices.length
        });
        
        if (isNipMissing && vendorName) {
          // Log all vendors to debug matching
          console.log('📋 Available vendors in processed:', processedInvoices.map(inv => ({ name: inv.vendorName, buyerNip: inv.buyerNip })));
          console.log('📋 Available vendors in saved:', savedInvoices.slice(0, 5).map(inv => ({ name: inv.vendorName, buyerNip: inv.buyerNip })));
          
          const lastInvoiceForVendor =
            processedInvoices.find((inv) => {
              const matches = norm(inv.vendorName) === norm(vendorName) && !!inv.buyerNip;
              console.log(`🔄 Checking processed: "${inv.vendorName}" vs "${vendorName}" = ${matches}, buyerNip: ${inv.buyerNip}`);
              return matches;
            }) ||
            savedInvoices.find((inv) => {
              const matches = norm(inv.vendorName) === norm(vendorName) && !!inv.buyerNip;
              if (matches) console.log(`✅ Found match in saved: "${inv.vendorName}" → buyer: ${inv.buyerName} (${inv.buyerNip})`);
              return matches;
            });
            
          if (lastInvoiceForVendor) {
            buyerName = lastInvoiceForVendor.buyerName;
            finalBuyerNip = lastInvoiceForVendor.buyerNip;
            console.log('↩️ Reused buyer from history for vendor', vendorName, '→', { buyerName, buyerNip: finalBuyerNip });
            toast({ title: 'Użyto zapisanych danych nabywcy', description: `${lastInvoiceForVendor.buyerName} (${lastInvoiceForVendor.buyerNip})` });
          } else {
            console.log('❌ No previous buyer found for vendor:', vendorName);
          }
        }
      }

      // Check if we have a mapping for this vendor
      const existingMapping = findVendorMapping(vendorName);
      
      if (existingMapping) {
        // We have a mapping - proceed with processing
        await finishProcessing(vendorName, vendorNip, buyerName, finalBuyerNip, clientNumber, invoiceNumber, existingMapping.mpk, existingMapping.group, existingMapping.category, issueDate, dueDate, paymentMethod);
        
        // Update last used timestamp
        await updateVendorLastUsed(vendorName);
        
        // Save vendor NIP to mapping assignment for future auto-population
        if (vendorNip) {
          await saveVendorNipToMapping(vendorNip, vendorName, existingMapping.mpk, existingMapping.group, existingMapping.category);
        }
        
        // Update buyer usage tracking if NIP was corrected
        if (buyerVerification.correctedNip) {
          await updateBuyerLastUsed(buyerVerification.correctedNip);
        }
        
      } else {
        // No mapping found - try automatic detection
        console.log('🔍 No mapping found, trying automatic detection...');
        
        // Try vendor-specific detection first
        let detectedCategory = detectVendorSpecificCategory(vendorName);
        
        // If no vendor-specific rule, try general detection
        if (!detectedCategory || !detectedCategory.detected) {
          detectedCategory = detectInvoiceCategory(vendorName, invoiceText);
        }

        if (detectedCategory.detected && detectedCategory.confidence > 0.7) {
          // High confidence detection - auto-assign and save mapping
          console.log('✅ High confidence detection:', detectedCategory);
          
          await saveVendorMapping(
            vendorName, 
            detectedCategory.mpk, 
            detectedCategory.group, 
            detectedCategory.description
          );
          
          await finishProcessing(vendorName, vendorNip, buyerName, finalBuyerNip, clientNumber, invoiceNumber, detectedCategory.mpk, detectedCategory.group, detectedCategory.description, issueDate, dueDate, paymentMethod);
          
          // Save vendor NIP to mapping assignment for future auto-population
          if (vendorNip) {
            await saveVendorNipToMapping(vendorNip, vendorName, detectedCategory.mpk, detectedCategory.group, detectedCategory.description);
          }
          
          toast({
            title: "Automatyczne przypisanie",
            description: `Sprzedawca automatycznie przypisany do kategorii: ${detectedCategory.description}`
          });
          
        } else {
          // Low confidence or no detection - ask user
          console.log('❓ Low confidence detection, asking user...');
          
          setCurrentVendor(vendorName);
          setSuggestedMapping(detectedCategory);
          setPendingInvoiceData({ vendorName, vendorNip, buyerName, buyerNip: finalBuyerNip, clientNumber, invoiceNumber, issueDate, dueDate, paymentMethod });
          setShowMappingDialog(true);
        }
      }

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        variant: "destructive",
        title: "Błąd przetwarzania",
        description: error instanceof Error ? error.message : "Nie udało się przetworzyć faktury"
      });
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Complete invoice processing with MPK and Group assigned
   */
  const finishProcessing = async (
    vendorName: string,
    vendorNip: string | undefined,
    buyerName: string, 
    buyerNip: string,
    clientNumber: string,
    invoiceNumber: string,
    mpk: string,
    group: string,
    category?: string,
    issueDate?: string,
    dueDate?: string,
    paymentMethod?: string
  ) => {
    try {
      console.log('🚀 finishProcessing started:', { 
        vendorName, 
        buyerNip, 
        mpk, 
        group,
        vendorNameLength: vendorName?.length,
        buyerNipLength: buyerNip?.length 
      });
      
      // Generate sequential number for this buyer NIP + MPK + Group combination
      console.log('📊 Calling getNextSequentialNumber...');
      // Normalize NIP to digits-only to avoid mismatch (spaces/dashes)
      const normalizedNip = (buyerNip || '').replace(/[^0-9]/g, '');
      const { number, year } = await getNextSequentialNumber(normalizedNip, mpk, group, vendorName);
      console.log('📊 Got counter result:', { number, year });
      
      // Special formatting for specific buyer NIPs
      let sequentialNumber: string;
      let label: string;
      
      console.log('🔍 NIP check:', { 
        buyerNip, 
        normalizedNip,
        type: typeof buyerNip, 
        trimmed: buyerNip?.trim(),
        equals8522482321: normalizedNip === '8522482321',
        equals8522669232: normalizedNip === '8522669232'
      });
      
      if (normalizedNip === '8522482321') {
        // Extract first alphabetic character from vendor name
        const firstLetter = (vendorName?.trim()?.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/i)?.[0] || 'X').toUpperCase();
        console.log('🏷️ Etykieta debug:', { buyerName, buyerNip, normalizedNip, firstLetter, vendorName });
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
        buyerNip,
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
        fileName: selectedFile?.name
      };

      // Store the file for later use
      if (selectedFile && invoiceData.fileName) {
        setFileStorage(prev => new Map(prev.set(invoiceData.fileName!, selectedFile)));
      }

      // Save to Firebase and get the ID
      const savedInvoiceId = await saveInvoice(invoiceData);
      
      // Update invoice with Firebase ID
      const invoiceWithId = {
        ...invoiceData,
        id: savedInvoiceId
      };

      // Add to processed invoices list with ID
      setProcessedInvoices(prev => [invoiceWithId, ...prev]);
      
      toast({
        title: "Faktura przetworzona i zapisana",
        description: buyerNip === '8522482321' 
          ? `Przypisano etykietę: ${group} – ${mpk} – ${sequentialNumber}`
          : `Przypisano etykietę: ${group} – ${mpk} – ${sequentialNumber}`
      });

      // Clear selected file and client number
      setSelectedFile(null);
      setClientNumber('');
      
    } catch (error) {
      console.error('Error finishing processing:', error);
      throw error;
    }
  };

  /**
   * Handle manual vendor mapping from dialog
   */
  const handleManualMapping = async (mpk: string, group: string, category?: string, manualVendorName?: string) => {
    if (!pendingInvoiceData) return;

    try {
      // Use manual vendor name if provided, otherwise use current vendor
      const vendorNameToSave = manualVendorName || currentVendor;
      
      // Save the mapping for future use
      await saveVendorMapping(vendorNameToSave, mpk, group, category);
      
      // Save NIP → vendor name mapping if we have a vendor NIP
      if (pendingInvoiceData.vendorNip && manualVendorName) {
        await saveVendorNipMapping(pendingInvoiceData.vendorNip, manualVendorName);
        
        toast({
          title: "Zapisano mapowanie NIP",
          description: `NIP ${pendingInvoiceData.vendorNip} → ${manualVendorName}`
        });
      }
      
      // Save vendor NIP to mapping assignment for future auto-population
      if (pendingInvoiceData.vendorNip) {
        await saveVendorNipToMapping(pendingInvoiceData.vendorNip, vendorNameToSave, mpk, group, category);
      }
      
      // Complete processing with the assigned values
      await finishProcessing(
        manualVendorName || pendingInvoiceData.vendorName,
        pendingInvoiceData.vendorNip,
        pendingInvoiceData.buyerName,
        pendingInvoiceData.buyerNip,
        pendingInvoiceData.clientNumber || '',
        pendingInvoiceData.invoiceNumber,
        mpk,
        group,
        category,
        pendingInvoiceData.issueDate,
        pendingInvoiceData.dueDate,
        pendingInvoiceData.paymentMethod
      );
      
      // Clear pending data
      setPendingInvoiceData(null);
      setCurrentVendor('');
      setSuggestedMapping(null);
      
    } catch (error) {
      console.error('Error saving manual mapping:', error);
      toast({
        variant: "destructive",
        title: "Błąd zapisywania",
        description: "Nie udało się zapisać mapowania"
      });
    }
  };

  /**
   * Handle editing an invoice
   */
  const handleEditInvoice = (invoice: InvoiceData) => {
    setEditingInvoice(invoice);
    setShowEditDialog(true);
  };

  /**
   * Handle saving edited invoice
   */
  const handleSaveEditedInvoice = async (updatedInvoice: InvoiceData) => {
    if (!updatedInvoice.id) {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Nie można edytować faktury bez ID"
      });
      return;
    }

    try {
      // Find original invoice to compare changes
      const originalInvoice = processedInvoices.find(inv => inv.id === updatedInvoice.id);
      
      // Check if vendor name was changed and we have vendor NIP
      if (originalInvoice && 
          updatedInvoice.vendorNip && 
          originalInvoice.vendorName !== updatedInvoice.vendorName) {
        
        // Save new NIP → vendor name mapping
        await saveVendorNipMapping(updatedInvoice.vendorNip, updatedInvoice.vendorName);
        
        toast({
          title: "Zapisano mapowanie NIP",
          description: `NIP ${updatedInvoice.vendorNip} → ${updatedInvoice.vendorName}`
        });
      }

      // Check if buyer data changed and save buyer mapping for future detection
      if (originalInvoice && (
          originalInvoice.buyerNip !== updatedInvoice.buyerNip ||
          originalInvoice.buyerName !== updatedInvoice.buyerName
        )) {
        try {
          await saveBuyerMapping(updatedInvoice.buyerNip, updatedInvoice.buyerName);
          toast({ title: "Zapisano nabywcę", description: `NIP ${updatedInvoice.buyerNip} → ${updatedInvoice.buyerName}` });
        } catch (e) {
          console.error('❌ Error saving buyer mapping:', e);
        }
      }

      // Update invoice in Firebase
      await updateInvoice(updatedInvoice.id, updatedInvoice);
      
      // Update local state
      setProcessedInvoices(prev => 
        prev.map(invoice => 
          invoice.id === updatedInvoice.id ? updatedInvoice : invoice
        )
      );

      toast({
        title: "Faktura zaktualizowana",
        description: "Zmiany zostały zapisane w bazie danych"
      });

      setShowEditDialog(false);
      setEditingInvoice(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd aktualizacji",
        description: "Nie udało się zapisać zmian"
      });
    }
  };

  /**
   * Handle deleting an invoice
   */
  const handleDeleteInvoice = async (invoice: InvoiceData) => {
    if (!invoice.id) return;

    try {
      await deleteInvoice(invoice.id);
      
      // Update local state
      setProcessedInvoices(prev => prev.filter(inv => inv.id !== invoice.id));

      toast({
        title: "Faktura usunięta",
        description: "Faktura została usunięta z bazy danych"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd usuwania",
        description: "Nie udało się usunąć faktury"
      });
    }
  };

  /**
   * Export processed invoices to Excel
   */
  const exportToExcel = () => {
    if (processedInvoices.length === 0) {
      toast({
        variant: "destructive",
        title: "Brak danych",
        description: "Przetworz co najmniej jedną fakturę przed eksportem"
      });
      return;
    }

    try {
      // Import xlsx dynamically for better bundle splitting
      import('xlsx').then((XLSX) => {
        // Prepare data for Excel
        const excelData = processedInvoices.map(invoice => ({
          'Nazwa sprzedawcy': invoice.vendorName,
          'NIP sprzedawcy': invoice.vendorNip || '',
          'Nazwa nabywcy': invoice.buyerName,
          'NIP nabywcy': invoice.buyerNip,
          'Numer klienta': invoice.clientNumber || '',
          'Numer faktury': invoice.invoiceNumber,
          'Data wystawienia': invoice.issueDate || '',
          'Termin płatności': invoice.dueDate || '',
          'Sposób płatności': invoice.paymentMethod || '',
          'MPK': invoice.mpk,
          'Grupa': invoice.group,
          'Numer kolejny': invoice.sequentialNumber,
          'Etykieta': invoice.label,
          'Data przetworzenia': new Date(invoice.processedAt).toLocaleDateString('pl-PL'),
          'Plik źródłowy': invoice.fileName || ''
        }));

        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        // Create worksheet from data
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set column widths for better readability
        const columnWidths = [
          { wch: 25 }, // Nazwa sprzedawcy
          { wch: 15 }, // NIP sprzedawcy
          { wch: 25 }, // Nazwa nabywcy
          { wch: 15 }, // NIP nabywcy
          { wch: 20 }, // Numer faktury
          { wch: 15 }, // Data wystawienia
          { wch: 15 }, // Termin płatności
          { wch: 18 }, // Sposób płatności
          { wch: 10 }, // MPK
          { wch: 8 },  // Grupa
          { wch: 15 }, // Numer kolejny
          { wch: 25 }, // Etykieta
          { wch: 15 }, // Data przetworzenia
          { wch: 20 }  // Plik źródłowy
        ];
        worksheet['!cols'] = columnWidths;

        // Style header row (make it bold and with background)
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!worksheet[cellAddress]) continue;
          
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { bgColor: { indexed: 64 }, fgColor: { rgb: "FFFF00" } },
            alignment: { horizontal: "center" }
          };
        }

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Faktury');

        // Generate filename with current date
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        const filename = `Raport_Faktury_${dateStr}.xlsx`;

        // Save file
        XLSX.writeFile(workbook, filename);

        toast({
          title: "Eksport zakończony",
          description: `Zapisano plik: ${filename}`
        });
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Błąd eksportu",
        description: "Nie udało się wyeksportować danych do Excel"
      });
    }
  };

  const isLoading = processing || vendorsLoading || countersLoading || nipMappingLoading || invoiceStorageLoading;

  // One-time reset for specific NIP to start from 0125
  const resetSpecialCounter = async () => {
    try {
      await resetCounter('8522482321', 'MPK510', '1/41', 125);
      toast({
        title: "Licznik zresetowany",
        description: "Następny numer będzie KJ_I_0126"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd resetowania",
        description: "Nie udało się zresetować licznika"
      });
    }
  };

  /**
   * Add label to PDF and download annotated version
   */
  const downloadAnnotatedInvoice = async (invoice: InvoiceData) => {
    try {
      let fileToAnnotate: File | undefined;
      
      // First try to get file from storage
      if (invoice.fileName && fileStorage.has(invoice.fileName)) {
        fileToAnnotate = fileStorage.get(invoice.fileName);
      } 
      // Then check if selectedFile matches
      else if (selectedFile && selectedFile.name === invoice.fileName) {
        fileToAnnotate = selectedFile;
      } 
      // If no file available, show message
      else {
        toast({
          variant: "destructive",
          title: "Plik niedostępny",
          description: "Aby pobrać opisaną fakturę, proszę ponownie wybrać oryginalny plik"
        });
        return;
      }

      if (!fileToAnnotate) return;

      const labelText = invoice.label;

      // Handle PDF files
      if (fileToAnnotate.type === 'application/pdf') {
        const arrayBuffer = await fileToAnnotate.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        // Get the first page
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        
        // Embed font
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Add label to top right corner
        firstPage.drawText(labelText, {
          x: width - 200,
          y: height - 30,
          size: 12,
          font: font,
          color: rgb(0.8, 0, 0), // Red color
        });
        
        // Add label to bottom right corner as backup
        firstPage.drawText(labelText, {
          x: width - 200,
          y: 30,
          size: 10,
          font: font,
          color: rgb(0.8, 0, 0), // Red color
        });
        
        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        
        // Create download link
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // Replace invalid filename characters
        const safeFileName = invoice.label.replace(/[;:/\\*?"<>|]/g, '_');
        link.download = `${safeFileName}.pdf`;
        console.log('📥 Downloading PDF with filename:', `${safeFileName}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
      } 
      // Handle image files (JPG, PNG)
      else if (fileToAnnotate.type.startsWith('image/')) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          // Set canvas size to image size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the original image
          ctx!.drawImage(img, 0, 0);
          
          // Set up text styling
          const fontSize = Math.max(16, Math.min(img.width / 30, 24));
          ctx!.font = `bold ${fontSize}px Arial`;
          ctx!.fillStyle = '#CC0000'; // Red color
          ctx!.strokeStyle = '#FFFFFF'; // White outline
          ctx!.lineWidth = 2;
          
          // Measure text width
          const textMetrics = ctx!.measureText(labelText);
          const textWidth = textMetrics.width;
          
          // Position text in top right corner
          const x = img.width - textWidth - 20;
          const y = 40;
          
          // Draw text with outline
          ctx!.strokeText(labelText, x, y);
          ctx!.fillText(labelText, x, y);
          
          // Also add at bottom right as backup
          const bottomY = img.height - 20;
          ctx!.strokeText(labelText, x, bottomY);
          ctx!.fillText(labelText, x, bottomY);
          
          // Convert canvas to blob and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              const extension = fileToAnnotate!.type.includes('png') ? 'png' : 'jpg';
              // Replace invalid filename characters
              const safeFileName = invoice.label.replace(/[;:/\\*?"<>|]/g, '_');
              link.download = `${safeFileName}.${extension}`;
              console.log('📥 Downloading image with filename:', `${safeFileName}.${extension}`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          }, fileToAnnotate.type);
        };
        
        // Load image from file
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(fileToAnnotate);
        
      } else {
        toast({
          variant: "destructive",
          title: "Nieobsługiwany format", 
          description: "Obsługiwane formaty: PDF, JPG, PNG"
        });
        return;
      }

      toast({
        title: "Pobieranie opisanej faktury",
        description: "Plik z etykietą zostanie pobrany za chwilę"
      });

    } catch (error) {
      console.error('Error annotating PDF:', error);
      toast({
        variant: "destructive",
        title: "Błąd przy opisywaniu",
        description: "Nie udało się opisać faktury"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Wgraj fakturę
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice-file">Wybierz plik PDF lub obraz (JPG, PNG)</Label>
            <Input
              id="invoice-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="client-number">Numer klienta (opcjonalnie)</Label>
            <Input
              id="client-number"
              type="text"
              placeholder="np. KL001, A123..."
              value={clientNumber}
              onChange={(e) => setClientNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {selectedFile && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Wybrany plik: <strong>{selectedFile.name}</strong>
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={processInvoice}
            disabled={!selectedFile || isLoading}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Przetwarzanie...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Przetwórz fakturę
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Processed Invoices */}
      {(processedInvoices.length > 0 || savedInvoices.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Wszystkie przetworzone faktury ({processedInvoices.length + savedInvoices.length})
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-2 items-end">
                <div>
                  <Label htmlFor="reset-nip" className="text-xs">NIP</Label>
                  <Input
                    id="reset-nip"
                    placeholder="NIP nabywcy"
                    value={resetNip}
                    onChange={(e) => setResetNip(e.target.value)}
                    className="w-32 h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="reset-number" className="text-xs">Następny numer</Label>
                  <Input
                    id="reset-number"
                    placeholder="np. 0124"
                    value={resetNumber}
                    onChange={(e) => setResetNumber(e.target.value)}
                    className="w-24 h-8"
                  />
                </div>
                <Button onClick={handleCustomResetCounter} variant="outline" size="sm">
                  Reset licznik
                </Button>
              </div>
              <Button onClick={exportToExcel} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Eksportuj do Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {/* Current session processed invoices */}
              {processedInvoices.map((invoice, index) => (
                <div key={invoice.id || `processed-${index}`} className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{invoice.vendorName}</div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.buyerName} • NIP: {invoice.buyerNip}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Źródło: {invoice.source || 'Lokalne'} • {invoice.fileName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {invoice.label}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditInvoice(invoice)}
                          disabled={!invoice.id}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAnnotatedInvoice(invoice)}
                          disabled={!invoice.fileName}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice)}
                          disabled={!invoice.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Faktura:</span><br />
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">MPK:</span><br />
                      <span className="font-medium">{invoice.mpk}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Grupa:</span><br />
                      <span className="font-medium">{invoice.group}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data:</span><br />
                      <span className="font-medium">{invoice.issueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Previously saved invoices */}
              {savedInvoices.slice(0, 20).map((invoice, index) => (
                <div key={invoice.id || `saved-${index}`} className="bg-background border p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{invoice.vendorName}</div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.buyerName} • NIP: {invoice.buyerNip}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Źródło: {invoice.source || 'Nieznane'} • {invoice.fileName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {invoice.label}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditInvoice(invoice)}
                          disabled={!invoice.id}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAnnotatedInvoice(invoice)}
                          disabled={!invoice.fileName}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice)}
                          disabled={!invoice.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Faktura:</span><br />
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">MPK:</span><br />
                      <span className="font-medium">{invoice.mpk}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Grupa:</span><br />
                      <span className="font-medium">{invoice.group}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data:</span><br />
                      <span className="font-medium">{invoice.issueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor Mapping Dialog */}
      <VendorMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        onSave={handleManualMapping}
        vendorName={currentVendor}
        suggestedMpk={suggestedMapping?.mpk}
        suggestedGroup={suggestedMapping?.group}
        suggestedCategory={suggestedMapping?.description}
        confidence={suggestedMapping?.confidence}
      />

      {/* Edit Invoice Dialog */}
      <EditInvoiceDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingInvoice(null);
        }}
        onSave={handleSaveEditedInvoice}
        invoice={editingInvoice}
      />
    </div>
  );
}