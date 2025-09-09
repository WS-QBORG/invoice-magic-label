import { initializeApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, onAuthStateChanged, signInAnonymously, Auth } from 'firebase/auth';

// Firebase configuration - extended to support Authentication when provided
// Public web config can be safely embedded. Additional keys can be injected at runtime
// by setting window.FIREBASE_PUBLIC_CONFIG before the app loads.
const firebaseConfig = {
  databaseURL: 'https://faktury-eb7b4-default-rtdb.europe-west1.firebasedatabase.app/',
  // Optionally merge extra public config fields like apiKey, authDomain, projectId, appId
  ...(typeof window !== 'undefined' && (window as any).FIREBASE_PUBLIC_CONFIG ? (window as any).FIREBASE_PUBLIC_CONFIG : {}),
} as const;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database: Database = getDatabase(app);

// Detect whether Auth can be initialized (requires apiKey in config)
const hasAuthConfig = !!(firebaseConfig as any).apiKey;

// Initialize Auth only if configured; export as nullable to avoid crashes without apiKey
export let auth: Auth | null = null;

let authReadyResolve: (() => void) | null = null;
const authReadyPromise: Promise<void> = new Promise((resolve) => {
  authReadyResolve = resolve;
});

function resolveAuthReady() {
  if (authReadyResolve) {
    authReadyResolve();
    authReadyResolve = null;
  }
}

// Start anonymous auth to satisfy RTDB rules that require authenticated users
(function initAnonymousAuth() {
  try {
    if (!hasAuthConfig) {
      console.warn('ℹ️ Firebase Auth not configured (missing apiKey). Skipping auth init.');
      resolveAuthReady();
      return;
    }

    auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('✅ Firebase auth ready. UID:', user.uid);
        resolveAuthReady();
      }
    });

    signInAnonymously(auth).catch((err) => {
      console.warn('⚠️ Anonymous sign-in failed (enable in Firebase Console?):', err?.message || err);
      // Do not block the app; DB operations may still fail if rules require auth
      resolveAuthReady();
    });
  } catch (e) {
    console.warn('⚠️ Auth initialization error:', e);
    resolveAuthReady();
  }
})();

// Await this before any DB access to ensure auth is attempted
export const ensureAuthReady = async (): Promise<void> => {
  return authReadyPromise;
};

// Database structure:
// /vendors/{vendorKey} - vendor mappings
// /vendorNipMappings/{nip} - vendor NIP -> name mappings
// /buyerMappings/{key} - buyer verification mappings
// /processedInvoices/{id} - processed invoices for reporting
