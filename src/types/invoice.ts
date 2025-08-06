// Types for invoice analysis system

export interface VendorMapping {
  name: string;           // Original vendor name
  mpk: string;           // MPK code (e.g., "MPK610")
  group: string;         // Group code (e.g., "3/8")
  category?: string;     // Optional category description
  createdAt: number;     // Timestamp when added
  lastUsed: number;      // Last time this mapping was used
}

export interface InvoiceData {
  id?: string;          // Firebase ID for saved invoices
  vendorName: string;    // Sprzedawca name
  vendorNip?: string;    // Sprzedawca NIP
  buyerName: string;     // Nabywca name  
  buyerNip: string;      // Nabywca NIP
  invoiceNumber: string; // Invoice number from document
  issueDate?: string;    // Data wystawienia
  dueDate?: string;      // Termin płatności
  paymentMethod?: string; // Sposób płatności
  mpk: string;          // Assigned MPK
  group: string;        // Assigned group
  sequentialNumber: string; // Generated sequential number
  label: string;        // Complete label for PDF
  processedAt: number;  // Timestamp when processed
  savedAt?: number;     // Timestamp when saved to Firebase
  lastModified?: number; // Timestamp when last modified
  fileName?: string;    // Original file name
}

export interface InvoiceCounter {
  lastNumber: number;   // Last used sequential number
  year: number;        // Current year
}

export interface PendingInvoiceData {
  vendorName: string;
  vendorNip?: string;
  buyerName: string;
  buyerNip: string;
  invoiceNumber: string;
  issueDate?: string;
  dueDate?: string;
  paymentMethod?: string;
}

export interface ProcessingResult {
  success: boolean;
  data?: InvoiceData;
  needsUserInput?: boolean;
  suggestedMpk?: string;
  suggestedGroup?: string;
  error?: string;
}