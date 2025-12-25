import { webSearchTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";

// Tool definitions
const webSearchPreview = webSearchTool({
  filters: {
    allowedDomains: [
      "www.airbnb.com",
      "www.vrbo.com",
      "www.booking.com",
      "www.expedia.com",
      "www.tripadvisor.com",
      "www.skiresort.info",
      "www.google.com",
      "maps.google.com"
    ]
  },
  searchContextSize: "high",
  userLocation: {
    type: "approximate"
  }
});

const AccommodationOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  type: z.enum(['airbnb', 'lodge', 'hotel']),
  pricePerPerson: z.number(),
  totalPrice: z.number(),
  availability: z.object({
    available: z.boolean(),
    checkIn: z.string(),
    checkOut: z.string()
  }),
  bookingLink: z.string().nullable(),
  photos: z.array(z.string()).min(0).max(5), // 0-5 photos (make optional in case web search doesn't find them)
  proximityToSlopes: z.string(), // e.g., "0.5 miles", "Walking distance"
  amenities: z.array(z.string()).nullable()
});

const AccommodationAgentSchema = z.object({
  options: z.array(AccommodationOptionSchema).length(3) // Exactly 3 options
});

const accommodationAgent = new Agent({
  name: "Accommodation-Agent",
  instructions: `<role>
You're an expert accommodation finder specializing in ski resort lodging. You know how to find the best Airbnbs, lodges, and resort properties that are close to slopes and suitable for group trips.
</role>
<context>
You will receive:
- Resort name and location
- Trip dates (check-in and check-out)
- Group size (number of people)
- Member budgets (if available)

Your goal is to find 3 accommodation options that are:
1. Primarily Airbnbs or lodges provided by the resort
2. Suitable for the group size (enough beds/rooms)
3. Close to the slopes (prioritize proximity)
4. Available for the selected dates
5. Within budget if specified
</context>
<instructions>
Generate exactly 3 accommodation options. Each option must:
- Be primarily an Airbnb or resort lodge (hotels are acceptable as a third option)
- Include the full name and address
- Specify the type (airbnb, lodge, or hotel)
- Calculate price per person and total price
- Check availability for the given dates
- Provide booking links if available
- Include 3-5 photo URLs if available (CRITICAL: Extract actual, direct image URLs from property listings)
- Specify proximity to slopes (e.g., "0.5 miles", "Walking distance", "0.2 miles from main lift")
- List amenities if available (e.g., "Hot tub", "Fireplace", "Kitchen", "Parking")

Use web search to:
- Find properties on Airbnb, VRBO, resort websites, or general accommodation search sites
- Search for properties near the resort location
- Get pricing information (estimate if exact pricing not available)
- Find property photos: When searching for properties, carefully extract the actual image URLs from the search results. Look for:
  * Direct image URLs ending in .jpg, .jpeg, .png, .webp
  * URLs from cdn domains (e.g., a0.muscache.com for Airbnb, images.vrbo.com for VRBO)
  * Full URLs starting with https:// that point directly to image files
  * DO NOT use placeholder URLs, thumbnail URLs, or base64 encoded images
  * Extract the highest resolution image URLs available
  * If the search results show image URLs in the page content, use those exact URLs
- Check proximity to slopes (estimate if not explicitly stated)

IMPORTANT PHOTO EXTRACTION GUIDELINES:
- Look for image URLs in the web search results that are actual photo URLs (typically ending in .jpg, .jpeg, .png, or .webp)
- Extract complete URLs including the https:// protocol
- Prefer URLs from property listing pages or image CDN services
- Verify the URLs are direct links to images, not pages containing images
- CRITICAL: DO NOT use placeholder URLs. Common placeholder patterns to avoid:
  * URLs containing "placeholder" in the path
  * URLs with generic names like "photo1.jpg", "photo2.jpg", "image1.jpg"
  * URLs with sequential numbers without meaningful identifiers (like /0001/photo1.jpg)
- If you cannot find valid, real photo URLs for a property after thorough searching, include an empty array [] - DO NOT make up fake URLs
- Only use URLs you actually see in the web search results that look like real property photos
- Real Airbnb URLs typically have long, unique identifiers: https://a0.muscache.com/im/pictures/[long-unique-id]...
- Real VRBO URLs have property-specific identifiers in the path, not generic numbers

AVAILABILITY HANDLING:
- Try to verify availability for the given dates if possible through web search
- If you can confirm a property is available, set availability.available = true
- If you cannot verify availability (due to search limitations or domain restrictions), you should still include the property but set availability.available = false
- IMPORTANT: Even if you cannot verify availability, you MUST still return 3 properties. Do not skip properties just because availability cannot be verified.
- The availability check is a best-effort attempt - if web search cannot access booking sites directly, use general property information and mark availability as false
- Focus on finding real, legitimate properties near the resort that match the group size and requirements

Format your response as a structured JSON object with exactly 3 options.
</instructions>`,
  model: "gpt-5-nano",
  tools: [webSearchPreview],
  outputType: AccommodationAgentSchema,
  modelSettings: {
    reasoning: {
      effort: "low"
    },
    store: true
  }
});

