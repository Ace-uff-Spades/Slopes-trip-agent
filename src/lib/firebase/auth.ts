import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  onAuthStateChanged,
  Auth
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  // Ensure Firebase is initialized before getting auth
  try {
    require('@/lib/firebase/config').initializeFirebase();
  } catch (error) {
    console.error('Firebase not initialized before sign in:', error);
    throw new Error('Firebase is not properly configured. Please check your environment variables.');
  }
  
  const auth = getFirebaseAuth();
  
  if (!auth) {
    throw new Error('Firebase Auth is not available. Please ensure Firebase is properly initialized.');
  }
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  const auth = getFirebaseAuth();
  return auth.currentUser;
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (
  callback: (user: FirebaseUser | null) => void
): (() => void) => {
  // Ensure Firebase is initialized before getting auth
  try {
    require('@/lib/firebase/config').initializeFirebase();
  } catch (error) {
    console.error('Firebase not initialized before auth state change:', error);
    // Return a no-op function if Firebase isn't initialized
    return () => {};
  }
  
  const auth = getFirebaseAuth();
  
  if (!auth) {
    console.error('Firebase Auth is not available');
    return () => {};
  }
  
  return onAuthStateChanged(auth, callback);
};

