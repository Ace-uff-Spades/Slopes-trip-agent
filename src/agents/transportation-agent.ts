import { webSearchTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";

// Tool definitions
const webSearchPreview = webSearchTool({
  filters: {
    allowedDomains: [
      "maps.google.com",
      "www.google.com",
      "www.expedia.com",
      "www.kayak.com",
      "www.skyscanner.com",
      "www.rome2rio.com"
    ]
  },
  searchContextSize: "high",
  userLocation: {
    type: "approximate"
  }
});

const TransportationOptionSchema = z.object({
  id: z.string(),
  type: z.enum(['individual', 'group']),
  method: z.string(), // e.g., "Drive", "Fly", "Bus"
  description: z.string(),
  cost: z.object({
    total: z.number(),
    perPerson: z.number()
  }),
  duration: z.string(), // e.g., "5 hours", "2 hours 30 minutes"
  meetingPoint: z.string().nullable(), // For group travel
  route: z.string().nullable(), // Route description
  members: z.array(z.string()) // Member IDs using this option
});

const TransportationAgentSchema = z.object({
  options: z.array(TransportationOptionSchema).length(3) // Exactly 3 options
});

const transportationAgent = new Agent({
  name: "Transportation-Agent",
  instructions: `<role>
You're an expert travel logistics planner specializing in group transportation coordination for ski trips. You understand how to optimize travel routes, coordinate group meetups, and find the most efficient and cost-effective transportation options.
</role>
<context>
You will receive:
- Member home addresses (with coordinates if available)
- Destination resort address and coordinates
- Trip dates
- Group size and member preferences

Your goal is to create 3 transportation options that balance:
1. Individual routes from each member's home to the resort
2. Group coordination opportunities (e.g., carpooling, meeting at airports)
3. Efficiency improvements (e.g., if two people live close, they can carpool to the airport)
4. Cost-effectiveness
5. Travel time
</context>
<instructions>
Generate exactly 3 transportation options. Each option should:
- Specify if it's "individual" (each person travels separately) or "group" (coordinated group travel)
- Include the transportation method (Drive, Fly, Bus, Train, etc.)
- Provide a clear description of the travel plan
- Calculate total cost and cost per person
- Estimate duration
- If group travel, specify meeting points (e.g., "Meet at Denver International Airport at 8:00 AM")
- List which member IDs are using this option
- Prioritize efficiency: if members live close, suggest carpooling or meeting at a central location

Use web search to find current transportation costs, routes, and options. Consider:
- Gas prices for driving
- Flight prices and availability
- Bus/train schedules and prices
- Parking at airports/resorts
- Rental car costs if needed

Format your response as a structured JSON object with exactly 3 options.
</instructions>`,
  model: "gpt-5-nano",
  tools: [webSearchPreview],
  outputType: TransportationAgentSchema,
  modelSettings: {
    reasoning: {
      effort: "low"
    },
    store: true
  }
});

type TransportationWorkflowInput = {
  memberAddresses: Array<{
    memberId: string;
    memberName: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  }>;
  resortAddress: string;
  resortCoordinates?: { lat: number; lng: number };
  tripDates: {
    startDate: string;
    endDate: string;
  };
  groupSize: number;
};

export const runTransportationWorkflow = async (workflow: TransportationWorkflowInput) => {
  return await withTrace("Transportation-Agent", async () => {
    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Plan transportation for a ski trip with the following details:

Member Addresses:
${workflow.memberAddresses.map(m => `- ${m.memberName} (ID: ${m.memberId}): ${m.address}${m.coordinates ? ` (${m.coordinates.lat}, ${m.coordinates.lng})` : ''}`).join('\n')}

Destination Resort: ${workflow.resortAddress}${workflow.resortCoordinates ? ` (${workflow.resortCoordinates.lat}, ${workflow.resortCoordinates.lng})` : ''}

Trip Dates: ${workflow.tripDates.startDate} to ${workflow.tripDates.endDate}
Group Size: ${workflow.groupSize} people

Generate 3 transportation options that balance individual and group travel, prioritizing efficiency and cost-effectiveness.`
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
        workflow_id: "transportation_workflow"
      }
    });

    const result = await runner.run(transportationAgent, conversationHistory);

    if (!result.finalOutput) {
      throw new Error("Transportation agent result is undefined");
    }

    return {
      output_text: JSON.stringify(result.finalOutput),
      output_parsed: result.finalOutput
    };
  });
};

