import { PlanState, UserState } from '@/lib/types';
import { INITIAL_USER_STATE } from '@/lib/constants';

// Client-side storage service that uses API calls instead of localStorage
export const StorageService = {
  async saveUser(user: UserState): Promise<UserState> {
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error('Failed to save user');
    return response.json();
  },

  async getUser(userId?: string): Promise<UserState> {
    const url = userId ? `/api/user?userId=${userId}` : '/api/user';
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get user');
    return response.json();
  },

  async savePlan(plan: PlanState): Promise<PlanState> {
    const { id, ...planWithoutId } = plan;
    const response = await fetch('/api/plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: id, ...planWithoutId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save plan:', errorText);
      throw new Error(`Failed to save plan: ${errorText}`);
    }
    return response.json();
  },

  async getPlan(id: string): Promise<PlanState | null> {
    const response = await fetch(`/api/plan?planId=${id}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to get plan');
    return response.json();
  },

  async getAllPlans(userId?: string): Promise<PlanState[]> {
    const url = userId ? `/api/plan?userId=${userId}` : '/api/plan';
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get plans');
    return response.json();
  },

  async deletePlan(id: string): Promise<boolean> {
    const response = await fetch(`/api/plan?planId=${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete plan');
    return true;
  },

  async createPlan(plan: Omit<PlanState, 'id'>): Promise<PlanState> {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    if (!response.ok) throw new Error('Failed to create plan');
    return response.json();
  },
};
