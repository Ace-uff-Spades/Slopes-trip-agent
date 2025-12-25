import { NextRequest, NextResponse } from 'next/server';
import { runWorkflow } from '@/agents/slopes-agent';

// POST /api/agents/slopes - Run the slopes-agent with user preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json(
        { error: 'preferences required' },
        { status: 400 }
      );
    }

    // Convert preferences to JSON string format for the agent
    const inputText = JSON.stringify(preferences, null, 2);

    // Run the agent workflow
    const result = await runWorkflow({
      input_as_text: inputText
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running slopes-agent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run slopes-agent', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

