import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '@/lib/firebase';

interface BuyerMapping {
  nip: string;
  name: string;
  address: string;
  createdAt: number;
  lastUsed: number;
}

interface BuyerVerificationRule {
  nip: string;
  namePatterns: string[];
  addressPatterns: string[];
}

/**
 * Custom hook for managing buyer NIP verification and mapping
 * Provides three-level verification: by NIP, name patterns, and address patterns
 */
export function useBuyerNipMapping() {
  const [loading, setLoading] = useState(false);
  const [buyerMappings, setBuyerMappings] = useState<Record<string, BuyerMapping>>({});
  
  // Predefined verification rules
  const verificationRules: BuyerVerificationRule[] = [
    {
      nip: '8522482321',
      namePatterns: ['twój instalator', 'twoj instalator', 'piotr murawski'],
      addressPatterns: ['bohaterów warszawy', 'bohaterow warszawy', 'warszaw']
    },
    {
      nip: '8522669232',
      namePatterns: ['qborg', 'qborg spółka', 'qborg spolka'],
      addressPatterns: ['3 maja', '3maja', 'maja 8']
    }
  ];

  /**
   * Load all buyer mappings from Firebase
   */
  const loadBuyerMappings = async () => {
    try {
      setLoading(true);
      const mappingsRef = ref(database, 'buyerMappings');
      const snapshot = await get(mappingsRef);
      
      if (snapshot.exists()) {
        const mappings = snapshot.val();
        setBuyerMappings(mappings || {});
      } else {
        setBuyerMappings({});
      }
    } catch (error) {
      console.error('Error loading buyer mappings:', error);
      setBuyerMappings({});
    } finally {
      setLoading(false);
    }
  };

  /**
   * Normalize text for pattern matching
   */
  const normalizeText = (text: string): string => {
    return text.toLowerCase()
      .replace(/ą/g, 'a')
      .replace(/ć/g, 'c')
      .replace(/ę/g, 'e')
      .replace(/ł/g, 'l')
      .replace(/ń/g, 'n')
      .replace(/ó/g, 'o')
      .replace(/ś/g, 's')
      .replace(/ź/g, 'z')
      .replace(/ż/g, 'z')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  /**
   * Verify buyer NIP using three-level verification
   * @param buyerName - Buyer name from invoice
   * @param buyerNip - Buyer NIP from invoice
   * @param buyerAddress - Buyer address from invoice (if available)
   * @returns Verification result with corrected NIP if needed
   */
  const verifyBuyerNip = (
    buyerName: string, 
    buyerNip: string, 
    buyerAddress?: string
  ): {
    isValid: boolean;
    correctedNip?: string;
    matchedBy?: 'nip' | 'name' | 'address';
    confidence: number;
  } => {
    const normalizedName = normalizeText(buyerName);
    const normalizedAddress = buyerAddress ? normalizeText(buyerAddress) : '';

    // Check against predefined rules
    for (const rule of verificationRules) {
      let matchScore = 0;
      let matchedBy: 'nip' | 'name' | 'address' | undefined;

      // Check NIP match (highest priority)
      if (buyerNip === rule.nip) {
        return {
          isValid: true,
          matchedBy: 'nip',
          confidence: 1.0
        };
      }

      // Check name patterns
      const nameMatch = rule.namePatterns.some(pattern => 
        normalizedName.includes(normalizeText(pattern))
      );
      
      if (nameMatch) {
        matchScore += 0.6;
        matchedBy = 'name';
      }

      // Check address patterns
      if (normalizedAddress) {
        const addressMatch = rule.addressPatterns.some(pattern => 
          normalizedAddress.includes(normalizeText(pattern))
        );
        
        if (addressMatch) {
          matchScore += 0.4;
          if (!matchedBy) matchedBy = 'address';
        }
      }

      // If we have a strong match, suggest correction
      if (matchScore >= 0.6) {
        return {
          isValid: buyerNip === rule.nip,
          correctedNip: rule.nip,
          matchedBy,
          confidence: matchScore
        };
      }
    }

    // Check against saved mappings
    const savedMapping = Object.values(buyerMappings).find(mapping => {
      const savedNameNorm = normalizeText(mapping.name);
      const savedAddressNorm = normalizeText(mapping.address);
      
      return normalizedName.includes(savedNameNorm) || 
             savedNameNorm.includes(normalizedName) ||
             (normalizedAddress && (
               normalizedAddress.includes(savedAddressNorm) ||
               savedAddressNorm.includes(normalizedAddress)
             ));
    });

    if (savedMapping) {
      return {
        isValid: buyerNip === savedMapping.nip,
        correctedNip: savedMapping.nip,
        matchedBy: 'name',
        confidence: 0.8
      };
    }

    // No match found
    return {
      isValid: true, // Assume valid if no rules match
      confidence: 0.5
    };
  };

  /**
   * Save buyer mapping for future verification
   */
  const saveBuyerMapping = async (
    nip: string,
    name: string,
    address: string = ''
  ) => {
    try {
      setLoading(true);
      
      const mapping: BuyerMapping = {
        nip,
        name,
        address,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      // Create a key based on normalized name
      const key = normalizeText(name).replace(/\s+/g, '_');
      
      // Update local state
      setBuyerMappings(prev => ({
        ...prev,
        [key]: mapping
      }));

      // Save to Firebase
      const mappingRef = ref(database, `buyerMappings/${key}`);
      await set(mappingRef, mapping);
      
      console.log('✅ Buyer mapping saved:', { nip, name, address });
      
    } catch (error) {
      console.error('❌ Error saving buyer mapping:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update last used timestamp for a mapping
   */
  const updateBuyerLastUsed = async (nip: string) => {
    try {
      const mapping = Object.entries(buyerMappings).find(([_, m]) => m.nip === nip);
      if (mapping) {
        const [key, mappingData] = mapping;
        const updatedMapping = { ...mappingData, lastUsed: Date.now() };
        
        setBuyerMappings(prev => ({
          ...prev,
          [key]: updatedMapping
        }));

        const mappingRef = ref(database, `buyerMappings/${key}`);
        await set(mappingRef, updatedMapping);
      }
    } catch (error) {
      console.error('Error updating buyer last used:', error);
    }
  };

  // Load mappings on initialization
  useEffect(() => {
    loadBuyerMappings();
  }, []);

  return {
    loading,
    buyerMappings,
    verifyBuyerNip,
    saveBuyerMapping,
    updateBuyerLastUsed,
    reloadMappings: loadBuyerMappings
  };
}