import { useState, useEffect } from 'react';
import { ref, get, set, push, query, orderByChild } from 'firebase/database';
import { database } from '@/lib/firebase';
import { VendorMapping } from '@/types/invoice';

/**
 * Hook for managing vendor mappings in Firebase
 * Handles CRUD operations for vendor -> MPK/Group mappings
 */
export function useFirebaseVendors() {
  const [vendors, setVendors] = useState<Record<string, VendorMapping>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all vendors from Firebase on mount
  useEffect(() => {
    loadVendors();
  }, []);

  /**
   * Load all vendor mappings from Firebase
   */
  const loadVendors = async () => {
    try {
      setLoading(true);
      const vendorsRef = ref(database, 'vendors');
      const snapshot = await get(vendorsRef);
      
      if (snapshot.exists()) {
        setVendors(snapshot.val());
      } else {
        setVendors({});
      }
      setError(null);
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError('Nie udało się załadować listy sprzedawców');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Find vendor mapping by name (fuzzy matching)
   * @param vendorName - Name to search for
   */
  const findVendorMapping = (vendorName: string): VendorMapping | null => {
    const normalized = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // First try exact match
    for (const [key, vendor] of Object.entries(vendors)) {
      const vendorNormalized = vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (vendorNormalized === normalized) {
        return vendor;
      }
    }

    // Then try partial match
    for (const [key, vendor] of Object.entries(vendors)) {
      const vendorNormalized = vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized.includes(vendorNormalized) || vendorNormalized.includes(normalized)) {
        return vendor;
      }
    }

    return null;
  };

  /**
   * Save new vendor mapping to Firebase
   * @param vendorName - Original vendor name
   * @param mpk - MPK code
   * @param group - Group code
   * @param category - Optional category description
   */
  const saveVendorMapping = async (
    vendorName: string, 
    mpk: string, 
    group: string, 
    category?: string
  ): Promise<boolean> => {
    try {
      const vendorKey = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const vendorData: VendorMapping = {
        name: vendorName,
        mpk,
        group,
        category,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      const vendorRef = ref(database, `vendors/${vendorKey}`);
      await set(vendorRef, vendorData);

      // Update local state
      setVendors(prev => ({
        ...prev,
        [vendorKey]: vendorData
      }));

      return true;
    } catch (err) {
      console.error('Error saving vendor mapping:', err);
      setError('Nie udało się zapisać mapowania sprzedawcy');
      return false;
    }
  };

  /**
   * Update last used timestamp for vendor
   * @param vendorName - Vendor name to update
   */
  const updateVendorLastUsed = async (vendorName: string): Promise<void> => {
    try {
      const vendorKey = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const vendor = vendors[vendorKey];
      
      if (vendor) {
        const updatedVendor = { ...vendor, lastUsed: Date.now() };
        const vendorRef = ref(database, `vendors/${vendorKey}`);
        await set(vendorRef, updatedVendor);
        
        setVendors(prev => ({
          ...prev,
          [vendorKey]: updatedVendor
        }));
      }
    } catch (err) {
      console.error('Error updating vendor last used:', err);
    }
  };

  return {
    vendors,
    loading,
    error,
    findVendorMapping,
    saveVendorMapping,
    updateVendorLastUsed,
    reloadVendors: loadVendors
  };
}