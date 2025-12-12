import { PlanState, UserState } from './types';

export const COLORS = {
  bg: '#F8FAFC', // Powder White
  primary: '#0EA5E9', // Alpine Sky Blue
  accent: '#F97316', // Safety Orange
  text: '#1F2937', // Dark Grey/Granite
  success: '#166534', // Pine Forest Green
};

export const MOCK_RECOMMENDATIONS = [
  { id: 1, resort: 'Breckenridge', location: 'Colorado', region: 'Colorado', skillMatch: 'Excellent (Balanced)', price: '$$', passSavings: 'Epic: 3/3 members free', votes: 2 },
  { id: 2, resort: 'Mammoth Mountain', location: 'California', region: 'California', skillMatch: 'Good (Intermediate Focus)', price: '$$$', passSavings: 'Ikon: 1/3 members free', votes: 1 },
  { id: 3, resort: 'Killington', location: 'Vermont', region: 'New England', skillMatch: 'Fair (Beginner Heavy)', price: '$', passSavings: 'Epic: 3/3 members free', votes: 0 },
];

export const INITIAL_USER_STATE: UserState = {
  id: '', // Will be generated
  name: 'Trip Organizer',
  skill: 'Blue Square',
  pass: 'Epic Pass',
  budget: '$$',
  availability: ['Feb 10', 'Feb 11', 'Feb 12'],
  address: 'California',
  joinedPlans: [],
  planId: null,
};

export const INITIAL_PLAN_STATE: PlanState = {
  id: 'ABC-789',
  ownerId: 'u1',
  status: 'planning',
  metadata: {
    tripName: 'Annual Ski Trip',
    destinationType: 'Domestic',
    description: 'High school friends reunion',
    targetSize: 4
  },
  members: [
    { id: 'u1', name: 'You', skill: 'Blue Square', pass: 'Epic Pass', budget: '$$', status: 'Ready', role: 'owner' },
    { id: 'u2', name: 'Alex', skill: 'Green Circle', pass: 'None', budget: '$', status: 'Ready', role: 'participant' },
    { id: 'u3', name: 'Sam', skill: 'Black Diamond', pass: 'Ikon Pass', budget: '$$$', status: 'Ready', role: 'participant' },
  ],
  recommendations: MOCK_RECOMMENDATIONS,
};
