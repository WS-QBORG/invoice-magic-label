import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAvailableCategories } from '@/utils/categoryDetector';

interface VendorMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mpk: string, group: string, category?: string) => void;
  vendorName: string;
  suggestedMpk?: string;
  suggestedGroup?: string;
  suggestedCategory?: string;
  confidence?: number;
}

/**
 * Dialog for manual vendor mapping when automatic detection fails
 * Allows user to assign MPK and Group codes to vendors
 */
export function VendorMappingDialog({
  isOpen,
  onClose,
  onSave,
  vendorName,
  suggestedMpk = 'MPK000',
  suggestedGroup = '0/0',
  suggestedCategory,
  confidence = 0
}: VendorMappingDialogProps) {
  const [mpk, setMpk] = useState(suggestedMpk);
  const [group, setGroup] = useState(suggestedGroup);
  const [customCategory, setCustomCategory] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  
  const categories = getAvailableCategories();

  const handlePresetSelect = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setMpk(category.mpk);
      setGroup(category.group);
      setSelectedPreset(categoryId);
      setCustomCategory(category.name);
    }
  };

  const handleSave = () => {
    if (!mpk || !group) {
      alert('Proszę podać kod MPK i grupę');
      return;
    }
    onSave(mpk, group, customCategory || suggestedCategory);
    onClose();
  };

  const handleCancel = () => {
    // Reset to suggested values
    setMpk(suggestedMpk);
    setGroup(suggestedGroup);
    setCustomCategory('');
    setSelectedPreset('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Przypisz kategorię dla sprzedawcy
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Vendor info */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Sprzedawca
                </Label>
                <p className="font-medium">{vendorName}</p>
                
                {suggestedCategory && confidence > 0.5 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      Sugerowana kategoria: {suggestedCategory}
                    </Badge>
                    <Badge variant={confidence > 0.8 ? "default" : "outline"}>
                      Pewność: {Math.round(confidence * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick presets */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Wybierz kategorię</Label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedPreset === category.id ? "default" : "outline"}
                  className="justify-start text-left h-auto p-3"
                  onClick={() => handlePresetSelect(category.id)}
                >
                  <div className="space-y-1">
                    <div className="font-medium">{category.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {category.mpk} • {category.group}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Manual input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mpk">Kod MPK</Label>
              <Input
                id="mpk"
                value={mpk}
                onChange={(e) => setMpk(e.target.value)}
                placeholder="np. MPK610"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="group">Grupa</Label>
              <Input
                id="group"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="np. 3/8"
              />
            </div>
          </div>

          {/* Custom category description */}
          <div className="space-y-2">
            <Label htmlFor="category">Opis kategorii (opcjonalny)</Label>
            <Textarea
              id="category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="np. Koszty pojazdów - lokalizacja GPS"
              rows={2}
            />
          </div>

          {/* Info note */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p className="font-medium mb-1">Informacja:</p>
            <p>
              To mapowanie zostanie zapisane i będzie automatycznie używane 
              dla przyszłych faktur od tego sprzedawcy.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>
            Zapisz mapowanie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}