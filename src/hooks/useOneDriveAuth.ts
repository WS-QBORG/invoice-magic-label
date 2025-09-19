import { useState, useEffect } from 'react';
import { database, ensureAuthReady } from '@/lib/firebase';
import { ref, set, get, remove } from 'firebase/database';

interface OneDriveAuthConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

const CLIENT_ID = 'a8b4e3f2-1c9d-4e7f-8b6a-3c5e9f8d2a1b'; // To będzie skonfigurowane przez użytkownika
const REDIRECT_URI = `${window.location.origin}/onedrive-callback`;
const SCOPES = 'Files.Read offline_access openid profile';

export const useOneDriveAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authConfig, setAuthConfig] = useState<OneDriveAuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuthConfig = async () => {
    try {
      await ensureAuthReady();
      const authRef = ref(database, 'onedrive/auth');
      const snapshot = await get(authRef);
      
      if (snapshot.exists()) {
        const config = snapshot.val() as OneDriveAuthConfig;
        
        // Sprawdź czy token nie wygasł
        if (config.expiresAt > Date.now()) {
          setAuthConfig(config);
          setIsAuthenticated(true);
        } else {
          // Token wygasł, spróbuj odnowić
          await refreshAccessToken(config.refreshToken);
        }
      }
    } catch (err) {
      console.error('Error loading auth config:', err);
      setError('Błąd ładowania konfiguracji autoryzacji');
    } finally {
      setLoading(false);
    }
  };

  const initiateAuth = () => {
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('state', 'onedrive_auth');

    // Otwórz w nowym oknie
    const authWindow = window.open(
      authUrl.toString(),
      'onedrive-auth',
      'width=600,height=600,scrollbars=yes,resizable=yes'
    );

    // Nasłuchuj na komunikat z okna autoryzacji
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'ONEDRIVE_AUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage);
        authWindow?.close();
        
        try {
          await handleAuthCode(event.data.code);
        } catch (err) {
          console.error('Auth code handling error:', err);
          setError('Błąd podczas przetwarzania autoryzacji');
        }
      }
      
      if (event.data.type === 'ONEDRIVE_AUTH_ERROR') {
        window.removeEventListener('message', handleMessage);
        authWindow?.close();
        setError(event.data.error || 'Błąd autoryzacji');
      }
    };

    window.addEventListener('message', handleMessage);

    // Sprawdzaj czy okno zostało zamknięte ręcznie
    const checkClosed = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  };

  const handleAuthCode = async (code: string) => {
    try {
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          scope: SCOPES,
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token request failed: ${tokenResponse.statusText}`);
      }

      const tokenData: AuthResponse = await tokenResponse.json();
      await saveAuthConfig(tokenData);
    } catch (err) {
      console.error('Token exchange error:', err);
      throw err;
    }
  };

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          scope: SCOPES,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token refresh failed: ${tokenResponse.statusText}`);
      }

      const tokenData: AuthResponse = await tokenResponse.json();
      await saveAuthConfig(tokenData, refreshToken);
    } catch (err) {
      console.error('Token refresh error:', err);
      // Jeśli refresh nie działa, wyloguj użytkownika
      await disconnect();
      throw err;
    }
  };

  const saveAuthConfig = async (tokenData: AuthResponse, existingRefreshToken?: string) => {
    try {
      await ensureAuthReady();
      
      const config: OneDriveAuthConfig = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || existingRefreshToken || '',
        expiresAt: Date.now() + (tokenData.expires_in * 1000) - 60000, // Odejmij minutę dla bezpieczeństwa
        scope: tokenData.scope,
      };

      const authRef = ref(database, 'onedrive/auth');
      await set(authRef, config);
      
      setAuthConfig(config);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      console.error('Error saving auth config:', err);
      setError('Błąd zapisywania konfiguracji');
      throw err;
    }
  };

  const disconnect = async () => {
    try {
      await ensureAuthReady();
      const authRef = ref(database, 'onedrive/auth');
      await remove(authRef);
      
      setAuthConfig(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError('Błąd rozłączania');
    }
  };

  const testConnection = async (): Promise<boolean> => {
    if (!authConfig) return false;

    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
        headers: {
          'Authorization': `Bearer ${authConfig.accessToken}`,
        },
      });

      if (response.status === 401) {
        // Token wygasł, spróbuj odnowić
        if (authConfig.refreshToken) {
          await refreshAccessToken(authConfig.refreshToken);
          return true;
        }
        return false;
      }

      return response.ok;
    } catch (err) {
      console.error('Connection test error:', err);
      return false;
    }
  };

  const getAuthHeaders = () => {
    if (!authConfig) return {};
    return {
      'Authorization': `Bearer ${authConfig.accessToken}`,
    };
  };

  useEffect(() => {
    loadAuthConfig();
  }, []);

  return {
    isAuthenticated,
    loading,
    error,
    initiateAuth,
    disconnect,
    testConnection,
    getAuthHeaders,
    clearError: () => setError(null),
  };
};