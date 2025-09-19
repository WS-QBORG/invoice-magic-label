import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Image, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  AlertTriangle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOneDriveScanner } from '@/hooks/useOneDriveScanner';
import { useOneDriveIntegration } from '@/hooks/useOneDriveIntegration';

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

interface OneDriveFilesListProps {
  isOpen: boolean;
  onClose: () => void;
  files: OneDriveFile[];
}

interface ProcessingStatus {
  [fileId: string]: 'pending' | 'processing' | 'completed' | 'error';
}

export const OneDriveFilesList: React.FC<OneDriveFilesListProps> = ({
  isOpen,
  onClose,
  files
}) => {
  const { toast } = useToast();
  const { markFilesAsIngested, updateFileStatus, downloadFile } = useOneDriveScanner();
  const { processOneDriveFiles } = useOneDriveIntegration();
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(files.map(f => f.driveItemId)));
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({});
  const [processedCount, setProcessedCount] = useState(0);

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-destructive" />;
    }
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-primary" />;
    }
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toUpperCase() || '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectAll = () => {
    setSelectedFiles(new Set(files.map(f => f.driveItemId)));
  };

  const handleDeselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleFileToggle = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleProcessFiles = async () => {
    const selectedFilesArray = files.filter(f => selectedFiles.has(f.driveItemId));
    
    if (selectedFilesArray.length === 0) {
      toast({
        title: "Brak wybranych plików",
        description: "Wybierz przynajmniej jeden plik do przetwarzania.",
        variant: "destructive"
      });
      return;
    }

    // Potwierdź akcję
    if (!window.confirm(`Czy chcesz opisać ${selectedFilesArray.length} wybranych plików?`)) {
      return;
    }

    setProcessing(true);
    setProcessedCount(0);
    
        // Oznacz pliki jako ingested
        await markFilesAsIngested(selectedFilesArray);

        // Przetwarzaj pliki przez pipeline OneDrive integration
        const results = await processOneDriveFiles(
          selectedFilesArray,
          downloadFile,
          '', // clientNumber - można dodać jako input
          (processed, total, currentFile) => {
            setProcessedCount(processed);
            if (currentFile) {
              setProcessingStatus(prev => ({
                ...prev,
                [selectedFilesArray[processed - 1]?.driveItemId]: 'processing'
              }));
            }
            
            // Update previous file status
            if (processed > 0 && selectedFilesArray[processed - 1]) {
              const result = results?.[processed - 1];
              const prevFile = selectedFilesArray[processed - 1];
              setProcessingStatus(prev => ({
                ...prev,
                [prevFile.driveItemId]: result?.success ? 'completed' : 'error'
              }));
              
              updateFileStatus(
                prevFile.driveItemId, 
                result?.success ? 'processed' : 'failed',
                result?.error
              );
            }
          }
        );

    setProcessing(false);
    
    toast({
      title: "Przetwarzanie zakończone",
      description: `Opisano ${processedCount} z ${selectedFilesArray.length} plików.`
    });

    // Zamknij dialog po 2 sekundach
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const getStatusIcon = (fileId: string) => {
    const status = processingStatus[fileId];
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-warning animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const progressPercentage = processing ? (processedCount / Math.max(selectedFiles.size, 1)) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Nowe dokumenty OneDrive
            <Badge variant="secondary">{files.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            Znaleziono {files.length} nowych dokumentów. Wybierz które chcesz przetworzyć.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Kontrolki */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Zaznacz wszystkie
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Odznacz wszystkie
              </Button>
            </div>
            
            <Badge variant="outline">
              Wybrano: {selectedFiles.size} z {files.length}
            </Badge>
          </div>

          {/* Progress bar podczas przetwarzania */}
          {processing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Opisywanie {processedCount}/{selectedFiles.size}...</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} />
            </div>
          )}

          {/* Lista plików */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <div className="p-4">
              {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Brak nowych dokumentów</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div 
                      key={file.driveItemId} 
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedFiles.has(file.driveItemId) 
                          ? 'bg-accent border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => !processing && handleFileToggle(file.driveItemId)}
                    >
                      <Checkbox
                        checked={selectedFiles.has(file.driveItemId)}
                        onChange={() => handleFileToggle(file.driveItemId)}
                        disabled={processing}
                      />
                      
                      {getFileIcon(file.mimeType)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {getFileExtension(file.name)}
                          </Badge>
                          {getStatusIcon(file.driveItemId)}
                        </div>
                        
                        <p className="text-xs text-muted-foreground truncate">
                          {file.fullPath}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(file.modifiedDateTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Akcje */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              {processing ? 'Przetwarzanie...' : 'Anuluj'}
            </Button>
            
            <div className="flex gap-2">
              {processing ? (
                <Button disabled>
                  <Clock className="h-4 w-4 mr-2 animate-pulse" />
                  Opisywanie...
                </Button>
              ) : (
                <Button
                  onClick={handleProcessFiles}
                  disabled={selectedFiles.size === 0}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Kontynuuj ({selectedFiles.size})
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};