import { serverStorage } from './server-storage';
import { UserState, PlanState } from './types';
import { INITIAL_USER_STATE } from './constants';
import { cookies } from 'next/headers';

// Server-side utilities for data fetching
export async function getServerUser(userId?: string): Promise<UserState | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sessionId')?.value;
    
    if (userId) {
      const user = await serverStorage.getUser(userId);
      if (user) return user;
    }
    
    if (sessionId) {
      const user = await serverStorage.getUserBySession(sessionId);
      if (user) return user;
    }
    
    // Return null if no user found - let client handle creation
    return null;
  } catch (error) {
    console.error('Error fetching server user:', error);
    return null;
  }
}

export async function getServerPlan(planId: string): Promise<PlanState | null> {
  return await serverStorage.getPlan(planId);
}

export async function getServerPlansByUser(userId: string): Promise<PlanState[]> {
  return await serverStorage.getPlansByUser(userId);
}

