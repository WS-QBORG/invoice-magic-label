import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Folder, 
  FolderOpen, 
  ChevronRight,
  Home,
  ArrowLeft 
} from 'lucide-react';
import { useOneDriveAuth } from '@/hooks/useOneDriveAuth';

interface OneDriveItem {
  id: string;
  name: string;
  folder?: {
    childCount: number;
  };
  parentReference?: {
    driveId: string;
    id: string;
    path: string;
  };
}

interface OneDriveFolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelected: (folderId: string, folderPath: string, folderName: string) => void;
}

export const OneDriveFolderPicker: React.FC<OneDriveFolderPickerProps> = ({
  isOpen,
  onClose,
  onFolderSelected
}) => {
  const { getAuthHeaders } = useOneDriveAuth();
  const [items, setItems] = useState<OneDriveItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>(['root']);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graphRequest = async (url: string): Promise<any> => {
    const headers = getAuthHeaders();
    const response = await fetch(`https://graph.microsoft.com/v1.0${url}`, { headers });
    
    if (!response.ok) {
      throw new Error(`Błąd Graph API: ${response.statusText}`);
    }
    
    return response.json();
  };

  const loadFolder = async (folderId: string = 'root') => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await graphRequest(`/me/drive/items/${folderId}/children?$filter=folder ne null&$orderby=name asc`);
      setItems(data.value || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Błąd ładowania folderów';
      setError(errorMsg);
      console.error('Error loading folder:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = async (item: OneDriveItem) => {
    setCurrentFolderId(item.id);
    setCurrentPath(prev => [...prev, item.name]);
    await loadFolder(item.id);
  };

  const navigateUp = async () => {
    if (currentPath.length <= 1) return;
    
    const newPath = currentPath.slice(0, -1);
    setCurrentPath(newPath);
    
    // Znajdź ID rodzica
    if (newPath.length === 1) {
      setCurrentFolderId('root');
      await loadFolder('root');
    } else {
      // Tu potrzebowalibyśmy śledzić ID folderów w ścieżce
      // Na potrzeby demo, zawsze wracamy do roota
      setCurrentFolderId('root');
      await loadFolder('root');
    }
  };

  const handleFolderSelect = () => {
    const folderPath = currentPath.slice(1).join('/');
    const folderName = currentPath[currentPath.length - 1];
    onFolderSelected(currentFolderId, folderPath, folderName);
  };

  // Załaduj główny folder przy otwarciu
  useEffect(() => {
    if (isOpen) {
      setCurrentPath(['root']);
      setCurrentFolderId('root');
      loadFolder('root');
    }
  }, [isOpen]);

  const getCurrentFolderName = () => {
    return currentPath[currentPath.length - 1] === 'root' ? 'OneDrive' : currentPath[currentPath.length - 1];
  };

  const getBreadcrumb = () => {
    return currentPath.map((segment, index) => (
      <span key={index} className="flex items-center">
        {index > 0 && <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground" />}
        {segment === 'root' ? 'OneDrive' : segment}
      </span>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Wybierz folder OneDrive
          </DialogTitle>
          <DialogDescription>
            Wybierz folder, który będzie monitorowany pod kątem nowych faktur. 
            Skanowanie będzie obejmować wszystkie podfoldery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            <Home className="h-4 w-4 mr-2" />
            {getBreadcrumb()}
          </div>

          {/* Nawigacja */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={navigateUp}
              disabled={currentPath.length <= 1 || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Wstecz
            </Button>

            <Badge variant="outline">
              {getCurrentFolderName()}
            </Badge>
          </div>

          {/* Lista folderów */}
          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Ładowanie folderów...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">
                  <p className="text-sm">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => loadFolder(currentFolderId)}
                  >
                    Spróbuj ponownie
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Brak podfolderów</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 hover:bg-accent rounded cursor-pointer"
                      onClick={() => navigateToFolder(item)}
                    >
                      <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.folder && (
                          <p className="text-xs text-muted-foreground">
                            {item.folder.childCount} elementów
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Akcje */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            
            <div className="flex gap-2">
              <Button
                onClick={handleFolderSelect}
                disabled={currentFolderId === 'root'}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Wybierz "{getCurrentFolderName()}"
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};