type AccommodationWorkflowInput = {
  resortName: string;
  resortAddress: string;
  resortCoordinates?: { lat: number; lng: number };
  tripDates: {
    startDate: string;
    endDate: string;
    checkIn: string;
    checkOut: string;
  };
  groupSize: number;
  memberBudgets?: string[]; // Array of budget strings from members
};

export const runAccommodationWorkflow = async (workflow: AccommodationWorkflowInput) => {
  return await withTrace("Accommodation-Agent", async () => {
    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Find accommodation for a ski trip with the following details:

Resort: ${workflow.resortName}
Location: ${workflow.resortAddress}${workflow.resortCoordinates ? ` (${workflow.resortCoordinates.lat}, ${workflow.resortCoordinates.lng})` : ''}

Trip Dates: ${workflow.tripDates.startDate} to ${workflow.tripDates.endDate}
Check-in: ${workflow.tripDates.checkIn}
Check-out: ${workflow.tripDates.checkOut}

Group Size: ${workflow.groupSize} people
${workflow.memberBudgets ? `Member Budgets: ${workflow.memberBudgets.join(', ')}` : ''}

Find 3 accommodation options (primarily Airbnbs or resort lodges) that are:
- Suitable for ${workflow.groupSize} people
- Close to the slopes (prioritize proximity)
- Available for the specified dates
- Within budget if possible

Include real booking links, photos, and verify availability if possible.

IMPORTANT ABOUT AVAILABILITY:
- If web search cannot access booking sites directly (you may see "Unavailable on allowed domains" errors), this is a search tool limitation, NOT an indication that properties are unavailable
- In such cases, you should still return 3 properties with availability.available = false
- Use general web search to find property names, addresses, and information even if booking sites are restricted
- The goal is to provide 3 realistic accommodation options - availability verification is a best-effort feature

For photos: CRITICAL - Only extract actual image URLs that you see in the search results. DO NOT create placeholder URLs or use generic patterns like "photo1.jpg" or "placeholder.jpg". Real photo URLs have:
- Unique identifiers in the path (not sequential numbers like /0001/photo1.jpg)
- No "placeholder" text anywhere in the URL
- Actual property-specific identifiers
- Valid image file extensions (.jpg, .jpeg, .png, .webp)

If you cannot find real photo URLs in the search results, return an empty array [] instead of making up fake URLs.`
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
        workflow_id: "accommodation_workflow"
      }
    });

    // Retry logic: Keep searching until we find 3 available accommodations
    const maxRetries = 3;
    let attempts = 0;
    let validatedOutput: any = null;
    let currentConversationHistory = [...conversationHistory]; // Copy to avoid mutating original

    while (attempts < maxRetries) {
      attempts++;
      console.log(`Accommodation agent attempt ${attempts}/${maxRetries}...`);

      const result = await runner.run(accommodationAgent, currentConversationHistory);

      if (!result.finalOutput) {
        throw new Error("Accommodation agent result is undefined");
      }

      // Validate and filter out placeholder/invalid photo URLs
      const outputWithValidPhotos = {
        ...result.finalOutput,
        options: result.finalOutput.options.map((option: any) => {
          // Filter out placeholder URLs
          const validPhotos = (option.photos || []).filter((photoUrl: string) => {
            if (!photoUrl || typeof photoUrl !== 'string') return false;
            
            // Check for placeholder patterns
            const placeholderPatterns = [
              /placeholder/i,
              /photo\d+\.jpg$/i,
              /photo\d+\.jpeg$/i,
              /photo\d+\.png$/i,
              /image\d+\.jpg$/i,
              /image\d+\.jpeg$/i,
              /image\d+\.png$/i,
              /\/\d{4}\/photo\d+\./i, // Pattern like /0001/photo1.jpg
              /\/placeholder\d+\./i,
            ];
            
            // Check if URL contains placeholder patterns
            const isPlaceholder = placeholderPatterns.some(pattern => pattern.test(photoUrl));
            
            // Check if URL looks like a real image URL (has proper domain and extension)
            const hasValidExtension = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(photoUrl);
            const hasValidDomain = /^https?:\/\/(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[a-zA-Z]{2,}/.test(photoUrl);
            
            // URL is valid if it doesn't match placeholder patterns and has valid structure
            return !isPlaceholder && hasValidExtension && hasValidDomain;
          });
          
          return {
            ...option,
            photos: validPhotos
          };
        })
      };

      // Check availability: Filter to only available accommodations
      const availableOptions = outputWithValidPhotos.options.filter((option: any) => {
        return option.availability && option.availability.available === true;
      });

      // If we have at least 3 available options, we're done
      if (availableOptions.length >= 3) {
        validatedOutput = {
          ...outputWithValidPhotos,
          options: availableOptions.slice(0, 3) // Take first 3 available
        };
        console.log(`Found ${availableOptions.length} available accommodations. Using first 3.`);
        break;
      }

      // If we have 3 options total (even if not all available), accept them
      // This handles cases where availability verification is limited by web search restrictions
      if (outputWithValidPhotos.options.length >= 3) {
        console.log(`Found ${outputWithValidPhotos.options.length} accommodations (${availableOptions.length} confirmed available). Accepting all options since availability verification may be limited.`);
        validatedOutput = {
          ...outputWithValidPhotos,
          options: outputWithValidPhotos.options.slice(0, 3)
        };
        break;
      }

      // If we don't have 3 options yet, and this isn't the last attempt, retry
      if (attempts < maxRetries) {
        console.log(`Only found ${outputWithValidPhotos.options.length} accommodations (${availableOptions.length} available). Retrying search...`);
        // Add the agent's response and a follow-up request to the conversation history
        if (result.newItems && result.newItems.length > 0) {
          currentConversationHistory.push(...result.newItems.map((item: any) => item.rawItem));
        }
        currentConversationHistory.push({
          role: "user",
          content: [{
            type: "input_text",
            text: `The previous search found ${outputWithValidPhotos.options.length} accommodations. Please search again and find 3 DIFFERENT accommodations near ${workflow.resortName}. 

IMPORTANT: 
- If you cannot verify availability through web search (due to domain restrictions), you should still return 3 properties
- Set availability.available = false if you cannot verify, but still include the property
- Focus on finding real, legitimate properties that match the group size (${workflow.groupSize} people) and are near the resort
- Use general web search if booking sites are restricted - you can find property names, addresses, and general information
- The goal is to provide 3 realistic accommodation options, even if exact availability cannot be verified
- You MUST return exactly 3 options, even if availability cannot be confirmed`
          }]
        });
      } else {
        // Last attempt: use what we have, but log a warning
        console.warn(`After ${maxRetries} attempts, found ${outputWithValidPhotos.options.length} accommodations. Using all options returned.`);
        // Use all options, not just available ones, since availability verification may be limited
        validatedOutput = {
          ...outputWithValidPhotos,
          options: outputWithValidPhotos.options.slice(0, 3) // Take first 3 options regardless of availability
        };
      }
    }

    if (!validatedOutput) {
      throw new Error("Failed to generate accommodation options after validation");
    }

    return {
      output_text: JSON.stringify(validatedOutput),
      output_parsed: validatedOutput
    };
  });
};

