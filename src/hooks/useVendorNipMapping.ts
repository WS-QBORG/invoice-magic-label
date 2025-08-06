import { useState, useEffect } from 'react';
import { ref, get, set, push, child } from 'firebase/database';
import { database } from '@/lib/firebase';

/**
 * Custom hook for managing vendor NIP to name mappings
 * Stores and retrieves vendor names based on their NIP numbers
 */
export function useVendorNipMapping() {
  const [loading, setLoading] = useState(false);
  const [vendorNipMappings, setVendorNipMappings] = useState<Record<string, string>>({});

  /**
   * Load all vendor NIP mappings from Firebase
   */
  const loadVendorNipMappings = async () => {
    try {
      setLoading(true);
      const mappingsRef = ref(database, 'vendorNipMappings');
      const snapshot = await get(mappingsRef);
      
      if (snapshot.exists()) {
        const mappings = snapshot.val();
        setVendorNipMappings(mappings || {});
      } else {
        setVendorNipMappings({});
      }
    } catch (error) {
      console.error('Error loading vendor NIP mappings:', error);
      setVendorNipMappings({});
    } finally {
      setLoading(false);
    }
  };

  /**
   * Find vendor name by NIP
   * @param vendorNip - Vendor NIP number
   * @returns Vendor name if found, undefined otherwise
   */
  const findVendorNameByNip = (vendorNip: string | undefined): string | undefined => {
    if (!vendorNip) return undefined;
    return vendorNipMappings[vendorNip];
  };

  /**
   * Save vendor name mapping for a specific NIP
   * @param vendorNip - Vendor NIP number
   * @param vendorName - Vendor name to save
   */
  const saveVendorNipMapping = async (vendorNip: string, vendorName: string) => {
    try {
      setLoading(true);
      
      // Update local state immediately
      setVendorNipMappings(prev => ({
        ...prev,
        [vendorNip]: vendorName
      }));

      // Save to Firebase
      const mappingRef = ref(database, `vendorNipMappings/${vendorNip}`);
      await set(mappingRef, vendorName);
      
      console.log('✅ Vendor NIP mapping saved:', { vendorNip, vendorName });
      
    } catch (error) {
      console.error('❌ Error saving vendor NIP mapping:', error);
      // Revert local state on error
      setVendorNipMappings(prev => {
        const updated = { ...prev };
        delete updated[vendorNip];
        return updated;
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if a vendor name should be updated based on NIP
   * @param extractedName - Name extracted from invoice
   * @param vendorNip - Vendor NIP from invoice
   * @returns Object with shouldUpdate flag and suggested name
   */
  const checkVendorNameUpdate = (extractedName: string, vendorNip: string | undefined) => {
    if (!vendorNip) {
      return { shouldUpdate: false, suggestedName: extractedName };
    }

    const savedName = findVendorNameByNip(vendorNip);
    
    if (savedName) {
      // We have a saved name for this NIP
      if (savedName !== extractedName) {
        return { 
          shouldUpdate: true, 
          suggestedName: savedName,
          extractedName 
        };
      }
    }
    
    return { shouldUpdate: false, suggestedName: extractedName };
  };

  /**
   * Get all vendor NIP mappings for display/management
   */
  const getAllMappings = () => {
    return Object.entries(vendorNipMappings).map(([nip, name]) => ({
      nip,
      name
    }));
  };

  // Load mappings on hook initialization
  useEffect(() => {
    loadVendorNipMappings();
  }, []);

  return {
    loading,
    vendorNipMappings,
    findVendorNameByNip,
    saveVendorNipMapping,
    checkVendorNameUpdate,
    getAllMappings,
    reloadMappings: loadVendorNipMappings
  };
}