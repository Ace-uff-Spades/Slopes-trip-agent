import { NextRequest, NextResponse } from 'next/server';
import { runTransportationWorkflow } from '@/agents/transportation-agent';
import { runAccommodationWorkflow } from '@/agents/accommodation-agent';
import { runItineraryWorkflow } from '@/agents/itinerary-agent';
import { GeneratedSchedule } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      planId,
      section,
      winningResort,
      tripDates,
      members,
      generatedBy,
      existingSchedule
    } = body;

    // Validate required fields
    if (!planId || !section || !winningResort || !tripDates || !members || !generatedBy || !existingSchedule) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, section, winningResort, tripDates, members, generatedBy, existingSchedule' },
        { status: 400 }
      );
    }

    if (!['transportation', 'accommodation', 'itinerary'].includes(section)) {
      return NextResponse.json(
        { error: 'Invalid section. Must be one of: transportation, accommodation, itinerary' },
        { status: 400 }
      );
    }

    let updatedSchedule: GeneratedSchedule = { ...existingSchedule };

    if (section === 'transportation') {
      // Regenerate transportation
      const transportationResult = await runTransportationWorkflow({
        memberAddresses: members.map((m: any) => ({
          memberId: m.memberId || m.id,
          memberName: m.memberName || m.name,
          address: m.address || '',
          coordinates: m.coordinates
        })),
        resortAddress: winningResort.fullAddress || winningResort.location,
        resortCoordinates: winningResort.coordinates,
        tripDates: {
          startDate: tripDates.startDate,
          endDate: tripDates.endDate
        },
        groupSize: members.length
      });

      updatedSchedule = {
        ...updatedSchedule,
        transportation: transportationResult.output_parsed.options,
        generatedAt: new Date().toISOString(),
        generatedBy
      };
    } else if (section === 'accommodation') {
      // Regenerate accommodation
      const accommodationResult = await runAccommodationWorkflow({
        resortName: winningResort.name,
        resortAddress: winningResort.fullAddress || winningResort.location,
        resortCoordinates: winningResort.coordinates,
        tripDates: {
          startDate: tripDates.startDate,
          endDate: tripDates.endDate,
          checkIn: tripDates.startDate,
          checkOut: tripDates.endDate
        },
        groupSize: members.length,
        memberBudgets: members.map((m: any) => m.budget).filter(Boolean) as string[]
      });

      updatedSchedule = {
        ...updatedSchedule,
        accommodation: accommodationResult.output_parsed.options,
        generatedAt: new Date().toISOString(),
        generatedBy
      };
    } else if (section === 'itinerary') {
      // Regenerate itinerary
      const selectedAccommodation = existingSchedule.accommodation?.[0];
      if (!selectedAccommodation) {
        return NextResponse.json(
          { error: 'Cannot regenerate itinerary without accommodation. Please regenerate accommodation first.' },
          { status: 400 }
        );
      }

      const itineraryResult = await runItineraryWorkflow({
        resortName: winningResort.name,
        resortAddress: winningResort.fullAddress || winningResort.location,
        resortCoordinates: winningResort.coordinates,
        tripDates: {
          startDate: tripDates.startDate,
          endDate: tripDates.endDate,
          duration: tripDates.duration || 1
        },
        members: members.map((m: any) => ({
          memberId: m.memberId || m.id,
          memberName: m.memberName || m.name,
          skillLevel: m.skillLevel || m.skill || 'Intermediate'
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

      updatedSchedule = {
        ...updatedSchedule,
        itinerary: transformedItinerary,
        skiMap: itineraryResult.output_parsed.skiMap,
        generatedAt: new Date().toISOString(),
        generatedBy
      };
    }

    // Return the updated schedule - client will save it with authenticated context
    // Server-side Firestore writes don't have auth context, so we let the client handle it
    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error regenerating schedule section:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to regenerate schedule section',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

