import { useState } from 'react';
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
import { useBuyerNipMapping } from '@/hooks/useBuyerNipMapping';
import { useInvoiceStorage } from '@/hooks/useInvoiceStorage';
import { useInvoiceCounters } from '@/hooks/useInvoiceCounters';
import { extractTextFromPdf, extractVendorName, extractVendorNip, extractBuyerName, extractBuyerNip, extractInvoiceNumber, extractIssueDate, extractDueDate, extractPaymentMethod } from '@/utils/pdfProcessor';
import { detectInvoiceCategory, detectVendorSpecificCategory, type CategoryMatch } from '@/utils/categoryDetector';
import { InvoiceData, type PendingInvoiceData } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';

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
    verifyBuyerNip,
    saveBuyerMapping,
    updateBuyerLastUsed
  } = useBuyerNipMapping();

  const {
    savedInvoices,
    saveInvoice,
    updateInvoice,
    deleteInvoice,
    loading: invoiceStorageLoading
  } = useInvoiceStorage();

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
      const buyerNip = extractBuyerNip(invoiceText);
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

      // Check if we have a mapping for this vendor
      const existingMapping = findVendorMapping(vendorName);
      
      if (existingMapping) {
        // We have a mapping - proceed with processing
          await finishProcessing(vendorName, vendorNip, buyerName, finalBuyerNip, clientNumber, invoiceNumber, existingMapping.mpk, existingMapping.group, existingMapping.category, issueDate, dueDate, paymentMethod);
        
        // Update last used timestamp
        await updateVendorLastUsed(vendorName);
        
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
      // Generate sequential number for this buyer NIP + MPK + Group combination
      const { number, year } = await getNextSequentialNumber(buyerNip, mpk, group, vendorName);
      
      // Special formatting for buyer NIP 8522482321
      let sequentialNumber: string;
      let label: string;
      
      if (buyerNip === '8522482321') {
        const firstLetter = vendorName.charAt(0).toUpperCase();
        sequentialNumber = `KJ_${firstLetter}_${String(number).padStart(4, '0')}`;
        label = clientNumber ? `${group};${mpk};${sequentialNumber};${clientNumber}` : `${group};${mpk};${sequentialNumber}`;
      } else if (buyerNip === '8522669232') {
        const firstLetter = vendorName.charAt(0).toUpperCase();
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
      // Import pdf-lib dynamically
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      let pdfToAnnotate: File | undefined;
      
      // First try to get file from storage
      if (invoice.fileName && fileStorage.has(invoice.fileName)) {
        pdfToAnnotate = fileStorage.get(invoice.fileName);
      } 
      // Then check if selectedFile matches
      else if (selectedFile && selectedFile.name === invoice.fileName) {
        pdfToAnnotate = selectedFile;
      } 
      // If no file available, show message
      else {
        toast({
          variant: "destructive",
          title: "Plik niedostępny",
          description: "Aby pobrać opisaną fakturę, proszę ponownie wybrać oryginalny plik PDF"
        });
        return;
      }

      if (!pdfToAnnotate) return;

      const arrayBuffer = await pdfToAnnotate.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Get the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Embed font
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Prepare label text (use the complete label that includes client number if present)
      const labelText = invoice.label;
      
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
      link.download = `${invoice.fileName?.replace('.pdf', '')}_opisana.pdf` || `faktura_${invoice.sequentialNumber}_opisana.pdf`;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      
      toast({
        title: "Faktura opisana",
        description: `Pobrano plik z etykietą: ${labelText}`
      });
      
    } catch (error) {
      console.error('Error annotating PDF:', error);
      toast({
        variant: "destructive",
        title: "Błąd opisywania",
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
      {processedInvoices.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Przetworzone faktury ({processedInvoices.length})
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
            <div className="space-y-3">
              {processedInvoices.map((invoice, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{invoice.vendorName}</p>
                      <p className="text-sm text-muted-foreground">
                        Faktura: {invoice.invoiceNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {invoice.group} – {invoice.mpk} – {invoice.sequentialNumber}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAnnotatedInvoice(invoice)}
                        title="Pobierz fakturę z etykietą"
                      >
                        <FileImage className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {invoice.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span>Sprzedawca: {invoice.vendorName}</span>
                        {invoice.vendorNip && (
                          <>
                            <br />
                            <span>NIP sprzedawcy: {invoice.vendorNip}</span>
                          </>
                        )}
                      </div>
                       <div>
                         <span>Nabywca: {
                           // Display correct buyer name based on NIP
                           invoice.buyerNip === '8522482321' ? 'TWÓJ INSTALATOR PIOTR MURAWSKI' :
                           invoice.buyerNip === '8522669232' ? 'QBORG SPÓŁKA' :
                           invoice.buyerName
                         }</span>
                         <br />
                         <span>NIP nabywcy: {invoice.buyerNip}</span>
                       </div>
                     </div>
                     {(invoice.clientNumber || invoice.issueDate || invoice.dueDate || invoice.paymentMethod) && (
                       <div className="text-xs text-muted-foreground mt-1">
                         {invoice.clientNumber && <span>Numer klienta: {invoice.clientNumber} </span>}
                         {invoice.issueDate && <span>Data wystawienia: {invoice.issueDate} </span>}
                         {invoice.dueDate && <span>Termin płatności: {invoice.dueDate} </span>}
                         {invoice.paymentMethod && <span>Płatność: {invoice.paymentMethod}</span>}
                       </div>
                     )}
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