import { useState } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { InvoiceCounter } from '@/types/invoice';

/**
 * Hook for managing invoice sequential numbering per buyer NIP
 * Each buyer NIP has separate counters for different MPK/Group combinations
 */
export function useInvoiceCounters() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate next sequential number for given buyer NIP, MPK and Group
   * @param buyerNip - NIP of the buyer (nabywca)
   * @param mpk - MPK code
   * @param group - Group code
   * @param vendorName - Name of the vendor (for special formatting)
   * @returns Promise with next number and year
   */
  const getNextSequentialNumber = async (
    buyerNip: string,
    mpk: string,
    group: string,
    vendorName?: string
  ): Promise<{ number: number; year: number }> => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      
      // Global counter for this buyer NIP - counts all invoices regardless of MPK/Group
      const counterRef = ref(database, `counters/${buyerNip}/global`);
      
      const snapshot = await get(counterRef);
      let counter: InvoiceCounter;
      
      if (snapshot.exists()) {
        counter = snapshot.val();
        
        // If it's a new year, reset counter to 1
        if (counter.year !== currentYear) {
          counter = {
            lastNumber: 1,
            year: currentYear
          };
        } else {
          // Increment existing counter
          counter.lastNumber += 1;
        }
      } else {
        // First time for this combination
        counter = {
          lastNumber: 1,
          year: currentYear
        };
      }
      
      // Save updated counter back to Firebase
      await set(counterRef, counter);
      
      setError(null);
      return {
        number: counter.lastNumber,
        year: counter.year
      };
      
    } catch (err) {
      console.error('Error getting next sequential number:', err);
      setError('Nie udało się wygenerować kolejnego numeru');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get current counter state for debugging/display purposes
   * @param buyerNip - NIP of the buyer
   * @param mpk - MPK code  
   * @param group - Group code
   */
  const getCurrentCounter = async (
    buyerNip: string,
    mpk: string,
    group: string
  ): Promise<InvoiceCounter | null> => {
    try {
      const counterRef = ref(database, `counters/${buyerNip}/global`);
      
      const snapshot = await get(counterRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (err) {
      console.error('Error getting current counter:', err);
      return null;
    }
  };

  /**
   * Reset counter to specific number for given buyer NIP, MPK and Group
   * @param buyerNip - NIP of the buyer
   * @param mpk - MPK code  
   * @param group - Group code
   * @param newLastNumber - New last number to set
   */
  const resetCounter = async (
    buyerNip: string,
    mpk: string,
    group: string,
    newLastNumber: number
  ): Promise<void> => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      
      const counterRef = ref(database, `counters/${buyerNip}/global`);
      
      const newCounter: InvoiceCounter = {
        lastNumber: newLastNumber,
        year: currentYear
      };
      
      await set(counterRef, newCounter);
      setError(null);
    } catch (err) {
      console.error('Error resetting counter:', err);
      setError('Nie udało się zresetować licznika');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getNextSequentialNumber,
    getCurrentCounter,
    resetCounter
  };
}