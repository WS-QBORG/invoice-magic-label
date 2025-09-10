import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database, ensureAuthReady } from '@/lib/firebase';

interface VendorNipMapping {
  vendorNip: string;
  vendorName: string;
  mpk: string;
  group: string;
  category?: string;
  createdAt: number;
  lastUsed: number;
}

/**
 * Custom hook for managing vendor NIP to MPK/group mappings
 * Stores and retrieves vendor MPK/group assignments based on their NIP numbers
 */
export function useVendorNipToMapping() {
  const [loading, setLoading] = useState(false);
  const [vendorNipMappings, setVendorNipMappings] = useState<Record<string, VendorNipMapping>>({});

  /**
   * Load all vendor NIP to mapping assignments from Firebase
   */
  const loadVendorNipMappings = async () => {
    try {
      setLoading(true);
      await ensureAuthReady();
      const mappingsRef = ref(database, 'vendorNipToMappings');
      const snapshot = await get(mappingsRef);
      
      if (snapshot.exists()) {
        const mappings = snapshot.val();
        setVendorNipMappings(mappings || {});
      } else {
        setVendorNipMappings({});
      }
    } catch (error) {
      console.error('Error loading vendor NIP to mapping assignments:', error);
      setVendorNipMappings({});
    } finally {
      setLoading(false);
    }
  };

  /**
   * Find vendor mapping by NIP
   * @param vendorNip - Vendor NIP number
   * @returns Vendor mapping if found, undefined otherwise
   */
  const findVendorMappingByNip = (vendorNip: string | undefined): VendorNipMapping | undefined => {
    if (!vendorNip) return undefined;
    const cleanNip = vendorNip.replace(/\D/g, ''); // Remove non-digits
    return vendorNipMappings[cleanNip];
  };

  /**
   * Save vendor NIP to mapping assignment
   * @param vendorNip - Vendor NIP number
   * @param vendorName - Vendor name
   * @param mpk - MPK code
   * @param group - Group code
   * @param category - Optional category description
   */
  const saveVendorNipMapping = async (
    vendorNip: string, 
    vendorName: string, 
    mpk: string, 
    group: string, 
    category?: string
  ) => {
    try {
      await ensureAuthReady();
      setLoading(true);
      
      const cleanNip = vendorNip.replace(/\D/g, ''); // Remove non-digits
      const mapping: VendorNipMapping = {
        vendorNip: cleanNip,
        vendorName,
        mpk,
        group,
        category,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      // Update local state immediately
      setVendorNipMappings(prev => ({
        ...prev,
        [cleanNip]: mapping
      }));

      // Save to Firebase
      const mappingRef = ref(database, `vendorNipToMappings/${cleanNip}`);
      await set(mappingRef, mapping);
      
      console.log('✅ Vendor NIP to mapping assignment saved:', { vendorNip: cleanNip, vendorName, mpk, group });
      
    } catch (error) {
      console.error('❌ Error saving vendor NIP to mapping assignment:', error);
      // Revert local state on error
      setVendorNipMappings(prev => {
        const updated = { ...prev };
        delete updated[vendorNip.replace(/\D/g, '')];
        return updated;
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update last used timestamp for a vendor NIP mapping
   * @param vendorNip - Vendor NIP number
   */
  const updateVendorNipMappingLastUsed = async (vendorNip: string) => {
    try {
      await ensureAuthReady();
      const cleanNip = vendorNip.replace(/\D/g, '');
      const mapping = vendorNipMappings[cleanNip];
      
      if (mapping) {
        const updatedMapping = { ...mapping, lastUsed: Date.now() };
        
        setVendorNipMappings(prev => ({
          ...prev,
          [cleanNip]: updatedMapping
        }));

        const mappingRef = ref(database, `vendorNipToMappings/${cleanNip}`);
        await set(mappingRef, updatedMapping);
      }
    } catch (error) {
      console.error('Error updating vendor NIP mapping last used:', error);
    }
  };

  /**
   * Get all vendor NIP mappings for display/management
   */
  const getAllVendorNipMappings = () => {
    return Object.entries(vendorNipMappings).map(([nip, mapping]) => ({
      nip,
      ...mapping
    }));
  };

  // Load mappings on hook initialization
  useEffect(() => {
    loadVendorNipMappings();
  }, []);

  return {
    loading,
    vendorNipMappings,
    findVendorMappingByNip,
    saveVendorNipMapping,
    updateVendorNipMappingLastUsed,
    getAllVendorNipMappings,
    reloadMappings: loadVendorNipMappings
  };
}