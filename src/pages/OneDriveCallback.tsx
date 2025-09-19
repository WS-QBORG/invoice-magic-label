import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * OneDrive OAuth callback page
 * Handles the OAuth response from Microsoft and passes it to the parent window
 */
const OneDriveCallback = () => {
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      const state = urlParams.get('state');

      if (state !== 'onedrive_auth') {
        throw new Error('Invalid state parameter');
      }

      if (error) {
        // Send error to parent window
        window.opener?.postMessage({
          type: 'ONEDRIVE_AUTH_ERROR',
          error: errorDescription || error
        }, window.location.origin);
      } else if (code) {
        // Send success to parent window
        window.opener?.postMessage({
          type: 'ONEDRIVE_AUTH_SUCCESS',
          code
        }, window.location.origin);
      } else {
        throw new Error('No authorization code received');
      }
    } catch (err) {
      // Send error to parent window
      window.opener?.postMessage({
        type: 'ONEDRIVE_AUTH_ERROR',
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }, window.location.origin);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-primary/5">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            Autoryzacja OneDrive
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Przetwarzanie autoryzacji...
          </p>
          <p className="text-xs text-muted-foreground">
            To okno zostanie automatycznie zamknięte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OneDriveCallback;