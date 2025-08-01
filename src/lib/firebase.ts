import { initializeApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

// Firebase configuration - using your provided database URL
const firebaseConfig = {
  databaseURL: "https://faktury-eb7b4-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database: Database = getDatabase(app);

// Database structure:
// /vendors/{vendorKey} - vendor mappings
// /counters/{nipBuyer}/{mpk}_{group} - invoice counters per buyer NIP
// /invoices/{year}/{month} - processed invoices for reporting