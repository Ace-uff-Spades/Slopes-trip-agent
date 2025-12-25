import { webSearchTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";


// Tool definitions
const webSearchPreview = webSearchTool({
  filters: {
    allowedDomains: [
      "www.ikonpass.com",
      "www.epicpass.com",
      "reddit.com",
      "www.skiresort.info",
      "www.zrankings.com"
    ]
  },
  searchContextSize: "medium",
  userLocation: {
    type: "approximate"
  }
})
const SlopesInstructorSchema = z.object({ 
  "Skill Level": z.string(), 
  "Improvement Steps": z.string(), 
  Equipment: z.string(), 
  Notes: z.string() 
});

const ResortInfoAgentSchema = z.object({ 
  Resorts: z.array(z.object({ 
    Name: z.string(), 
    Budget: z.string(), 
    Location: z.string(), 
    "Snow Conditions": z.string(), 
    Slopes: z.array(z.object({ 
      Name: z.string(), 
      Difficulty: z.string() 
    })) 
  })) 
});
const slopesInstructor = new Agent({
  name: "Slopes-Instructor",
  instructions: `<role> 
You're an expert snowboarding and ski instructor. You're a world-class snowboarder and skier. You have the most knowledge on ski resorts, terrain, slopes on each mountain, the difficulty of those slopes, and what type of skiers and snowboarders can go on those slopes.
</role> 
<context> 
I'm building an application where users can plan a ski trip from end to end. The goal of the application is to give a user the power to seamlessly and effortlessly plan and execute a ski trip. A big part of that is users understanding their ski level, and deciding what type of resorts they will enjoy the most. 
</context>
<instructions> 
You will take answers to a series of questions that were asked to a person. 

You will then access 
- what skill level they are. 
- What they need to do this season to improve to the next level  
- What type of equipment they need 
- Any other recommendations for their trip

IMPORTANT FORMATTING REQUIREMENTS:
- Format each response as a bulleted list with emojis
- Use relevant emojis for each item (e.g., 🎿 for skiing, 🏔️ for mountains, ⚡ for tips)
- Break down long paragraphs into clear, concise bullet points
- Make it visually engaging and easy to scan 
</instructions>
`,
  model: "gpt-5-nano",
  outputType: SlopesInstructorSchema,
  modelSettings: {
    reasoning: {
      effort: "minimal"
    },
    store: true
  }
});


const resortInfoAgent = new Agent({
  name: "Resort-Info-Agent",
  instructions: `<role>
You're a world-class skiing and snowboarding expert. You know the all details about resorts from around the world, including their snow conditions, types of slopes they have, après-ski options, peak times within that year, and each one's pros and cons. 
</role> 
<context> 
User Data:
 {{input.output_parsed.Skill Level}} 


You will receive their budget, home locations, and skill level. 
</context>
<instructions> 
Take your context and come up with a list of 10 resorts that this user should go to. 
</instructions>`,
  model: "gpt-5-nano",
  tools: [
    webSearchPreview
  ],
  outputType: ResortInfoAgentSchema,
  modelSettings: {
    reasoning: {
      effort: "medium"
    },
    store: true
  }
});

type WorkflowInput = { input_as_text: string };


// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("Slopes-Agent", async () => {
    const state = {

    };
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    // Check if API key is set (Runner will automatically use process.env.OPENAI_API_KEY)
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set. Please set it in your .env.local file.');
    }

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_693c8b8b38188190aaa17e624617ae4e08b485f7b7d49ab1"
      }
    });
    const slopesInstructorResultTemp = await runner.run(
      slopesInstructor,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...slopesInstructorResultTemp.newItems.map((item: any) => item.rawItem));

    if (!slopesInstructorResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const slopesInstructorResult = {
      output_text: JSON.stringify(slopesInstructorResultTemp.finalOutput),
      output_parsed: slopesInstructorResultTemp.finalOutput
    };
    
    const resortInfoAgentResultTemp = await runner.run(
      resortInfoAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...resortInfoAgentResultTemp.newItems.map((item: any) => item.rawItem));

    if (!resortInfoAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const resortInfoAgentResult = {
      output_text: JSON.stringify(resortInfoAgentResultTemp.finalOutput),
      output_parsed: resortInfoAgentResultTemp.finalOutput
    };
    
    return {
      slopesInstructor: slopesInstructorResult,
      resortInfo: resortInfoAgentResult
    };
  });
}
