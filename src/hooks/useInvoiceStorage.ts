import { useState, useEffect } from 'react';
import { ref, get, set, push, child, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { InvoiceData } from '@/types/invoice';

/**
 * Hook for managing invoice storage in Firebase
 * Handles saving, loading, updating and deleting processed invoices
 */
export function useInvoiceStorage() {
  const [loading, setLoading] = useState(false);
  const [savedInvoices, setSavedInvoices] = useState<InvoiceData[]>([]);

  /**
   * Load all saved invoices from Firebase
   */
  const loadSavedInvoices = async () => {
    try {
      setLoading(true);
      const invoicesRef = ref(database, 'processedInvoices');
      const snapshot = await get(invoicesRef);
      
      if (snapshot.exists()) {
        const invoicesData = snapshot.val();
        const invoicesList = Object.entries(invoicesData).map(([id, invoice]) => ({
          ...(invoice as InvoiceData),
          id
        }));
        
        // Sort by processedAt (newest first)
        invoicesList.sort((a, b) => (b.processedAt || 0) - (a.processedAt || 0));
        setSavedInvoices(invoicesList);
      } else {
        setSavedInvoices([]);
      }
    } catch (error) {
      console.error('Error loading saved invoices:', error);
      setSavedInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save a new invoice to Firebase
   * @param invoice - Invoice data to save
   * @returns Promise with the saved invoice ID
   */
  const saveInvoice = async (invoice: InvoiceData): Promise<string> => {
    try {
      setLoading(true);
      
      const invoicesRef = ref(database, 'processedInvoices');
      const newInvoiceRef = push(invoicesRef);
      
      const invoiceToSave = {
        ...invoice,
        id: newInvoiceRef.key,
        savedAt: Date.now()
      };
      
      await set(newInvoiceRef, invoiceToSave);
      
      // Update local state
      setSavedInvoices(prev => [invoiceToSave, ...prev]);
      
      console.log('✅ Invoice saved to Firebase:', invoiceToSave.id);
      return newInvoiceRef.key!;
      
    } catch (error) {
      console.error('❌ Error saving invoice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update an existing invoice in Firebase
   * @param invoiceId - ID of the invoice to update
   * @param updatedInvoice - Updated invoice data
   */
  const updateInvoice = async (invoiceId: string, updatedInvoice: InvoiceData) => {
    try {
      setLoading(true);
      
      const invoiceRef = ref(database, `processedInvoices/${invoiceId}`);
      const invoiceToUpdate = {
        ...updatedInvoice,
        id: invoiceId,
        lastModified: Date.now()
      };
      
      await set(invoiceRef, invoiceToUpdate);
      
      // Update local state
      setSavedInvoices(prev => 
        prev.map(invoice => 
          invoice.id === invoiceId ? invoiceToUpdate : invoice
        )
      );
      
      console.log('✅ Invoice updated in Firebase:', invoiceId);
      
    } catch (error) {
      console.error('❌ Error updating invoice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete an invoice from Firebase
   * @param invoiceId - ID of the invoice to delete
   */
  const deleteInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      
      const invoiceRef = ref(database, `processedInvoices/${invoiceId}`);
      await remove(invoiceRef);
      
      // Update local state
      setSavedInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
      
      console.log('✅ Invoice deleted from Firebase:', invoiceId);
      
    } catch (error) {
      console.error('❌ Error deleting invoice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Find invoices by various criteria
   * @param criteria - Search criteria
   */
  const findInvoices = (criteria: {
    vendorName?: string;
    vendorNip?: string;
    buyerNip?: string;
    mpk?: string;
    group?: string;
  }) => {
    return savedInvoices.filter(invoice => {
      const matchesVendorName = !criteria.vendorName || 
        invoice.vendorName.toLowerCase().includes(criteria.vendorName.toLowerCase());
      
      const matchesVendorNip = !criteria.vendorNip || 
        invoice.vendorNip === criteria.vendorNip;
      
      const matchesBuyerNip = !criteria.buyerNip || 
        invoice.buyerNip === criteria.buyerNip;
      
      const matchesMpk = !criteria.mpk || 
        invoice.mpk === criteria.mpk;
      
      const matchesGroup = !criteria.group || 
        invoice.group === criteria.group;
      
      return matchesVendorName && matchesVendorNip && matchesBuyerNip && 
             matchesMpk && matchesGroup;
    });
  };

  // Load invoices on hook initialization
  useEffect(() => {
    loadSavedInvoices();
  }, []);

  return {
    loading,
    savedInvoices,
    saveInvoice,
    updateInvoice,
    deleteInvoice,
    findInvoices,
    reloadInvoices: loadSavedInvoices
  };
}