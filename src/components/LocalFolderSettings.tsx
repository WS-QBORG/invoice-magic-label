import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Folder, FolderOpen, Upload, Loader2, CheckCircle, AlertTriangle, FileText, Download } from 'lucide-react';
import { useOneDriveIntegration } from '@/hooks/useOneDriveIntegration';
import { useInvoiceStorage } from '@/hooks/useInvoiceStorage';
import { useToast } from '@/components/ui/use-toast';
import { InvoiceData } from '@/types/invoice';

interface LocalFile {
  name: string;
  file: File;
  fullPath: string;
}

export const LocalFolderSettings = () => {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [processedInvoices, setProcessedInvoices] = useState<InvoiceData[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const { processOneDriveFiles } = useOneDriveIntegration();
  const { savedInvoices, reloadInvoices } = useInvoiceStorage();
  const { toast } = useToast();

  const handleFolderSelect = useCallback(() => {
    // Use traditional file input with webkitdirectory (works in all browsers and iframes)
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.accept = '.pdf';
    
    input.onchange = (e) => {
      const selectedFiles = Array.from((e.target as HTMLInputElement).files || []);
      const pdfFiles = selectedFiles
        .filter(file => file.name.toLowerCase().endsWith('.pdf'))
        .map(file => ({
          name: file.name,
          file,
          fullPath: file.webkitRelativePath || file.name
        }));
      
      setFiles(pdfFiles);
      
      // Extract folder name from the first file's path
      const firstPath = pdfFiles[0]?.fullPath || '';
      const folderName = firstPath.split('/')[0] || 'Wybrany folder';
      setSelectedFolder(folderName);
      
      toast({
        title: "Folder wybrany",
        description: `Znaleziono ${pdfFiles.length} plików PDF w folderze "${folderName}"`
      });
    };
    
    input.click();
  }, [toast]);

  const handleProcessFiles = useCallback(async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessedCount(0);

    try {
      // Convert local files to OneDrive-like format for processing
      const oneDriveFiles = files.map(localFile => ({
        driveItemId: `local_${Date.now()}_${Math.random()}`,
        name: localFile.name,
        mimeType: 'application/pdf',
        size: localFile.file.size,
        fullPath: localFile.fullPath,
        eTag: `local_${Date.now()}`,
        downloadUrl: '', // Not used for local files
        webUrl: `local://${localFile.fullPath}`,
        modifiedDateTime: new Date(localFile.file.lastModified).toISOString()
      }));

      // Create download function for local files
      const downloadFile = async (file: any) => {
        const localFile = files.find(f => f.fullPath === file.fullPath);
        if (!localFile) {
          throw new Error('Local file not found');
        }
        return new Blob([localFile.file], { type: 'application/pdf' });
      };

      const results = await processOneDriveFiles(
        oneDriveFiles,
        downloadFile,
        undefined,
        (processed, total, currentFile) => {
          setProcessedCount(processed);
          console.log(`Processing: ${processed}/${total} - ${currentFile}`);
        }
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      // Get the successfully processed invoices directly from results
      const successfulInvoices = results
        .filter(r => r.success && r.invoiceData)
        .map(r => r.invoiceData!)
        .filter(Boolean);
      
      console.log('🔍 Successfully processed invoices:', successfulInvoices);
      setProcessedInvoices(successfulInvoices);
      setShowResults(true);

      // Reload saved invoices to refresh the main panel
      await reloadInvoices();

      // Notify parent window to refresh (if InvoiceProcessor is listening)
      window.dispatchEvent(new CustomEvent('invoicesProcessed', { 
        detail: { invoices: successfulInvoices } 
      }));

      toast({
        title: "Przetwarzanie zakończone", 
        description: `Pomyślnie: ${successful}, Błędy: ${failed}`
      });

    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Błąd przetwarzania",
        description: "Wystąpił błąd podczas przetwarzania plików",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [files, processOneDriveFiles, toast, reloadInvoices]);

  const handleClearSelection = () => {
    setSelectedFolder('');
    setFiles([]);
    setProcessedCount(0);
    setProcessedInvoices([]);
    setShowResults(false);
  };

  const exportToExcel = async () => {
    if (processedInvoices.length === 0) {
      toast({
        variant: "destructive",
        title: "Brak danych",
        description: "Brak przetworzonych faktur do eksportu"
      });
      return;
    }

    try {
      const XLSX = await import('xlsx');
      
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

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Faktury_lokalne');

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const filename = `Faktury_lokalne_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, filename);

      toast({
        title: "Eksport zakończony",
        description: `Zapisano plik: ${filename}`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Błąd eksportu",
        description: "Nie udało się wyeksportować danych"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5 text-primary" />
          Folder lokalny
        </CardTitle>
        <CardDescription>
          Wybierz folder z komputera do przetwarzania faktur
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!selectedFolder ? (
          <Button 
            onClick={handleFolderSelect}
            className="w-full"
            variant="outline"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Wybierz folder
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Selected folder info */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>Wybrany folder: <strong>{selectedFolder}</strong></p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {files.length} plików PDF
                    </Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Files list preview */}
            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Pliki do przetworzenia:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                  {files.slice(0, 5).map((file, index) => (
                    <div key={index} className="text-muted-foreground">
                      📄 {file.fullPath}
                    </div>
                  ))}
                  {files.length > 5 && (
                    <div className="text-muted-foreground italic">
                      ... i {files.length - 5} więcej plików
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Processing controls */}
            <div className="flex gap-2">
              <Button
                onClick={handleProcessFiles}
                disabled={isProcessing || files.length === 0}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Przetwarzanie... ({processedCount}/{files.length})
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Przetwórz pliki ({files.length})
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleClearSelection}
                variant="outline"
                disabled={isProcessing}
              >
                Wyczyść
              </Button>
            </div>

            {/* Info about folder selection */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Po kliknięciu "Wybierz folder", w oknie dialogowym musisz wybrać folder i kliknąć "Wybierz folder" lub "Select Folder".
              </AlertDescription>
            </Alert>

            {/* Show processed results */}
            {showResults && processedInvoices.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Ostatnio przetworzone ({processedInvoices.length})
                  </h4>
                  <Button
                    onClick={exportToExcel}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
                
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Pliki zostały pomyślnie przetworzone i są widoczne w głównym panelu poniżej.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};