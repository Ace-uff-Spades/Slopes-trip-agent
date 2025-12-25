import { PlanState, UserState } from './types';
import { INITIAL_USER_STATE } from './constants';
import { randomUUID } from 'crypto';

// In-memory storage - replace with database calls later
// This acts as a mock database for now
class ServerStorage {
  private users: Map<string, UserState> = new Map();
  private plans: Map<string, PlanState> = new Map();

  // User operations
  async getUser(userId: string): Promise<UserState | null> {
    return this.users.get(userId) || null;
  }

  async getUserBySession(sessionId: string): Promise<UserState | null> {
    // For now, use sessionId as userId
    // In production, you'd look up the session and get the associated userId
    return this.users.get(sessionId) || null;
  }

  async saveUser(user: UserState): Promise<UserState> {
    this.users.set(user.id, user);
    return user;
  }

  async createUser(user: Partial<UserState>): Promise<UserState> {
    const newUser: UserState = {
      ...INITIAL_USER_STATE,
      id: randomUUID(),
      ...user,
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  // Plan operations
  async getPlan(planId: string): Promise<PlanState | null> {
    return this.plans.get(planId) || null;
  }

  async getAllPlans(): Promise<PlanState[]> {
    return Array.from(this.plans.values());
  }

  async getPlansByUser(userId: string): Promise<PlanState[]> {
    return Array.from(this.plans.values()).filter(
      (plan) => plan.members.some((m) => m.id === userId) || plan.ownerId === userId
    );
  }

  async savePlan(plan: PlanState): Promise<PlanState> {
    this.plans.set(plan.id, plan);
    return plan;
  }

  async createPlan(plan: Omit<PlanState, 'id'>): Promise<PlanState> {
    const newPlan: PlanState = {
      ...plan,
      id: `PLAN-${Math.floor(Math.random() * 10000)}`,
    };
    this.plans.set(newPlan.id, newPlan);
    return newPlan;
  }

  async deletePlan(planId: string): Promise<boolean> {
    return this.plans.delete(planId);
  }

  async updatePlan(planId: string, updates: Partial<PlanState>): Promise<PlanState | null> {
    const plan = this.plans.get(planId);
    if (!plan) return null;
    const updated = { ...plan, ...updates };
    this.plans.set(planId, updated);
    return updated;
  }
}

// Singleton instance
export const serverStorage = new ServerStorage();

