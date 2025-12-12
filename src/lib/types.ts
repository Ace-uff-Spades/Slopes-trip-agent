export interface UserState {
  id: string;
  name: string;
  skill: string | null;
  pass: string | null;
  budget: string | null;
  availability: string[];
  address: string; // Region/Address for "Local" logic
  joinedPlans: string[]; // List of Plan IDs
  planId: string | null; // Current active plan context
}

export type MemberRole = 'owner' | 'participant';

export interface Member {
  id: string;
  name: string;
  skill: string | null;
  pass: string | null;
  budget: string | null;
  status: string;
  role: MemberRole;
}

export interface Recommendation {
  id: number;
  resort: string;
  location: string;
  region: string; // e.g., "Colorado", "California", "Europe"
  skillMatch: string;
  price: string;
  passSavings: string;
  votes: number;
  description?: string;
}

export type DestinationType = 'International' | 'Domestic' | 'Local' | 'All';

export interface PlanMetadata {
  tripName: string; // "Description of type" from prompt
  description?: string;
  targetSize?: number;
  notes?: string;
  destinationType: DestinationType;
}

export interface PlanState {
  id: string;
  ownerId: string;
  metadata: PlanMetadata;
  members: Member[];
  recommendations: Recommendation[];
  status: 'planning' | 'voting' | 'decided';
}
