import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Get Firebase config from environment variables
const getFirebaseConfig = (): FirebaseConfig => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };

  // Validate that all required config values are present
  // Only validate in browser/client-side (not during SSR)
  if (typeof window !== 'undefined') {
    const missingKeys = Object.entries(config)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      console.warn(
        `Missing Firebase configuration: ${missingKeys.join(', ')}. ` +
        'Please add them to your .env.local file. Firebase features will not work until configured.'
      );
    }
  }

  return config as FirebaseConfig;
};

// Initialize Firebase App (singleton pattern)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export const initializeFirebase = (): { app: FirebaseApp; auth: Auth; db: Firestore } => {
  const isServer = typeof window === 'undefined';

  // Return existing instances if already initialized
  if (app && db && (!isServer && auth)) {
    return { app, auth: auth!, db };
  }

  // Check if Firebase is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    // Initialize Firebase App
    const config = getFirebaseConfig();
    
    // Validate config before initializing
    const missingKeys = Object.entries(config)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      const errorMessage = `Firebase configuration is missing: ${missingKeys.join(', ')}. Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Validate that apiKey is not empty (most critical)
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('Firebase API key is missing. Please set NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file.');
    }

    try {
      app = initializeApp(config);
    } catch (error) {
      console.error('Failed to initialize Firebase app:', error);
      throw error;
    }
  }

  // Initialize Auth (only on client-side)
  if (!isServer) {
    try {
      if (!auth) {
        auth = getAuth(app);
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Auth:', error);
      throw error;
    }
  }

  // Initialize Firestore (works on both client and server)
  try {
    if (!db) {
      db = getFirestore(app);
    }
  } catch (error) {
    console.error('Failed to initialize Firestore:', error);
    throw error;
  }

  // On server, return a dummy auth object (Auth is client-only)
  return { app, auth: auth || ({} as Auth), db };
};

// Get Firebase instances (will initialize if not already done)
export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    initializeFirebase();
  }
  return app!;
};

export const getFirebaseAuth = (): Auth => {
  // Auth is only available on client-side
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth can only be used on the client-side');
  }
  if (!auth) {
    initializeFirebase();
  }
  if (!auth) {
    throw new Error('Failed to initialize Firebase Auth. Please check your Firebase configuration.');
  }
  return auth;
};

export const getFirebaseDb = (): Firestore => {
  if (!db) {
    initializeFirebase();
  }
  if (!db) {
    throw new Error('Failed to initialize Firestore. Please check your Firebase configuration.');
  }
  return db;
};

