import { PlanState, UserState } from '../lib/types';
import { INITIAL_USER_STATE, INITIAL_PLAN_STATE } from '../lib/constants';

const KEYS = {
  USER: 'slopesync_user',
  PLANS: 'slopesync_plans',
};

export const StorageService = {
  saveUser: (user: UserState) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  getUser: (): UserState => {
    const data = localStorage.getItem(KEYS.USER);
    if (data) {
      return JSON.parse(data);
    }
    // Return default with a random ID if new
    return { ...INITIAL_USER_STATE, id: crypto.randomUUID() };
  },

  savePlan: (plan: PlanState) => {
    const plans = StorageService.getAllPlans();
    plans[plan.id] = plan;
    localStorage.setItem(KEYS.PLANS, JSON.stringify(plans));
  },

  getPlan: (id: string): PlanState | null => {
    const plans = StorageService.getAllPlans();
    return plans[id] || null;
  },

  getAllPlans: (): Record<string, PlanState> => {
    const data = localStorage.getItem(KEYS.PLANS);
    return data ? JSON.parse(data) : {};
  },

  deletePlan: (id: string) => {
    const plans = StorageService.getAllPlans();
    delete plans[id];
    localStorage.setItem(KEYS.PLANS, JSON.stringify(plans));
  },
  
  // Helper to initialize mock data if needed
  init: () => {
    if (!localStorage.getItem(KEYS.PLANS)) {
      // Optional: seed with mock plan
    }
  }
};
