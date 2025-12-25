'use client'

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { UserState, PlanState, Member, PlanMetadata } from '@/lib/types';
import { INITIAL_USER_STATE } from '@/lib/constants';
import { StorageService } from '@/services/storage';
import { onAuthStateChange } from '@/lib/firebase/auth';
import { getCurrentUser } from '@/lib/firebase/auth';
import { 
  initializeUserInFirestore, 
  getUserFromFirestore, 
  saveUserToFirestore,
  getPlanFromFirestore,
  savePlanToFirestore,
  createPlanInFirestore
} from '@/lib/firebase/user';
import { getFirebaseDb } from '@/lib/firebase/config';

interface AppContextType {
  user: UserState | null;
  planData: PlanState | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<UserState | null>>;
  setPlanData: React.Dispatch<React.SetStateAction<PlanState | null>>;
  updateUser: (field: keyof UserState, value: any) => Promise<void>;
  createPlan: (metadata: PlanMetadata, userProfile: Partial<UserState>) => Promise<void>;
  joinPlan: (id: string) => Promise<void>;
  leavePlan: () => Promise<void>;
  deletePlan: () => Promise<void>;
  kickMember: (memberId: string) => Promise<void>;
  promoteMember: (memberId: string) => Promise<void>;
  isOwner: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { 
  children: ReactNode;
}) => {
  const [user, setUser] = useState<UserState | null>(null);
  const [planData, setPlanData] = useState<PlanState | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Firebase Auth and load user data
  useEffect(() => {
    // Initialize Firebase
    try {
      require('@/lib/firebase/config').initializeFirebase();
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      setLoading(false);
      return;
    }

    // Listen to auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Validate Firebase Auth UID exists
          if (!firebaseUser.uid || firebaseUser.uid.trim() === '') {
            console.error('Firebase Auth user has no UID:', firebaseUser);
            setLoading(false);
            return;
          }
          
          // Initialize or get user from Firestore
          const userData = await initializeUserInFirestore(firebaseUser);
          
          // Validate user data has ID
          if (!userData.id || userData.id.trim() === '') {
            console.error('User data loaded without ID:', userData);
            console.error('Firebase Auth UID:', firebaseUser.uid);
            // Force set the ID from Firebase Auth UID
            userData.id = firebaseUser.uid;
            // Save the corrected user
            await saveUserToFirestore(userData);
            console.log('Corrected user ID from Firebase Auth UID');
          }
          
          // Double-check ID matches Firebase Auth UID
          if (userData.id !== firebaseUser.uid) {
            console.warn(`User ID mismatch: ${userData.id} vs ${firebaseUser.uid}. Correcting...`);
            userData.id = firebaseUser.uid;
            await saveUserToFirestore(userData);
          }
          
          console.log('User loaded successfully:', { id: userData.id, name: userData.name });
          setUser(userData);
          
          // Load plan if user has one
          if (userData.planId) {
            const plan = await getPlanFromFirestore(userData.planId);
            setPlanData(plan);
          } else {
            setPlanData(null);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          // Set user to null on error to prevent using invalid user data
          setUser(null);
          setPlanData(null);
        } finally {
          setLoading(false);
        }
      } else {
        // User signed out
        setUser(null);
        setPlanData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load plan if user has one active
  useEffect(() => {
    if (user?.planId && !planData) {
      getPlanFromFirestore(user.planId)
        .then((plan) => {
          if (plan) {
            setPlanData(plan);
          } else {
            // Plan might have been deleted
            setUser(prev => prev ? { ...prev, planId: null } : null);
          }
        })
        .catch((error) => {
          console.error('Failed to load plan:', error);
        });
    } else if (!user?.planId) {
      setPlanData(null);
    }
  }, [user?.planId, planData]);

  // Persist user changes to Firestore
  useEffect(() => {
    // Only save if user exists, has a valid ID, and is not loading
    if (user && user.id && user.id.trim() !== '' && !loading) {
      // Skip saving if this is the initial load (to avoid saving before user is fully initialized)
      saveUserToFirestore(user).catch((error) => {
        console.error('Failed to save user to Firestore:', error);
        // If error is about missing ID, try to re-initialize
        if (error instanceof Error && error.message.includes('User ID is required')) {
          console.warn('User ID missing during auto-save, will be fixed on next auth state change');
        }
      });
    } else if (user && (!user.id || user.id.trim() === '')) {
      console.warn('User object exists but ID is missing:', user);
    }
  }, [user, loading]);

  // Persist plan changes to Firestore (but skip if plan was just created to avoid duplicate saves)
  // Use a ref to track if we just created the plan
  const justCreatedPlanRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (planData && planData.id) {
      // Skip auto-save if this is the plan we just created (it's already saved)
      if (justCreatedPlanRef.current === planData.id) {
        justCreatedPlanRef.current = null; // Reset after first skip
        return;
      }
      
      // Small delay to ensure plan was created first
      const timeoutId = setTimeout(() => {
        savePlanToFirestore(planData).catch((error) => {
          console.error('Failed to save plan to Firestore:', error);
        });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [planData]);

  const updateUser = async (field: keyof UserState, value: any) => {
    if (!user) return;
    if (!user.id || user.id.trim() === '') {
      console.error('Cannot update user: user ID is missing');
      throw new Error('User ID is required to update user. Please sign in again.');
    }
    const updated = { ...user, [field]: value, id: user.id }; // Preserve ID
    setUser(updated);
    await saveUserToFirestore(updated);
  };

  const createPlan = async (metadata: PlanMetadata, userProfile: Partial<UserState>) => {
    if (!user) {
      console.error('Cannot create plan: user is null');
      throw new Error('User is not signed in. Please sign in again.');
    }
    
    // Validate user has an ID - if missing, try to get it from Firebase Auth
    let currentUser = user;
    if (!user.id || user.id.trim() === '') {
      console.warn('User ID is missing, attempting to re-initialize from Firebase Auth', { user });
      try {
        const firebaseAuthUser = getCurrentUser();
        if (firebaseAuthUser && firebaseAuthUser.uid) {
          console.log('Re-initializing user with Firebase Auth UID:', firebaseAuthUser.uid);
          const reinitializedUser = await initializeUserInFirestore(firebaseAuthUser);
          setUser(reinitializedUser);
          currentUser = reinitializedUser;
        } else {
          throw new Error('Cannot get Firebase Auth user. Please sign in again.');
        }
      } catch (error) {
        console.error('Failed to re-initialize user:', error);
        throw new Error('User ID is required to create a plan. Please sign in again.');
      }
    }
    
    // Ensure we're using the user with a valid ID
    if (!currentUser.id || currentUser.id.trim() === '') {
      throw new Error('User ID is still missing after re-initialization. Please sign in again.');
    }
    
    // Update user profile first, but preserve the user ID
    const updatedUser = { 
      ...currentUser, 
      ...userProfile,
      id: currentUser.id // Ensure ID is never overwritten
    };
    const savedUser = await saveUserToFirestore(updatedUser);
    
    // Create new plan
    const newMember: Member = {
      id: savedUser.id,
      name: savedUser.name,
      skill: savedUser.skill,
      pass: savedUser.pass,
      budget: savedUser.budget,
      status: 'Ready',
      role: 'owner'
    };

    const newPlan = await createPlanInFirestore({
      ownerId: savedUser.id,
      metadata,
      members: [newMember],
      recommendations: [],
      status: 'planning'
    });

    // Update user with plan ID
    const finalUser = {
      ...savedUser,
      planId: newPlan.id,
      joinedPlans: savedUser.joinedPlans.includes(newPlan.id) 
        ? savedUser.joinedPlans 
        : [...savedUser.joinedPlans, newPlan.id]
    };
    await saveUserToFirestore(finalUser);
    
    setUser(finalUser);
    // Mark that we just created this plan to skip auto-save
    justCreatedPlanRef.current = newPlan.id;
    // Set planData immediately so it's available when navigating to /plan
    setPlanData(newPlan);
  };

  const joinPlan = async (id: string) => {
    if (!user) {
      console.error('Cannot join plan: user is null');
      throw new Error('User is not signed in. Please sign in again.');
    }
    
    // Validate user has an ID - if missing, try to re-initialize
    let currentUser = user;
    if (!user.id || user.id.trim() === '') {
      console.warn('User ID is missing in joinPlan, attempting to re-initialize from Firebase Auth', { user });
      try {
        const firebaseAuthUser = getCurrentUser();
        if (firebaseAuthUser && firebaseAuthUser.uid) {
          console.log('Re-initializing user with Firebase Auth UID:', firebaseAuthUser.uid);
          const reinitializedUser = await initializeUserInFirestore(firebaseAuthUser);
          setUser(reinitializedUser);
          currentUser = reinitializedUser;
        } else {
          throw new Error('Cannot get Firebase Auth user. Please sign in again.');
        }
      } catch (error) {
        console.error('Failed to re-initialize user:', error);
        throw new Error('User ID is required to join a plan. Please sign in again.');
      }
    }
    
    // Ensure we're using the user with a valid ID
    if (!currentUser.id || currentUser.id.trim() === '') {
      throw new Error('User ID is still missing after re-initialization. Please sign in again.');
    }
    
    const plan = await getPlanFromFirestore(id);
    if (!plan) {
      alert('Plan not found!');
      return;
    }

    // Add user to plan members if not already there
    const isMember = plan.members.some(m => m.id === currentUser.id);
    if (!isMember) {
      const newMember: Member = {
        id: currentUser.id,
        name: currentUser.name,
        skill: currentUser.skill,
        pass: currentUser.pass,
        budget: currentUser.budget,
        status: 'Ready',
        role: 'participant'
      };
      plan.members.push(newMember);
      await savePlanToFirestore(plan);
    }

    // Update user state - preserve the ID
    const joined = currentUser.joinedPlans.includes(id) ? currentUser.joinedPlans : [...currentUser.joinedPlans, id];
    const updatedUser = { 
      ...currentUser, 
      planId: id, 
      joinedPlans: joined,
      id: currentUser.id // Explicitly preserve ID
    };
    await saveUserToFirestore(updatedUser);
    
    setUser(updatedUser);
    setPlanData(plan);
  };

  const leavePlan = async () => {
    if (!planData || !user?.planId) return;

    // Remove from members
    const updatedMembers = planData.members.filter(m => m.id !== user.id);
    const updatedPlan = { ...planData, members: updatedMembers };
    await savePlanToFirestore(updatedPlan);

    // Update user
    const updatedUser = { ...user, planId: null };
    await saveUserToFirestore(updatedUser);
    
    setUser(updatedUser);
    setPlanData(null);
  };

  const deletePlan = async () => {
    if (!planData) return;
    
    // Delete plan from Firestore
    try {
      const { deletePlanFromFirestore } = await import('@/lib/firebase/user');
      await deletePlanFromFirestore(planData.id);
    } catch (error) {
      console.error('Error deleting plan from Firestore:', error);
      throw error;
    }
    
    // Update user: remove planId and remove from joinedPlans
    if (user) {
      const updatedUser = { 
        ...user, 
        planId: null,
        joinedPlans: user.joinedPlans.filter(id => id !== planData.id)
      };
      await saveUserToFirestore(updatedUser);
      setUser(updatedUser);
    }
    setPlanData(null);
  };

  const kickMember = async (memberId: string) => {
    if (!planData) return;
    
    const updatedMembers = planData.members.filter(m => m.id !== memberId);
    const updatedPlan = { ...planData, members: updatedMembers };
    await savePlanToFirestore(updatedPlan);
    setPlanData(updatedPlan);
  };

  const promoteMember = async (memberId: string) => {
    if (!planData) return;
    
    const updatedMembers = planData.members.map(m => 
      m.id === memberId ? { ...m, role: 'owner' as const } : m
    );
    const updatedPlan = { ...planData, members: updatedMembers };
    await savePlanToFirestore(updatedPlan);
    setPlanData(updatedPlan);
  };

  const isOwner = planData?.ownerId === user?.id || planData?.members.find(m => m.id === user?.id)?.role === 'owner';

  return (
    <AppContext.Provider value={{ 
      user, 
      planData, 
      loading,
      setUser, 
      setPlanData, 
      updateUser, 
      createPlan, 
      joinPlan, 
      leavePlan,
      deletePlan,
      kickMember,
      promoteMember,
      isOwner: !!isOwner
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
