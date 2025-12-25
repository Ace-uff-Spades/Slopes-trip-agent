import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations } from '@/services/recommendations';
import { serverStorage } from '@/lib/server-storage';

// POST /api/recommendations - Generate recommendations for a plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, userRegion, planData } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'planId required' },
        { status: 400 }
      );
    }

    // Try to get plan from server storage (for API routes, we use serverStorage as fallback)
    // In production, you should use Firebase Admin SDK here
    let plan = await serverStorage.getPlan(planId);
    
    // If plan not found in server storage, use planData from request (fallback)
    if (!plan && planData) {
      console.log('Plan not found in server storage, using planData from request');
      plan = planData;
    }
    
    if (!plan) {
      console.error('Plan not found:', planId);
      return NextResponse.json(
        { error: `Plan not found. Plan ID: ${planId}. Please refresh the page and try again.` },
        { status: 404 }
      );
    }

    // Ensure plan has members
    if (!plan.members || plan.members.length === 0) {
      return NextResponse.json(
        { error: 'Plan must have at least one member' },
        { status: 400 }
      );
    }

    const recommendations = generateRecommendations(plan, userRegion || '');
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: `Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

