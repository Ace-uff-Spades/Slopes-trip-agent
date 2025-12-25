import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { getFirebaseDb } from './config';
import { UserState, PlanState, GeneratedSchedule } from '@/lib/types';
import { INITIAL_USER_STATE } from '@/lib/constants';

/**
 * Convert Firebase User to UserState
 */
export const firebaseUserToUserState = (firebaseUser: FirebaseUser): Partial<UserState> => {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
  };
};

/**
 * Get user data from Firestore
 */
export const getUserFromFirestore = async (userId: string): Promise<UserState | null> => {
  try {
    // Validate that user ID exists
    if (!userId || userId.trim() === '') {
      console.warn('getUserFromFirestore called with empty userId');
      return null;
    }
    
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, 'slopes-users', userId));
    
    if (userDoc.exists()) {
      return userDoc.data() as UserState;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user from Firestore:', error);
    throw error;
  }
};

/**
 * Create or update user in Firestore
 */
export const saveUserToFirestore = async (userData: UserState): Promise<UserState> => {
  try {
    // Validate that user ID exists
    if (!userData.id || userData.id.trim() === '') {
      throw new Error('User ID is required to save user to Firestore. User ID is missing or empty.');
    }
    
    const db = getFirebaseDb();
    const userRef = doc(db, 'slopes-users', userData.id);
    
    await setDoc(userRef, {
      ...userData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return userData;
  } catch (error) {
    console.error('Error saving user to Firestore:', error);
    throw error;
  }
};

/**
 * Initialize user in Firestore from Firebase Auth user
 */
export const initializeUserInFirestore = async (firebaseUser: FirebaseUser): Promise<UserState> => {
  try {
    // Validate Firebase Auth UID
    if (!firebaseUser.uid || firebaseUser.uid.trim() === '') {
      throw new Error('Firebase Auth UID is missing. Cannot initialize user.');
    }
    
    // Check if user already exists
    const existingUser = await getUserFromFirestore(firebaseUser.uid);
    
    if (existingUser) {
      // Ensure the ID is set correctly (in case it was missing in Firestore)
      if (!existingUser.id || existingUser.id.trim() === '') {
        console.warn('Existing user found with missing ID, updating with Firebase Auth UID');
        existingUser.id = firebaseUser.uid;
        // Save the corrected user back to Firestore
        await saveUserToFirestore(existingUser);
      }
      // Always ensure ID matches Firebase Auth UID (in case of mismatch)
      if (existingUser.id !== firebaseUser.uid) {
        console.warn(`User ID mismatch: Firestore has ${existingUser.id}, Firebase Auth has ${firebaseUser.uid}. Using Firebase Auth UID.`);
        existingUser.id = firebaseUser.uid;
        await saveUserToFirestore(existingUser);
      }
      return existingUser;
    }
    
    // Create new user - explicitly set ID from Firebase Auth UID
    const newUser: UserState = {
      ...INITIAL_USER_STATE,
      ...firebaseUserToUserState(firebaseUser),
      id: firebaseUser.uid, // Explicitly set ID from Firebase Auth
    };
    
    // Validate ID is set before saving
    if (!newUser.id || newUser.id.trim() === '') {
      throw new Error(`Failed to initialize user: Firebase Auth UID is missing. UID: ${firebaseUser.uid}`);
    }
    
    return await saveUserToFirestore(newUser);
  } catch (error) {
    console.error('Error initializing user in Firestore:', error);
    throw error;
  }
};

/**
 * Get plan from Firestore
 */
export const getPlanFromFirestore = async (planId: string): Promise<PlanState | null> => {
  try {
    const db = getFirebaseDb();
    const planDoc = await getDoc(doc(db, 'slopes-plans', planId));
    
    if (planDoc.exists()) {
      return planDoc.data() as PlanState;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting plan from Firestore:', error);
    throw error;
  }
};

/**
 * Save plan to Firestore
 */
export const savePlanToFirestore = async (planData: PlanState): Promise<PlanState> => {
  try {
    const db = getFirebaseDb();
    const planRef = doc(db, 'slopes-plans', planData.id);
    
    await setDoc(planRef, {
      ...planData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return planData;
  } catch (error) {
    console.error('Error saving plan to Firestore:', error);
    throw error;
  }
};

/**
 * Create plan in Firestore
 */
export const createPlanInFirestore = async (planData: Omit<PlanState, 'id'>): Promise<PlanState> => {
  try {
    const db = getFirebaseDb();
    const plansRef = collection(db, 'slopes-plans');
    
    // Generate plan ID
    const planId = `PLAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newPlan: PlanState = {
      ...planData,
      id: planId,
    };
    
    const planRef = doc(plansRef, planId);
    await setDoc(planRef, {
      ...newPlan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    return newPlan;
  } catch (error) {
    console.error('Error creating plan in Firestore:', error);
    throw error;
  }
};

/**
 * Delete plan from Firestore
 */
export const deletePlanFromFirestore = async (planId: string): Promise<void> => {
  try {
    if (!planId || planId.trim() === '') {
      throw new Error('Plan ID is required to delete from Firestore.');
    }
    
    const db = getFirebaseDb();
    const planRef = doc(db, 'slopes-plans', planId);
    await deleteDoc(planRef);
  } catch (error) {
    console.error('Error deleting plan from Firestore:', error);
    throw error;
  }
};

/**
 * Get plans by user from Firestore
 */
export const getPlansByUserFromFirestore = async (userId: string): Promise<PlanState[]> => {
  if (!userId || userId.trim() === '') {
    console.error('getPlansByUserFromFirestore: User ID is missing or empty.');
    return [];
  }
  try {
    const db = getFirebaseDb();
    const plansCollection = collection(db, 'slopes-plans');
    const q = query(plansCollection, where('members', 'array-contains', { id: userId }));
    const querySnapshot = await getDocs(q);
    const plans: PlanState[] = [];
    querySnapshot.forEach((doc) => {
      plans.push(doc.data() as PlanState);
    });
    return plans;
  } catch (error) {
    console.error('Error getting plans by user from Firestore:', error);
    throw error;
  }
};

/**
 * Save generated schedule to Firestore
 */
export const saveScheduleToFirestore = async (schedule: GeneratedSchedule): Promise<GeneratedSchedule> => {
  if (!schedule.planId || schedule.planId.trim() === '') {
    throw new Error('Plan ID is required to save schedule to Firestore. Plan ID is missing or empty.');
  }
  try {
    const db = getFirebaseDb();
    const scheduleRef = doc(db, 'slopes-generated-schedules', schedule.planId);
    
    await setDoc(scheduleRef, {
      ...schedule,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return schedule;
  } catch (error) {
    console.error('Error saving schedule to Firestore:', error);
    throw error;
  }
};

/**
 * Get generated schedule from Firestore
 */
export const getScheduleFromFirestore = async (planId: string): Promise<GeneratedSchedule | null> => {
  if (!planId || planId.trim() === '') {
    console.error('getScheduleFromFirestore: Plan ID is missing or empty.');
    return null;
  }
  try {
    const db = getFirebaseDb();
    const scheduleDoc = await getDoc(doc(db, 'slopes-generated-schedules', planId));
    
    if (scheduleDoc.exists()) {
      return scheduleDoc.data() as GeneratedSchedule;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting schedule from Firestore:', error);
    throw error;
  }
};

