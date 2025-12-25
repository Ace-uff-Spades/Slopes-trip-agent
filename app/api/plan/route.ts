import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/server-storage';
import { savePlanToFirestore, getPlanFromFirestore, deletePlanFromFirestore } from '@/lib/firebase/user';
import { PlanState } from '@/lib/types';

// GET /api/plan?planId=xxx - Get a specific plan
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const planId = searchParams.get('planId');
    const userId = searchParams.get('userId');

    if (planId) {
      const plan = await serverStorage.getPlan(planId);
      if (!plan) {
        return NextResponse.json(
          { error: 'Plan not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(plan);
    }

    if (userId) {
      const plans = await serverStorage.getPlansByUser(userId);
      return NextResponse.json(plans);
    }

    return NextResponse.json(
      { error: 'planId or userId required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}

// POST /api/plan - Create a new plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planData: Omit<PlanState, 'id'> = body;

    const plan = await serverStorage.createPlan(planData);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json(
      { error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}

// PUT /api/plan - Update an existing plan
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, ...updates } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'planId required' },
        { status: 400 }
      );
    }

    // Try Firestore first (primary storage)
    try {
      const existingPlan = await getPlanFromFirestore(planId);
      if (existingPlan) {
        // Merge updates with existing plan - handle nested metadata properly
        const updatedPlan: PlanState = {
          ...existingPlan,
          ...updates,
          id: planId, // Ensure ID is preserved
          // If metadata is being updated, merge it properly
          metadata: updates.metadata ? {
            ...existingPlan.metadata,
            ...updates.metadata
          } : existingPlan.metadata
        };
        
        // Save to Firestore
        await savePlanToFirestore(updatedPlan);
        
        // Also update server storage for backward compatibility
        try {
          await serverStorage.updatePlan(planId, updates);
        } catch (serverError) {
          console.warn('Failed to update server storage (non-critical):', serverError);
        }
        
        return NextResponse.json(updatedPlan);
      }
    } catch (firestoreError) {
      console.error('Error updating plan in Firestore:', firestoreError);
      // Fall back to server storage if Firestore fails
    }

    // Fallback to server storage if Firestore doesn't have the plan
    const updated = await serverStorage.updatePlan(planId, updates);
    if (!updated) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update plan';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/plan?planId=xxx - Delete a plan
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { error: 'planId required' },
        { status: 400 }
      );
    }

    // Try Firestore first (primary storage)
    try {
      // Check if plan exists in Firestore
      const existingPlan = await getPlanFromFirestore(planId);
      if (existingPlan) {
        // Delete from Firestore
        await deletePlanFromFirestore(planId);
        
        // Also delete from server storage for backward compatibility
        try {
          await serverStorage.deletePlan(planId);
        } catch (serverError) {
          console.warn('Failed to delete from server storage (non-critical):', serverError);
        }
        
        return NextResponse.json({ success: true });
      }
    } catch (firestoreError) {
      console.error('Error deleting plan from Firestore:', firestoreError);
      // Fall back to server storage if Firestore fails
    }

    // Fallback to server storage if Firestore doesn't have the plan
    const deleted = await serverStorage.deletePlan(planId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete plan';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

