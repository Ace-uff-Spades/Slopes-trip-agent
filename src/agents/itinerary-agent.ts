import { webSearchTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";

// Tool definitions
const webSearchPreview = webSearchTool({
  filters: {
    allowedDomains: [
      "www.skiresort.info",
      "www.onthesnow.com",
      "www.ski.com",
      "www.snowpak.com",
      "www.zrankings.com",
      "www.tripadvisor.com"
    ]
  },
  searchContextSize: "high",
  userLocation: {
    type: "approximate"
  }
});

const SlopeSchema = z.object({
  name: z.string(),
  difficulty: z.enum(['Green Circle', 'Blue Square', 'Black Diamond', 'Double Black Diamond']),
  conditions: z.string().nullable(),
  length: z.string().nullable(),
  elevation: z.string().nullable()
});

const DayItinerarySchema = z.object({
  day: z.number(),
  date: z.string(),
  morning: z.object({
    meetupTime: z.string(),
    meetupLocation: z.string(),
    groupSlopes: z.array(SlopeSchema),
    description: z.string()
  }),
  afternoon: z.object({
    groupSlopes: z.array(SlopeSchema).nullable(),
    individualSlopes: z.array(z.object({
      memberId: z.string(),
      memberName: z.string(),
      skillLevel: z.string(),
      recommendedSlopes: z.array(SlopeSchema)
    })),
    description: z.string()
  }),
  lunch: z.object({
    time: z.string(),
    location: z.string(),
    description: z.string().nullable()
  }),
  apresSki: z.object({
    time: z.string(),
    location: z.string(),
    description: z.string()
  }).nullable()
});

const SkiMapSchema = z.object({
  imageUrl: z.string().nullable(),
  imageNotFound: z.boolean().nullable(),
  slopes: z.array(SlopeSchema)
});

const ItineraryAgentSchema = z.object({
  itinerary: z.array(DayItinerarySchema),
  skiMap: SkiMapSchema
});

const itineraryAgent = new Agent({
  name: "Itinerary-Agent",
  instructions: `<role>
You're an expert ski trip itinerary planner with deep knowledge of ski resorts, slopes, difficulty levels, and group coordination. You understand how to create day-by-day schedules that balance group activities with individual skill-based recommendations.
</role>
<context>
You will receive:
- Resort name and location
- Trip dates (start and end dates)
- Member information (names, IDs, skill levels)
- Accommodation location (for meetup points)
- Available slopes at the resort (from ski map data)

Your goal is to create a comprehensive day-by-day itinerary that:
1. Includes group slopes that everyone can enjoy together
2. Provides individual slope recommendations based on each member's skill level
3. Coordinates meetup times and locations based on the accommodation
4. Includes lunch breaks and apres-ski activities
5. Pulls a ski map image and creates a text-based list of all slopes
</context>
<instructions>
Generate a complete itinerary for the ski trip. For each day:

MORNING:
- Set a meetup time (e.g., "8:00 AM") and location (based on accommodation address)
- Recommend group slopes that the entire group can ski together (consider the lowest skill level in the group)
- Provide a description of the morning plan

AFTERNOON:
- Optionally include more group slopes if appropriate
- For each member, provide individual slope recommendations based on their skill level as an array of objects with:
  - memberId: The member's ID
  - memberName: The member's name
  - skillLevel: Their skill level (e.g., "Beginner", "Intermediate", "Advanced", "Expert")
  - recommendedSlopes: Array of slopes matching their skill level
    - Beginner (Green Circle): Easy, wide slopes
    - Intermediate (Blue Square): Moderate difficulty slopes
    - Advanced (Black Diamond): Challenging slopes
    - Expert (Double Black Diamond): Most difficult terrain
- Provide a description of the afternoon plan

LUNCH:
- Set a lunch time (typically 12:00 PM - 1:00 PM)
- Suggest a location (on-mountain restaurant or base lodge)
- Optional description

APRES-SKI:
- Set a time (typically 3:00 PM - 5:00 PM)
- Suggest a location (bar, restaurant, or gathering spot)
- Provide a description

SKI MAP:
- Use web search to find a static image URL of the resort's ski map
- If you cannot find a map image, set imageNotFound to true (DO NOT provide a wrong map)
- Create a comprehensive text-based list of all slopes at the resort, including:
  - Slope name
  - Difficulty level (Green Circle, Blue Square, Black Diamond, Double Black Diamond)
  - Current conditions if available
  - Length and elevation if available

PRIORITIZE:
- Group slopes that allow the group to ski together
- Individual recommendations that match each member's skill level
- Realistic timing and coordination
- Variety in slope difficulty for each skill level

Use web search to:
- Find the resort's ski map image
- Get current slope conditions
- Find on-mountain restaurants and apres-ski spots
- Verify slope names and difficulty levels

Format your response as a structured JSON object with the itinerary array and skiMap object.
</instructions>`,
  model: "gpt-5-nano",
  tools: [webSearchPreview],
  outputType: ItineraryAgentSchema,
  modelSettings: {
    reasoning: {
      effort: "low"
    },
    store: true
  }
});

type ItineraryWorkflowInput = {
  resortName: string;
  resortAddress: string;
  resortCoordinates?: { lat: number; lng: number };
  tripDates: {
    startDate: string;
    endDate: string;
    duration: number; // Days
  };
  members: Array<{
    memberId: string;
    memberName: string;
    skillLevel: string; // e.g., "Beginner", "Intermediate", "Advanced", "Expert"
  }>;
  accommodationAddress: string; // For meetup locations
};

export const runItineraryWorkflow = async (workflow: ItineraryWorkflowInput) => {
  return await withTrace("Itinerary-Agent", async () => {
    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Create a day-by-day itinerary for a ski trip with the following details:

Resort: ${workflow.resortName}
Location: ${workflow.resortAddress}${workflow.resortCoordinates ? ` (${workflow.resortCoordinates.lat}, ${workflow.resortCoordinates.lng})` : ''}

Trip Dates: ${workflow.tripDates.startDate} to ${workflow.tripDates.endDate} (${workflow.tripDates.duration} days)

Members:
${workflow.members.map(m => `- ${m.memberName} (ID: ${m.memberId}): ${m.skillLevel}`).join('\n')}

Accommodation: ${workflow.accommodationAddress}

Create a comprehensive itinerary that:
1. Includes group slopes for everyone to ski together
2. Provides individual slope recommendations based on each member's skill level
3. Coordinates meetup times/locations based on the accommodation
4. Includes lunch breaks and apres-ski activities
5. Pulls a ski map image and lists all available slopes

Prioritize slopes that the group can do together, while also providing personalized recommendations for each skill level.`
          }
        ]
      }
    ];

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "trip-planner",
        workflow_id: "itinerary_workflow"
      }
    });

    const result = await runner.run(itineraryAgent, conversationHistory);

    if (!result.finalOutput) {
      throw new Error("Itinerary agent result is undefined");
    }

    return {
      output_text: JSON.stringify(result.finalOutput),
      output_parsed: result.finalOutput
    };
  });
};

