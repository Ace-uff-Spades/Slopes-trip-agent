import { NextRequest, NextResponse } from 'next/server';
import { runAccommodationWorkflow } from '@/agents/accommodation-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      resortName,
      resortAddress,
      resortCoordinates,
      tripDates,
      groupSize,
      memberBudgets
    } = body;

    // Validate required fields
    if (!resortName || !resortAddress || !tripDates || !groupSize) {
      return NextResponse.json(
        { error: 'Missing required fields: resortName, resortAddress, tripDates, groupSize' },
        { status: 400 }
      );
    }

    if (!tripDates.startDate || !tripDates.endDate || !tripDates.checkIn || !tripDates.checkOut) {
      return NextResponse.json(
        { error: 'tripDates must include startDate, endDate, checkIn, and checkOut' },
        { status: 400 }
      );
    }

    // Run the accommodation workflow
    const result = await runAccommodationWorkflow({
      resortName,
      resortAddress,
      resortCoordinates,
      tripDates: {
        startDate: tripDates.startDate,
        endDate: tripDates.endDate,
        checkIn: tripDates.checkIn,
        checkOut: tripDates.checkOut
      },
      groupSize,
      memberBudgets: memberBudgets || []
    });

    // Return just the accommodation options
    return NextResponse.json({
      options: result.output_parsed.options
    });
  } catch (error) {
    console.error('Error running accommodation agent:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to run accommodation agent',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

