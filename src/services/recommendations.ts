import { PlanState, UserState, Recommendation, DestinationType } from '@/lib/types';

// Mock Database of Resorts
const RESORTS_DB: Omit<Recommendation, 'votes' | 'skillMatch' | 'passSavings'>[] = [
  // West Coast
  { id: 101, resort: 'Mammoth Mountain', location: 'California, USA', region: 'California', price: '$$$' },
  { id: 102, resort: 'Palisades Tahoe', location: 'California, USA', region: 'California', price: '$$$' },
  { id: 103, resort: 'Big Bear', location: 'California, USA', region: 'California', price: '$' },
  
  // Rockies
  { id: 201, resort: 'Breckenridge', location: 'Colorado, USA', region: 'Colorado', price: '$$' },
  { id: 202, resort: 'Vail', location: 'Colorado, USA', region: 'Colorado', price: '$$$$' },
  { id: 203, resort: 'Park City', location: 'Utah, USA', region: 'Utah', price: '$$$' },
  { id: 204, resort: 'Jackson Hole', location: 'Wyoming, USA', region: 'Wyoming', price: '$$$$' },

  // East Coast
  { id: 301, resort: 'Killington', location: 'Vermont, USA', region: 'New England', price: '$$' },
  { id: 302, resort: 'Stowe', location: 'Vermont, USA', region: 'New England', price: '$$$' },
  { id: 303, resort: 'Whiteface', location: 'New York, USA', region: 'New York', price: '$' },

  // International
  { id: 401, resort: 'Whistler Blackcomb', location: 'BC, Canada', region: 'Canada', price: '$$$' },
  { id: 402, resort: 'Niseko United', location: 'Hokkaido, Japan', region: 'Japan', price: '$$' },
  { id: 403, resort: 'Chamonix', location: 'France', region: 'Europe', price: '$$' },
  { id: 404, resort: 'Zermatt', location: 'Switzerland', region: 'Europe', price: '$$$$' },
];

export const generateRecommendations = (plan: PlanState, userRegion: string): Recommendation[] => {
  const { destinationType } = plan.metadata;
  
  // Work with any number of members (including just 1)
  const memberCount = plan.members.length || 1;
  
  // 1. Filter by Destination Type
  let candidates = RESORTS_DB.filter(resort => {
    if (destinationType === 'All') return true;
    
    if (destinationType === 'Local') {
      // Simple region matching for "Local"
      return resort.region === userRegion;
    }
    
    if (destinationType === 'Domestic') {
      return resort.location.includes('USA');
    }
    
    if (destinationType === 'International') {
      return !resort.location.includes('USA');
    }
    
    return true;
  });

  // Fallback if no local matches found
  if (candidates.length === 0) {
    candidates = RESORTS_DB; 
  }

  // 2. Mock Scoring (Randomized for variety + simple budget logic)
  // In a real app, we'd average member budgets and skills
  const scored = candidates.map(resort => {
    const isExpensive = resort.price === '$$$$';
    const isCheap = resort.price === '$';
    
    // Mock logic: Assign random skill match
    const skills = ['Excellent (Balanced)', 'Good (Intermediate Focus)', 'Fair (Beginner Heavy)', 'Challenging (Expert Only)'];
    const skillMatch = skills[Math.floor(Math.random() * skills.length)];
    
    // Mock logic: Pass savings (adjust based on member count)
    const passSavingsOptions = memberCount === 1 
      ? ['Epic: 1/1 member free', 'Ikon: 1/1 member free', 'No Pass Savings']
      : [`Epic: ${Math.floor(Math.random() * memberCount) + 1}/${memberCount} members free`, 
         `Ikon: ${Math.floor(Math.random() * memberCount) + 1}/${memberCount} members free`, 
         'No Pass Savings', 
         `Epic: All ${memberCount} members free`];
    const passSavings = passSavingsOptions[Math.floor(Math.random() * passSavingsOptions.length)];

    return {
      ...resort,
      skillMatch,
      passSavings,
      votes: 0,
      votedBy: [],
      score: Math.random() // Shuffle
    };
  });

  // 3. Return top 3
  return scored.sort((a, b) => b.score - a.score).slice(0, 3).map(({ score, ...rest }) => rest);
};
