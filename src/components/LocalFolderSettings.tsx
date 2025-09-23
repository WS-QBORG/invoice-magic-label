import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Folder, FolderOpen, Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useOneDriveIntegration } from '@/hooks/useOneDriveIntegration';
import { useToast } from '@/components/ui/use-toast';

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
  
  const { processOneDriveFiles } = useOneDriveIntegration();
  const { toast } = useToast();

  const handleFolderSelect = useCallback(async () => {
    try {
      // Check if File System Access API is available (Chrome 86+)
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const folderFiles: LocalFile[] = [];
        
        // Recursively read files from the directory
        async function readDirectory(dirHandle: any, path = '') {
          for await (const [name, handle] of dirHandle.entries()) {
            const fullPath = path ? `${path}/${name}` : name;
            
            if (handle.kind === 'file') {
              const file = await handle.getFile();
              if (file.name.toLowerCase().endsWith('.pdf')) {
                folderFiles.push({
                  name: file.name,
                  file,
                  fullPath
                });
              }
            } else if (handle.kind === 'directory') {
              await readDirectory(handle, fullPath);
            }
          }
        }
        
        await readDirectory(dirHandle);
        setSelectedFolder(dirHandle.name);
        setFiles(folderFiles);
        
        toast({
          title: "Folder wybrany",
          description: `Znaleziono ${folderFiles.length} plików PDF w folderze "${dirHandle.name}"`
        });
      } else {
        // Fallback to traditional file input
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        
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
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się wybrać folderu",
        variant: "destructive"
      });
    }
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
  }, [files, processOneDriveFiles, toast]);

  const handleClearSelection = () => {
    setSelectedFolder('');
    setFiles([]);
    setProcessedCount(0);
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

            {/* Browser compatibility notice */}
            {!('showDirectoryPicker' in window) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Używasz starszej przeglądarki. Wybór folderu może być ograniczony.
                  Zalecamy Chrome 86+ dla pełnej funkcjonalności.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};