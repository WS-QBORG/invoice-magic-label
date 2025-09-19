import { useState, useEffect, useCallback } from 'react';
import { database, ensureAuthReady } from '@/lib/firebase';
import { ref, set, get, push, update } from 'firebase/database';
import { useOneDriveAuth } from './useOneDriveAuth';

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

interface OneDriveSettings {
  folderId: string;
  folderPath: string;
  folderName: string;
  deltaToken?: string;
  isEnabled: boolean;
  lastScanAt?: number;
}

interface IngestionFile {
  id?: string;
  driveItemId: string;
  eTag: string;
  sha1Hash?: string;
  name: string;
  mimeType: string;
  size: number;
  fullPath: string;
  firstSeenAt: number;
  processedAt?: number;
  status: 'new' | 'processed' | 'failed';
  error?: string;
}

const SUPPORTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/bmp',
  'image/webp'
];

const SUPPORTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp'];

export const useOneDriveScanner = () => {
  const { isAuthenticated, getAuthHeaders } = useOneDriveAuth();
  const [settings, setSettings] = useState<OneDriveSettings | null>(null);
  const [scanning, setScanning] = useState(false);
  const [foundFiles, setFoundFiles] = useState<OneDriveFile[]>([]);
  const [ingestionFiles, setIngestionFiles] = useState<IngestionFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [watcherActive, setWatcherActive] = useState(false);

  // Załaduj ustawienia OneDrive
  const loadSettings = async () => {
    try {
      await ensureAuthReady();
      const settingsRef = ref(database, 'onedrive/settings');
      const snapshot = await get(settingsRef);
      
      if (snapshot.exists()) {
        setSettings(snapshot.val() as OneDriveSettings);
      }
    } catch (err) {
      console.error('Error loading OneDrive settings:', err);
    }
  };

  // Załaduj pliki ingestion
  const loadIngestionFiles = async () => {
    try {
      await ensureAuthReady();
      const filesRef = ref(database, 'onedrive/ingestionFiles');
      const snapshot = await get(filesRef);
      
      if (snapshot.exists()) {
        const filesData = snapshot.val();
        const filesList = Object.entries(filesData).map(([key, value]) => ({
          id: key,
          ...(value as Omit<IngestionFile, 'id'>)
        }));
        setIngestionFiles(filesList);
      }
    } catch (err) {
      console.error('Error loading ingestion files:', err);
    }
  };

  // Zapisz ustawienia
  const saveSettings = async (newSettings: Omit<OneDriveSettings, 'deltaToken' | 'lastScanAt'>) => {
    try {
      await ensureAuthReady();
      const settingsWithMeta = {
        ...newSettings,
        deltaToken: settings?.deltaToken,
        lastScanAt: Date.now()
      };
      
      const settingsRef = ref(database, 'onedrive/settings');
      await set(settingsRef, settingsWithMeta);
      setSettings(settingsWithMeta);
    } catch (err) {
      console.error('Error saving settings:', err);
      throw err;
    }
  };

  // Sprawdź czy plik jest obsługiwany
  const isFileSupported = (file: { name: string; mimeType?: string }): boolean => {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    return SUPPORTED_EXTENSIONS.includes(extension) || 
           (file.mimeType && SUPPORTED_TYPES.includes(file.mimeType));
  };

  // Sprawdź czy plik już istnieje w ingestion
  const isFileAlreadyIngested = (driveItemId: string, eTag: string): boolean => {
    return ingestionFiles.some(f => 
      f.driveItemId === driveItemId && f.eTag === eTag
    );
  };

  // Wykonaj żądanie do Microsoft Graph
  const graphRequest = async (url: string): Promise<any> => {
    const headers = getAuthHeaders();
    const response = await fetch(`https://graph.microsoft.com/v1.0${url}`, { headers });
    
    if (response.status === 401) {
      throw new Error('Sesja OneDrive wygasła. Zaloguj się ponownie.');
    }
    
    if (response.status === 403) {
      throw new Error('Brak uprawnień do folderu. Wybierz folder ponownie.');
    }
    
    if (response.status === 429) {
      throw new Error('Zbyt wiele żądań - ponawiamy za chwilę.');
    }
    
    if (!response.ok) {
      throw new Error(`Graph API error: ${response.statusText}`);
    }
    
    return response.json();
  };

  // Skanuj folder rekurencyjnie
  const scanFolder = async (folderId: string, basePath: string = ''): Promise<OneDriveFile[]> => {
    const allFiles: OneDriveFile[] = [];
    let nextUrl = `/me/drive/items/${folderId}/children?$top=1000`;
    
    while (nextUrl) {
      const data = await graphRequest(nextUrl);
      
      for (const item of data.value) {
        const currentPath = basePath ? `${basePath}/${item.name}` : item.name;
        
        if (item.folder) {
          // Rekurencyjnie skanuj podfolder
          const subfolderFiles = await scanFolder(item.id, currentPath);
          allFiles.push(...subfolderFiles);
        } else if (item.file && isFileSupported(item)) {
          // Dodaj obsługiwany plik
          const oneDriveFile: OneDriveFile = {
            driveItemId: item.id,
            name: item.name,
            mimeType: item.file.mimeType || '',
            size: item.size || 0,
            fullPath: currentPath,
            eTag: item.eTag,
            sha1Hash: item.file.hashes?.sha1Hash,
            downloadUrl: item['@microsoft.graph.downloadUrl'] || '',
            webUrl: item.webUrl || '',
            modifiedDateTime: item.lastModifiedDateTime
          };
          
          // Sprawdź czy plik nie został już przetworzony
          if (!isFileAlreadyIngested(oneDriveFile.driveItemId, oneDriveFile.eTag)) {
            allFiles.push(oneDriveFile);
          }
        }
      }
      
      nextUrl = data['@odata.nextLink'] ? 
        data['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : 
        null;
    }
    
    return allFiles;
  };

  // Skanuj używając delta API
  const scanWithDelta = async (): Promise<OneDriveFile[]> => {
    if (!settings?.folderId || !settings?.deltaToken) {
      throw new Error('Brak konfiguracji delta scan');
    }
    
    const newFiles: OneDriveFile[] = [];
    let nextUrl = `/me/drive/items/${settings.folderId}/delta?token=${settings.deltaToken}`;
    
    while (nextUrl) {
      const data = await graphRequest(nextUrl);
      
      for (const item of data.value) {
        if (item.file && isFileSupported(item) && !item.deleted) {
          const oneDriveFile: OneDriveFile = {
            driveItemId: item.id,
            name: item.name,
            mimeType: item.file.mimeType || '',
            size: item.size || 0,
            fullPath: item.parentReference?.path ? 
              `${item.parentReference.path}/${item.name}` : item.name,
            eTag: item.eTag,
            sha1Hash: item.file.hashes?.sha1Hash,
            downloadUrl: item['@microsoft.graph.downloadUrl'] || '',
            webUrl: item.webUrl || '',
            modifiedDateTime: item.lastModifiedDateTime
          };
          
          if (!isFileAlreadyIngested(oneDriveFile.driveItemId, oneDriveFile.eTag)) {
            newFiles.push(oneDriveFile);
          }
        }
      }
      
      nextUrl = data['@odata.nextLink'] ? 
        data['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : 
        null;
      
      // Zapisz nowy delta token
      if (data['@odata.deltaLink']) {
        const deltaUrl = new URL(data['@odata.deltaLink']);
        const newDeltaToken = deltaUrl.searchParams.get('token');
        
        if (newDeltaToken && settings) {
          const updatedSettings = { ...settings, deltaToken: newDeltaToken };
          await saveSettings(updatedSettings);
        }
      }
    }
    
    return newFiles;
  };

  // Główna funkcja skanowania
  const startScan = async (isInitial: boolean = false) => {
    if (!isAuthenticated || !settings?.folderId) {
      throw new Error('OneDrive nie jest skonfigurowany');
    }
    
    setScanning(true);
    setError(null);
    
    try {
      let newFiles: OneDriveFile[];
      
      if (isInitial || !settings.deltaToken) {
        // Pełne skanowanie
        newFiles = await scanFolder(settings.folderId, settings.folderPath);
        
        // Otrzymaj delta token dla przyszłych skanowań
        const deltaData = await graphRequest(`/me/drive/items/${settings.folderId}/delta`);
        if (deltaData['@odata.deltaLink']) {
          const deltaUrl = new URL(deltaData['@odata.deltaLink']);
          const deltaToken = deltaUrl.searchParams.get('token');
          
          if (deltaToken) {
            const updatedSettings = { ...settings, deltaToken, lastScanAt: Date.now() };
            await saveSettings(updatedSettings);
          }
        }
      } else {
        // Skanowanie przyrostowe
        newFiles = await scanWithDelta();
      }
      
      setFoundFiles(newFiles);
      return newFiles;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Błąd skanowania OneDrive';
      setError(errorMsg);
      throw err;
    } finally {
      setScanning(false);
    }
  };

  // Zapisz pliki jako ingested
  const markFilesAsIngested = async (files: OneDriveFile[]) => {
    try {
      await ensureAuthReady();
      const filesRef = ref(database, 'onedrive/ingestionFiles');
      
      for (const file of files) {
        const ingestionFile: Omit<IngestionFile, 'id'> = {
          driveItemId: file.driveItemId,
          eTag: file.eTag,
          sha1Hash: file.sha1Hash,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          fullPath: file.fullPath,
          firstSeenAt: Date.now(),
          status: 'new'
        };
        
        await push(filesRef, ingestionFile);
      }
      
      // Odśwież listę
      await loadIngestionFiles();
    } catch (err) {
      console.error('Error marking files as ingested:', err);
      throw err;
    }
  };

  // Aktualizuj status pliku
  const updateFileStatus = async (driveItemId: string, status: IngestionFile['status'], error?: string) => {
    try {
      await ensureAuthReady();
      const file = ingestionFiles.find(f => f.driveItemId === driveItemId);
      if (!file?.id) return;
      
      const updates: Partial<IngestionFile> = {
        status,
        ...(status === 'processed' && { processedAt: Date.now() }),
        ...(error && { error })
      };
      
      const fileRef = ref(database, `onedrive/ingestionFiles/${file.id}`);
      await update(fileRef, updates);
      
      // Aktualizuj lokalny stan
      setIngestionFiles(prev => 
        prev.map(f => f.id === file.id ? { ...f, ...updates } : f)
      );
    } catch (err) {
      console.error('Error updating file status:', err);
    }
  };

  // Pobierz plik z OneDrive
  const downloadFile = async (file: OneDriveFile): Promise<Blob> => {
    const response = await fetch(file.downloadUrl);
    if (!response.ok) {
      throw new Error(`Błąd pobierania pliku: ${response.statusText}`);
    }
    return response.blob();
  };

  // Watcher dla ciągłego monitorowania
  const startWatcher = useCallback(() => {
    if (!settings?.isEnabled || watcherActive) return;
    
    setWatcherActive(true);
    
    const watcherLoop = async () => {
      if (!settings?.isEnabled) {
        setWatcherActive(false);
        return;
      }
      
      try {
        await startScan(false);
        // Następne sprawdzenie za 2 minuty
        setTimeout(watcherLoop, 120000);
      } catch (err) {
        console.error('Watcher error:', err);
        // Przy błędzie czekaj dłużej (5 minut)
        setTimeout(watcherLoop, 300000);
      }
    };
    
    // Start pierwszy scan po 5 sekundach
    setTimeout(watcherLoop, 5000);
  }, [settings?.isEnabled, watcherActive]);

  const stopWatcher = () => {
    setWatcherActive(false);
  };

  // Efekty
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
      loadIngestionFiles();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (settings?.isEnabled) {
      startWatcher();
    } else {
      stopWatcher();
    }
    
    return stopWatcher;
  }, [settings?.isEnabled, startWatcher]);

  return {
    settings,
    scanning,
    foundFiles,
    ingestionFiles,
    error,
    watcherActive,
    saveSettings,
    startScan,
    markFilesAsIngested,
    updateFileStatus,
    downloadFile,
    clearError: () => setError(null),
  };
};