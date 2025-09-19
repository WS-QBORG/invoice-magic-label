import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Cloud, FolderOpen, CheckCircle, XCircle, AlertTriangle, Settings } from 'lucide-react';
import { useOneDriveAuth } from '@/hooks/useOneDriveAuth';
import { useOneDriveScanner } from '@/hooks/useOneDriveScanner';
import { OneDriveFolderPicker } from './OneDriveFolderPicker';
import { OneDriveFilesList } from './OneDriveFilesList';

export const OneDriveSettings: React.FC = () => {
  const { 
    isAuthenticated, 
    loading: authLoading, 
    error: authError, 
    initiateAuth, 
    disconnect, 
    testConnection,
    clearError: clearAuthError
  } = useOneDriveAuth();

  const {
    settings,
    scanning,
    foundFiles,
    error: scanError,
    watcherActive,
    saveSettings,
    startScan,
    clearError: clearScanError
  } = useOneDriveScanner();

  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showFilesList, setShowFilesList] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleToggleScan = async (enabled: boolean) => {
    if (!settings) return;
    
    try {
      await saveSettings({
        ...settings,
        isEnabled: enabled
      });
      
      if (enabled) {
        // Rozpocznij pierwsze skanowanie
        const newFiles = await startScan(true);
        if (newFiles.length > 0) {
          setShowFilesList(true);
        }
      }
    } catch (err) {
      console.error('Error toggling scan:', err);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const isConnected = await testConnection();
      if (isConnected) {
        // Toast lub inny sukces UI
        console.log('✅ Połączenie z OneDrive działa');
      } else {
        console.log('❌ Błąd połączenia z OneDrive');
      }
    } catch (err) {
      console.error('Connection test failed:', err);
    } finally {
      setTesting(false);
    }
  };

  const handleFolderSelected = async (folderId: string, folderPath: string, folderName: string) => {
    try {
      await saveSettings({
        folderId,
        folderPath,
        folderName,
        isEnabled: false // Wyłączone domyślnie po wyborze folderu
      });
      setShowFolderPicker(false);
    } catch (err) {
      console.error('Error saving folder selection:', err);
    }
  };

  const getStatusIcon = () => {
    if (authLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!isAuthenticated) return <XCircle className="h-4 w-4 text-destructive" />;
    if (settings?.isEnabled && watcherActive) return <CheckCircle className="h-4 w-4 text-success" />;
    if (settings?.isEnabled && !watcherActive) return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <Cloud className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (authLoading) return 'Ładowanie...';
    if (!isAuthenticated) return 'Nie połączono';
    if (scanning) return 'Przeszukuję wszystkie foldery i podfoldery...';
    if (settings?.isEnabled && watcherActive) return 'Aktywne monitorowanie';
    if (settings?.isEnabled && !watcherActive) return 'Uruchamianie...';
    return 'Gotowe do konfiguracji';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Źródło: OneDrive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Status połączenia */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="text-sm font-medium">Status OneDrive</p>
                <p className="text-xs text-muted-foreground">{getStatusText()}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {isAuthenticated ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testuj'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={disconnect}
                  >
                    Odłącz
                  </Button>
                </>
              ) : (
                <Button onClick={initiateAuth} disabled={authLoading}>
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Cloud className="h-4 w-4 mr-2" />}
                  Połącz OneDrive
                </Button>
              )}
            </div>
          </div>

          {/* Błędy */}
          {(authError || scanError) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {authError || scanError}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2" 
                  onClick={() => {
                    clearAuthError();
                    clearScanError();
                  }}
                >
                  Zamknij
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Konfiguracja folderu */}
          {isAuthenticated && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Folder źródłowy</p>
                  <p className="text-xs text-muted-foreground">
                    Wybierz folder do monitorowania (włącznie z podfolderami)
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFolderPicker(true)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Wybierz folder
                </Button>
              </div>

              {/* Aktualnie wybrany folder */}
              {settings?.folderName && (
                <div className="p-3 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-accent-foreground" />
                    <span className="font-medium text-sm">{settings.folderName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {settings.folderPath || 'Folder główny'}
                  </p>
                </div>
              )}

              {/* Przełącznik automatycznego skanowania */}
              {settings?.folderId && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Automatyczne skanowanie OneDrive</p>
                    <p className="text-xs text-muted-foreground">
                      Ciągłe monitorowanie nowych plików w wybranym folderze
                    </p>
                  </div>
                  
                  <Switch
                    checked={settings.isEnabled || false}
                    onCheckedChange={handleToggleScan}
                    disabled={scanning}
                  />
                </div>
              )}

              {/* Status skanowania */}
              {settings?.isEnabled && (
                <div className="flex items-center justify-between text-sm">
                  <span>Status:</span>
                  <div className="flex items-center gap-2">
                    {scanning ? (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Skanowanie...
                      </Badge>
                    ) : foundFiles.length > 0 ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Znaleziono {foundFiles.length} nowych dokumentów
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        Brak nowych dokumentów
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogi */}
      <OneDriveFolderPicker
        isOpen={showFolderPicker}
        onClose={() => setShowFolderPicker(false)}
        onFolderSelected={handleFolderSelected}
      />

      <OneDriveFilesList
        isOpen={showFilesList}
        onClose={() => setShowFilesList(false)}
        files={foundFiles}
      />
    </div>
  );
};