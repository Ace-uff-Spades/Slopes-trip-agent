export interface AgentResults {
  slopesInstructor: {
    output_text: string;
    output_parsed: {
      "Skill Level": string;
      "Improvement Steps": string;
      Equipment: string;
      Notes: string;
    };
  };
  resortInfo: {
    output_text: string;
    output_parsed: {
      Resorts: Array<{
        Name: string;
        Budget: string;
        Location: string;
        "Snow Conditions": string;
        Slopes: Array<{
          Name: string;
          Difficulty: string;
        }>;
      }>;
    };
  };
}

export interface UserState {
  id: string;
  name: string;
  skill: string | null;
  pass: string | null;
  budget: string | null;
  availability: string[]; // Best dates
  impossibleDates: string[]; // Dates that don't work
  address: string; // Region/Address for "Local" logic
  addressCoordinates?: { lat: number; lng: number }; // Coordinates from Google Places
  joinedPlans: string[]; // List of Plan IDs
  planId: string | null; // Current active plan context
  agentResults?: AgentResults | null; // Results from slopes-agent
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
  votedBy?: string[]; // Array of user IDs who voted for this recommendation
  description?: string;
  fullAddress?: string; // Full address for transportation/accommodation planning
  coordinates?: {
    lat: number;
    lng: number;
  };
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
  winningResort?: Recommendation | null; // The resort that was selected
  generatedSchedule?: GeneratedSchedule | null; // The generated schedule
}

// Schedule generation types
export interface TransportationOption {
  id: string;
  type: 'individual' | 'group';
  method: string; // e.g., "Drive", "Fly", "Bus"
  description: string;
  cost: {
    total: number;
    perPerson: number;
  };
  duration: string; // e.g., "5 hours", "2 hours 30 minutes"
  meetingPoint?: string; // For group travel
  route?: string; // Route description
  members: string[]; // Member IDs using this option
}

export interface AccommodationOption {
  id: string;
  name: string;
  address: string;
  type: 'airbnb' | 'lodge' | 'hotel';
  pricePerPerson: number;
  totalPrice: number;
  availability: {
    available: boolean;
    checkIn: string;
    checkOut: string;
  };
  bookingLink?: string;
  photos: string[]; // URLs to 0-5 photos (may be empty if photos not available)
  proximityToSlopes: string; // e.g., "0.5 miles", "Walking distance"
  amenities?: string[];
}

export interface Slope {
  name: string;
  difficulty: 'Green Circle' | 'Blue Square' | 'Black Diamond' | 'Double Black Diamond';
  conditions?: string; // Current conditions
  length?: string; // Trail length
  elevation?: string;
}

export interface DayItinerary {
  day: number; // Day 1, 2, 3, etc.
  date: string; // Formatted date
  morning: {
    meetupTime: string;
    meetupLocation: string;
    groupSlopes: Slope[]; // Slopes the group can do together
    description: string;
  };
  afternoon: {
    groupSlopes?: Slope[]; // Optional group slopes
    individualSlopes: {
      [memberId: string]: {
        memberName: string;
        skillLevel: string;
        recommendedSlopes: Slope[];
      };
    };
    description: string;
  };
  lunch: {
    time: string;
    location: string;
    description?: string;
  };
  apresSki?: {
    time: string;
    location: string;
    description: string;
  };
}

export interface SkiMap {
  imageUrl?: string; // Static image URL
  imageNotFound?: boolean; // True if map couldn't be found
  slopes: Slope[]; // Text-based list of all slopes
}

export interface GeneratedSchedule {
  planId: string;
  winningResort: {
    name: string;
    location: string;
    fullAddress: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  tripDates: {
    startDate: string;
    endDate: string;
    duration: number; // Days
  };
  transportation: TransportationOption[];
  accommodation: AccommodationOption[];
  itinerary: DayItinerary[];
  skiMap: SkiMap;
  generatedAt: string; // ISO timestamp
  generatedBy: string; // User ID who generated it
}
