import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserState, PlanState, Member, PlanMetadata } from '../lib/types';
import { INITIAL_USER_STATE } from '../lib/constants';
import { StorageService } from '../services/storage.ts';

interface AppContextType {
  user: UserState;
  planData: PlanState | null;
  setUser: React.Dispatch<React.SetStateAction<UserState>>;
  setPlanData: React.Dispatch<React.SetStateAction<PlanState | null>>;
  updateUser: (field: keyof UserState, value: any) => void;
  createPlan: (metadata: PlanMetadata, userProfile: Partial<UserState>) => void;
  joinPlan: (id: string) => void;
  leavePlan: () => void;
  deletePlan: () => void;
  kickMember: (memberId: string) => void;
  promoteMember: (memberId: string) => void;
  isOwner: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Initialize user from storage or default
  const [user, setUser] = useState<UserState>(() => StorageService.getUser());
  const [planData, setPlanData] = useState<PlanState | null>(null);

  // Persist user changes
  useEffect(() => {
    StorageService.saveUser(user);
  }, [user]);

  // Load plan if user has one active
  useEffect(() => {
    if (user.planId) {
      const plan = StorageService.getPlan(user.planId);
      if (plan) {
        setPlanData(plan);
      } else {
        // Plan might have been deleted
        setUser(prev => ({ ...prev, planId: null }));
        setPlanData(null);
      }
    } else {
      setPlanData(null);
    }
  }, [user.planId]);

  // Persist plan changes
  useEffect(() => {
    if (planData) {
      StorageService.savePlan(planData);
    }
  }, [planData]);

  const updateUser = (field: keyof UserState, value: any) => {
    setUser((prev) => ({ ...prev, [field]: value }));
  };

  const createPlan = (metadata: PlanMetadata, userProfile: Partial<UserState>) => {
    const newPlanId = `PLAN-${Math.floor(Math.random() * 10000)}`;
    
    // Update user profile first
    const updatedUser = { ...user, ...userProfile, planId: newPlanId };
    if (!updatedUser.joinedPlans.includes(newPlanId)) {
      updatedUser.joinedPlans.push(newPlanId);
    }
    setUser(updatedUser);

    // Create new plan
    const newMember: Member = {
      id: updatedUser.id,
      name: updatedUser.name,
      skill: updatedUser.skill,
      pass: updatedUser.pass,
      budget: updatedUser.budget,
      status: 'Ready',
      role: 'owner'
    };

    const newPlan: PlanState = {
      id: newPlanId,
      ownerId: updatedUser.id,
      metadata,
      members: [newMember],
      recommendations: [],
      status: 'planning'
    };

    setPlanData(newPlan);
    StorageService.savePlan(newPlan);
  };

  const joinPlan = (id: string) => {
    const plan = StorageService.getPlan(id);
    if (!plan) {
      alert('Plan not found!');
      return;
    }

    // Add user to plan members if not already there
    const isMember = plan.members.some(m => m.id === user.id);
    if (!isMember) {
      const newMember: Member = {
        id: user.id,
        name: user.name,
        skill: user.skill,
        pass: user.pass,
        budget: user.budget,
        status: 'Ready',
        role: 'participant'
      };
      plan.members.push(newMember);
      StorageService.savePlan(plan);
    }

    // Update user state
    setUser(prev => {
      const joined = prev.joinedPlans.includes(id) ? prev.joinedPlans : [...prev.joinedPlans, id];
      return { ...prev, planId: id, joinedPlans: joined };
    });
    setPlanData(plan);
  };

  const leavePlan = () => {
    if (!planData || !user.planId) return;

    // Remove from members
    const updatedMembers = planData.members.filter(m => m.id !== user.id);
    const updatedPlan = { ...planData, members: updatedMembers };
    StorageService.savePlan(updatedPlan);

    // Update user
    setUser(prev => ({ ...prev, planId: null }));
    setPlanData(null);
  };

  const deletePlan = () => {
    if (!planData) return;
    StorageService.deletePlan(planData.id);
    setUser(prev => ({ ...prev, planId: null }));
    setPlanData(null);
  };

  const kickMember = (memberId: string) => {
    if (!planData) return;
    const updatedMembers = planData.members.filter(m => m.id !== memberId);
    setPlanData(prev => prev ? ({ ...prev, members: updatedMembers }) : null);
  };

  const promoteMember = (memberId: string) => {
    if (!planData) return;
    const updatedMembers = planData.members.map(m => 
      m.id === memberId ? { ...m, role: 'owner' as const } : m
    );
    setPlanData(prev => prev ? ({ ...prev, members: updatedMembers }) : null);
  };

  const isOwner = planData?.ownerId === user.id || planData?.members.find(m => m.id === user.id)?.role === 'owner';

  return (
    <AppContext.Provider value={{ 
      user, 
      planData, 
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
