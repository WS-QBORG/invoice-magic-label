import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit2, Save, X } from 'lucide-react';
import { InvoiceData } from '@/types/invoice';
import { MPK_OPTIONS, GROUP_OPTIONS, type MPKOption, type GroupOption } from '@/utils/mpkGroups';
import { useBuyerNipMapping } from '@/hooks/useBuyerNipMapping';

interface EditInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedInvoice: InvoiceData) => void;
  invoice: InvoiceData | null;
}

export function EditInvoiceDialog({ isOpen, onClose, onSave, invoice }: EditInvoiceDialogProps) {
  const [editedInvoice, setEditedInvoice] = useState<InvoiceData | null>(null);
  const [saving, setSaving] = useState(false);
  const { buyerMappings } = useBuyerNipMapping();

  // Initialize form with invoice data when dialog opens
  useEffect(() => {
    if (invoice && isOpen) {
      setEditedInvoice({ ...invoice });
    }
  }, [invoice, isOpen]);

  const handleSave = async () => {
    if (!editedInvoice) return;
    
    setSaving(true);
    try {
      // Update label when MPK or Group changes - with special formatting for specific NIPs
      let updatedLabel: string;
      
      // Use same logic as InvoiceProcessor for special NIPs
      if (editedInvoice.buyerNip === '8522482321') {
        const firstLetter = editedInvoice.vendorName.charAt(0).toUpperCase();
        const sequentialNumber = `KJ_${firstLetter}_${editedInvoice.sequentialNumber.split('_').slice(2).join('_') || '0000'}`;
        updatedLabel = editedInvoice.clientNumber 
          ? `${editedInvoice.group};${editedInvoice.mpk};${sequentialNumber};${editedInvoice.clientNumber}`
          : `${editedInvoice.group};${editedInvoice.mpk};${sequentialNumber}`;
      } else if (editedInvoice.buyerNip === '8522669232') {
        const firstLetter = editedInvoice.vendorName.charAt(0).toUpperCase();
        const sequentialNumber = `KT_${firstLetter}_${editedInvoice.sequentialNumber.split('_').slice(2).join('_') || '0000'}`;
        updatedLabel = editedInvoice.clientNumber 
          ? `${editedInvoice.group};${editedInvoice.mpk};${sequentialNumber};${editedInvoice.clientNumber}`
          : `${editedInvoice.group};${editedInvoice.mpk};${sequentialNumber}`;
      } else {
        // Standard formatting for other buyers
        updatedLabel = editedInvoice.clientNumber 
          ? `${editedInvoice.group};${editedInvoice.mpk};${editedInvoice.sequentialNumber};${editedInvoice.clientNumber}`
          : `${editedInvoice.group};${editedInvoice.mpk};${editedInvoice.sequentialNumber}`;
      }
      
      const finalInvoice = {
        ...editedInvoice,
        label: updatedLabel,
        lastModified: Date.now()
      };
      
      await onSave(finalInvoice);
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof InvoiceData, value: string) => {
    if (!editedInvoice) return;
    
    setEditedInvoice(prev => {
      if (!prev) return null;
      
      const updated = { ...prev, [field]: value };
      
      // Auto-update buyer name when NIP changes
      if (field === 'buyerNip' && value && buyerMappings[value]) {
        console.log('🔄 Auto-updating buyer name:', { 
          nip: value, 
          oldName: updated.buyerName, 
          newName: buyerMappings[value].name 
        });
        updated.buyerName = buyerMappings[value].name;
      }
      
      return updated;
    });
  };

  const handleGroupChange = (newGroup: string) => {
    if (!editedInvoice) return;
    
    setEditedInvoice(prev => prev ? {
      ...prev,
      group: newGroup
    } : null);
  };

  if (!editedInvoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Edytuj fakturę
          </DialogTitle>
          <DialogDescription>
            Edytuj dane faktury i przypisania kategorii
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vendor Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Nazwa sprzedawcy</Label>
              <Input
                id="vendorName"
                value={editedInvoice.vendorName}
                onChange={(e) => handleFieldChange('vendorName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorNip">NIP sprzedawcy</Label>
              <Input
                id="vendorNip"
                value={editedInvoice.vendorNip || ''}
                onChange={(e) => handleFieldChange('vendorNip', e.target.value)}
              />
            </div>
          </div>

          {/* Buyer Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyerName">Nazwa nabywcy</Label>
              <Input
                id="buyerName"
                value={editedInvoice.buyerName}
                onChange={(e) => handleFieldChange('buyerName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyerNip">NIP nabywcy</Label>
              <Input
                id="buyerNip"
                value={editedInvoice.buyerNip}
                onChange={(e) => handleFieldChange('buyerNip', e.target.value)}
              />
            </div>
          </div>

          {/* Invoice Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Numer faktury</Label>
              <Input
                id="invoiceNumber"
                value={editedInvoice.invoiceNumber}
                onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate">Data wystawienia</Label>
              <Input
                id="issueDate"
                value={editedInvoice.issueDate || ''}
                onChange={(e) => handleFieldChange('issueDate', e.target.value)}
                placeholder="DD.MM.YYYY"
              />
            </div>
          </div>

          {/* Payment Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Termin płatności</Label>
              <Input
                id="dueDate"
                value={editedInvoice.dueDate || ''}
                onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                placeholder="DD.MM.YYYY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Sposób płatności</Label>
              <Input
                id="paymentMethod"
                value={editedInvoice.paymentMethod || ''}
                onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                placeholder="np. Przelew bankowy"
              />
            </div>
          </div>

          {/* MPK and Group Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grupa</Label>
              <Select value={editedInvoice.group} onValueChange={handleGroupChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz grupę" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_OPTIONS.map((group) => (
                    <SelectItem key={group.code} value={group.code}>
                      {group.code} - {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>MPK</Label>
              <Select 
                value={editedInvoice.mpk} 
                onValueChange={(value) => handleFieldChange('mpk', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz MPK" />
                </SelectTrigger>
                <SelectContent>
                  {MPK_OPTIONS.map((mpk) => (
                    <SelectItem key={mpk.code} value={mpk.code}>
                      {mpk.code} - {mpk.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current Label Preview */}
          <div className="space-y-2">
            <Label>Podgląd etykiety</Label>
            <Badge variant="outline" className="text-sm">
              {editedInvoice.group} – {editedInvoice.mpk} – {editedInvoice.sequentialNumber}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}