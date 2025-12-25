import { NextRequest, NextResponse } from 'next/server';
import { runTripPlannerWorkflow } from '@/agents/trip-planner-agent';
import { GeneratedSchedule } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      planId,
      winningResort,
      tripDates,
      members,
      generatedBy
    } = body;

    // Validate required fields
    if (!planId || !winningResort || !tripDates || !members || !generatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, winningResort, tripDates, members, generatedBy' },
        { status: 400 }
      );
    }

    if (!winningResort.name || !winningResort.location) {
      return NextResponse.json(
        { error: 'Winning resort must have name and location' },
        { status: 400 }
      );
    }

    if (members.length === 0) {
      return NextResponse.json(
        { error: 'At least one member is required' },
        { status: 400 }
      );
    }

    // Run the trip planner workflow
    const schedule: GeneratedSchedule = await runTripPlannerWorkflow({
      planId,
      winningResort: {
        name: winningResort.name,
        location: winningResort.location,
        fullAddress: winningResort.fullAddress || winningResort.location,
        coordinates: winningResort.coordinates
      },
      tripDates: {
        startDate: tripDates.startDate,
        endDate: tripDates.endDate,
        duration: tripDates.duration || 1
      },
      members: members.map((m: any) => ({
        memberId: m.memberId || m.id,
        memberName: m.memberName || m.name,
        address: m.address || '',
        coordinates: m.coordinates,
        skillLevel: m.skillLevel || m.skill || 'Intermediate',
        budget: m.budget
      })),
      generatedBy
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error generating schedule:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate schedule',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

