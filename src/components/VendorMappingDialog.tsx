import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAllMPKOptions, getAllGroupOptions } from '@/utils/mpkGroups';
import { useToast } from '@/hooks/use-toast';

interface VendorMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mpk: string, group: string, category?: string, vendorName?: string) => void;
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
  suggestedMpk,
  suggestedGroup,
  suggestedCategory,
  confidence
}: VendorMappingDialogProps) {
  const [mpk, setMpk] = useState('');
  const [group, setGroup] = useState('');
  const [category, setCategory] = useState('');
  const [editableVendorName, setEditableVendorName] = useState('');
  

  const { toast } = useToast();
  const mpkOptions = getAllMPKOptions();
  const groupOptions = getAllGroupOptions();

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMpk(suggestedMpk || '');
      setGroup(suggestedGroup || '');
      setCategory(suggestedCategory || '');
      setEditableVendorName(vendorName || '');
    }
  }, [isOpen, suggestedMpk, suggestedGroup, suggestedCategory, vendorName]);

  const handleMpkSelect = (mpkCode: string) => {
    setMpk(mpkCode);
    const mpkOption = mpkOptions.find(m => m.code === mpkCode);
    if (mpkOption) {
      setCategory(mpkOption.description);
    }
  };

  const handleGroupSelect = (groupCode: string) => {
    setGroup(groupCode);
  };

  const handleSave = () => {
    if (!mpk.trim() || !group.trim() || !editableVendorName.trim()) {
      toast({
        variant: "destructive",
        title: "Błąd walidacji",
        description: "Nazwa sprzedawcy, MPK i Grupa są wymagane"
      });
      return;
    }

    onSave(mpk.trim(), group.trim(), category.trim() || undefined, editableVendorName.trim());
    onClose();
  };

  const handleCancel = () => {
    // Reset to initial values
    setMpk(suggestedMpk || '');
    setGroup(suggestedGroup || '');
    setCategory(suggestedCategory || '');
    setEditableVendorName(vendorName || '');
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Przypisz kategorię dla sprzedawcy
          </DialogTitle>
          <DialogDescription>
            {vendorName === 'Nie znaleziono' ? (
              'Nie udało się automatycznie wykryć sprzedawcy z faktury. Wprowadź dane ręcznie.'
            ) : (
              <>
                Nie udało się automatycznie przypisać MPK i grupy dla sprzedawcy: <strong>{vendorName}</strong>
                {confidence && confidence > 0 && (
                  <>
                    <br />
                    <span className="text-sm text-muted-foreground">
                      Pewność automatycznej sugestii: {Math.round(confidence * 100)}%
                    </span>
                  </>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Manual vendor input */}
          <div className="space-y-2">
            <Label htmlFor="vendor-name">Nazwa sprzedawcy *</Label>
            <Input
              id="vendor-name"
              value={editableVendorName}
              onChange={(e) => setEditableVendorName(e.target.value)}
              placeholder="np. Verizon Connect Poland Sp. z o.o."
            />
          </div>

          {/* Suggested category info */}
          {suggestedCategory && confidence && confidence > 0.5 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Sugerowana kategoria: {suggestedCategory}
                  </Badge>
                  <Badge variant={confidence > 0.8 ? "default" : "outline"}>
                    Pewność: {Math.round(confidence * 100)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* MPK and Group Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mpk-select">Wybierz MPK *</Label>
              <Select value={mpk} onValueChange={handleMpkSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz MPK..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {mpkOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.code}</span>
                        <span className="text-xs text-muted-foreground">{option.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="group-select">Wybierz Grupę *</Label>
              <Select value={group} onValueChange={handleGroupSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz grupę..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {groupOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.code}</span>
                        <span className="text-xs text-muted-foreground">{option.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manual input option */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Lub wprowadź ręcznie</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mpk">MPK *</Label>
                <Input
                  id="mpk"
                  value={mpk}
                  onChange={(e) => setMpk(e.target.value)}
                  placeholder="np. MPK610"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="group">Grupa *</Label>
                <Input
                  id="group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="np. 3/8"
                />
              </div>
            </div>
          </div>

          {/* Custom category description */}
          <div className="space-y-2">
            <Label htmlFor="category">Opis kategorii (opcjonalny)</Label>
            <Textarea
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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