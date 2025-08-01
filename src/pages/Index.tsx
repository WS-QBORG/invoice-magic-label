import { InvoiceProcessor } from '@/components/InvoiceProcessor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Database, Zap, Shield } from 'lucide-react';

/**
 * Main page for the Invoice Analysis Application
 * Modern, professional interface for processing invoices with Firebase integration
 */
const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Analizator Faktur
              </h1>
              <p className="text-sm text-muted-foreground">
                Inteligentne przetwarzanie faktur z automatycznym przypisywaniem kodów MPK
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Main Processing Area */}
          <div className="lg:col-span-2">
            <InvoiceProcessor />
          </div>

          {/* Sidebar with Features */}
          <div className="space-y-6">
            
            {/* How it works */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Jak to działa?</CardTitle>
                <CardDescription>
                  Prosty proces w kilku krokach
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Wgraj fakturę PDF</p>
                    <p className="text-xs text-muted-foreground">
                      System automatycznie wyodrębni dane ze sprzedawcy i nabywcy
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Automatyczne rozpoznanie</p>
                    <p className="text-xs text-muted-foreground">
                      AI przypisuje odpowiednie kody MPK i grupy na podstawie zawartości
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Numeracja per nabywca</p>
                    <p className="text-xs text-muted-foreground">
                      Osobna numeracja dla każdego NIP-u nabywcy
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-success/10 rounded-full mt-0.5">
                    <div className="w-2 h-2 bg-success rounded-full" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Eksport do Excel</p>
                    <p className="text-xs text-muted-foreground">
                      Gotowy raport do dalszego przetwarzania
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funkcje systemu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-sm">Baza danych sprzedawców</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="text-sm">Automatyczne kategoryzowanie</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-success" />
                  <span className="text-sm">Bezpieczna synchronizacja</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-info" />
                  <span className="text-sm">Obsługa plików PDF</span>
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="font-medium text-sm text-primary">
                    🚀 Inteligentne rozpoznawanie
                  </p>
                  <p className="text-xs text-muted-foreground">
                    System automatycznie rozpoznaje firmy takie jak Verizon Connect 
                    i przypisuje im odpowiednie kategorie (np. koszty pojazdów).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Przy pierwszym użyciu nowego sprzedawcy możesz ręcznie przypisać 
                    kategorię - system zapamięta to na przyszłość.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              © 2025 Analizator Faktur – Inteligentne przetwarzanie dokumentów finansowych
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;