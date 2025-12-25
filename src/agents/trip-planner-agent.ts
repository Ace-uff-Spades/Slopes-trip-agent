import { Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";
import { runTransportationWorkflow } from "./transportation-agent";
import { runAccommodationWorkflow } from "./accommodation-agent";
import { runItineraryWorkflow } from "./itinerary-agent";
import { GeneratedSchedule } from "@/lib/types";

const TripPlannerAgentSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  schedule: z.any() // Will be validated as GeneratedSchedule
});

const tripPlannerAgent = new Agent({
  name: "Trip-Planner-Agent",
  instructions: `<role>
You're a master trip planning orchestrator that coordinates transportation, accommodation, and itinerary planning for ski trips. You ensure all three components work together seamlessly.
</role>
<context>
You will receive comprehensive trip planning data including:
- Member information (names, IDs, addresses, skill levels, budgets)
- Winning resort details (name, address, coordinates)
- Trip dates
- Group size

Your job is to orchestrate three specialized agents:
1. Transportation Agent - Plans door-to-door transportation
2. Accommodation Agent - Finds suitable lodging
3. Itinerary Agent - Creates day-by-day schedules with slope recommendations

You must coordinate these agents and combine their outputs into a complete GeneratedSchedule.
</context>
<instructions>
Orchestrate the three sub-agents in sequence:
1. First, call the Transportation Agent with member addresses and resort location
2. Then, call the Accommodation Agent with resort details and trip dates
3. Finally, call the Itinerary Agent with resort details, members, and accommodation location

Combine all three results into a single GeneratedSchedule object that includes:
- Transportation options (3 options)
- Accommodation options (3 options)
- Day-by-day itinerary
- Ski map with image and slope list

Ensure the itinerary references the accommodation location for meetup points, and that all dates and times are consistent.

Return a structured response indicating success and the complete schedule.
</instructions>`,
  model: "gpt-5-nano",
  outputType: TripPlannerAgentSchema,
  modelSettings: {
    reasoning: {
      effort: "low"
    },
    store: true
  }
});

type TripPlannerWorkflowInput = {
  planId: string;
  winningResort: {
    name: string;
    location: string;
    fullAddress?: string;
    coordinates?: { lat: number; lng: number };
  };
  tripDates: {
    startDate: string;
    endDate: string;
    duration: number;
  };
  members: Array<{
    memberId: string;
    memberName: string;
    address: string;
    coordinates?: { lat: number; lng: number };
    skillLevel: string;
    budget?: string;
  }>;
  generatedBy: string; // User ID
};

export const runTripPlannerWorkflow = async (workflow: TripPlannerWorkflowInput): Promise<GeneratedSchedule> => {
  return await withTrace("Trip-Planner-Agent", async () => {
    try {
      // Step 1: Transportation Agent
      console.log('Running Transportation Agent...');
      const transportationResult = await runTransportationWorkflow({
        memberAddresses: workflow.members.map(m => ({
          memberId: m.memberId,
          memberName: m.memberName,
          address: m.address,
          coordinates: m.coordinates
        })),
        resortAddress: workflow.winningResort.fullAddress || workflow.winningResort.location,
        resortCoordinates: workflow.winningResort.coordinates,
        tripDates: {
          startDate: workflow.tripDates.startDate,
          endDate: workflow.tripDates.endDate
        },
        groupSize: workflow.members.length
      });

      // Step 2: Accommodation Agent
      console.log('Running Accommodation Agent...');
      const accommodationResult = await runAccommodationWorkflow({
        resortName: workflow.winningResort.name,
        resortAddress: workflow.winningResort.fullAddress || workflow.winningResort.location,
        resortCoordinates: workflow.winningResort.coordinates,
        tripDates: {
          startDate: workflow.tripDates.startDate,
          endDate: workflow.tripDates.endDate,
          checkIn: workflow.tripDates.startDate, // Assuming check-in is start date
          checkOut: workflow.tripDates.endDate // Assuming check-out is end date
        },
        groupSize: workflow.members.length,
        memberBudgets: workflow.members.map(m => m.budget).filter(Boolean) as string[]
      });

      // Use the first accommodation option for itinerary meetup locations
      const selectedAccommodation = accommodationResult.output_parsed.options[0];

      // Step 3: Itinerary Agent
      console.log('Running Itinerary Agent...');
      const itineraryResult = await runItineraryWorkflow({
        resortName: workflow.winningResort.name,
        resortAddress: workflow.winningResort.fullAddress || workflow.winningResort.location,
        resortCoordinates: workflow.winningResort.coordinates,
        tripDates: {
          startDate: workflow.tripDates.startDate,
          endDate: workflow.tripDates.endDate,
          duration: workflow.tripDates.duration
        },
        members: workflow.members.map(m => ({
          memberId: m.memberId,
          memberName: m.memberName,
          skillLevel: m.skillLevel
        })),
        accommodationAddress: selectedAccommodation.address
      });

      // Transform individualSlopes from array to record format
      const transformedItinerary = itineraryResult.output_parsed.itinerary.map((day: any) => ({
        ...day,
        afternoon: {
          ...day.afternoon,
          individualSlopes: day.afternoon.individualSlopes.reduce((acc: any, item: any) => {
            acc[item.memberId] = {
              memberName: item.memberName,
              skillLevel: item.skillLevel,
              recommendedSlopes: item.recommendedSlopes
            };
            return acc;
          }, {} as Record<string, any>)
        }
      }));

      // Combine all results into GeneratedSchedule
      const schedule: GeneratedSchedule = {
        planId: workflow.planId,
        winningResort: {
          name: workflow.winningResort.name,
          location: workflow.winningResort.location,
          fullAddress: workflow.winningResort.fullAddress || workflow.winningResort.location,
          coordinates: workflow.winningResort.coordinates
        },
        tripDates: workflow.tripDates,
        transportation: transportationResult.output_parsed.options,
        accommodation: accommodationResult.output_parsed.options,
        itinerary: transformedItinerary,
        skiMap: itineraryResult.output_parsed.skiMap,
        generatedAt: new Date().toISOString(),
        generatedBy: workflow.generatedBy
      };

      return schedule;
    } catch (error) {
      console.error('Error in trip planner workflow:', error);
      throw error;
    }
  });
};

