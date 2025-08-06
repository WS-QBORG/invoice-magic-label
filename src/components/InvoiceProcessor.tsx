import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { VendorMappingDialog } from './VendorMappingDialog';
import { useFirebaseVendors } from '@/hooks/useFirebaseVendors';
import { useVendorNipMapping } from '@/hooks/useVendorNipMapping';
import { useInvoiceCounters } from '@/hooks/useInvoiceCounters';
import { extractTextFromPdf, extractVendorName, extractVendorNip, extractBuyerName, extractBuyerNip, extractInvoiceNumber } from '@/utils/pdfProcessor';
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

  const { toast } = useToast();
  const { 
    findVendorMapping, 
    saveVendorMapping, 
    updateVendorLastUsed, 
    loading: vendorsLoading 
  } = useFirebaseVendors();
  
  const { 
    getNextSequentialNumber, 
    loading: countersLoading 
  } = useInvoiceCounters();

  const {
    findVendorNameByNip,
    saveVendorNipMapping,
    checkVendorNameUpdate,
    loading: nipMappingLoading
  } = useVendorNipMapping();

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
      const buyerName = extractBuyerName(invoiceText);
      const buyerNip = extractBuyerNip(invoiceText);
      const invoiceNumber = extractInvoiceNumber(invoiceText);

      console.log('📄 Extracted invoice data:', {
        vendorName,
        vendorNip,
        buyerName,
        buyerNip,
        invoiceNumber
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
        await finishProcessing(vendorName, vendorNip, buyerName, buyerNip, invoiceNumber, existingMapping.mpk, existingMapping.group, existingMapping.category);
        
        // Update last used timestamp
        await updateVendorLastUsed(vendorName);
        
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
          
          await finishProcessing(vendorName, vendorNip, buyerName, buyerNip, invoiceNumber, detectedCategory.mpk, detectedCategory.group, detectedCategory.description);
          
          toast({
            title: "Automatyczne przypisanie",
            description: `Sprzedawca automatycznie przypisany do kategorii: ${detectedCategory.description}`
          });
          
        } else {
          // Low confidence or no detection - ask user
          console.log('❓ Low confidence detection, asking user...');
          
          setCurrentVendor(vendorName);
          setSuggestedMapping(detectedCategory);
          setPendingInvoiceData({ vendorName, vendorNip, buyerName, buyerNip, invoiceNumber });
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
    invoiceNumber: string,
    mpk: string,
    group: string,
    category?: string
  ) => {
    try {
      // Generate sequential number for this buyer NIP + MPK + Group combination
      const { number, year } = await getNextSequentialNumber(buyerNip, mpk, group);
      
      // Format sequential number with leading zeros
      const sequentialNumber = `${String(number).padStart(3, '0')}/${year}`;
      
      // Create complete label
      const label = `${group};${mpk};${sequentialNumber}`;
      
      const invoiceData: InvoiceData = {
        vendorName,
        vendorNip,
        buyerName,
        buyerNip,
        invoiceNumber,
        mpk,
        group,
        sequentialNumber,
        label,
        processedAt: Date.now(),
        fileName: selectedFile?.name
      };

      // Add to processed invoices list
      setProcessedInvoices(prev => [invoiceData, ...prev]);
      
      toast({
        title: "Faktura przetworzona",
        description: `Przypisano etykietę: ${group} – ${mpk} – ${sequentialNumber}`
      });

      // Clear selected file
      setSelectedFile(null);
      
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
        pendingInvoiceData.invoiceNumber,
        mpk,
        group,
        category
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

    // Create CSV content (simplified Excel export)
    const headers = [
      'Nazwa kontrahenta',
      'Nazwa nabywcy', 
      'NIP nabywcy',
      'Numer faktury',
      'MPK',
      'Grupa',
      'Numer kolejny',
      'Etykieta',
      'Data przetworzenia'
    ];
    
    const csvContent = [
      headers.join(','),
      ...processedInvoices.map(invoice => [
        `"${invoice.vendorName}"`,
        `"${invoice.buyerName}"`,
        invoice.buyerNip,
        `"${invoice.invoiceNumber}"`,
        invoice.mpk,
        invoice.group,
        invoice.sequentialNumber,
        `"${invoice.label}"`,
        new Date(invoice.processedAt).toLocaleDateString('pl-PL')
      ].join(','))
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `raport_faktury_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const isLoading = processing || vendorsLoading || countersLoading || nipMappingLoading;

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
            <Button onClick={exportToExcel} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Eksportuj do Excel
            </Button>
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
                    <Badge variant="secondary">
                      {invoice.group} – {invoice.mpk} – {invoice.sequentialNumber}
                    </Badge>
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
                        <span>Nabywca: {invoice.buyerName}</span>
                        <br />
                        <span>NIP nabywcy: {invoice.buyerNip}</span>
                      </div>
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
    </div>
  );
}