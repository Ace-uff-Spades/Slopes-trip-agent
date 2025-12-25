import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/server-storage';
import { UserState } from '@/lib/types';
import { INITIAL_USER_STATE } from '@/lib/constants';
import { randomUUID } from 'crypto';

// GET /api/user - Get user by session/userId
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const sessionId = request.cookies.get('sessionId')?.value;

    if (!userId && !sessionId) {
      // Create a new user if no session exists
      const newUser: UserState = {
        ...INITIAL_USER_STATE,
        id: randomUUID(),
      };
      const saved = await serverStorage.saveUser(newUser);
      const response = NextResponse.json(saved);
      // Set session cookie
      response.cookies.set('sessionId', saved.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
      return response;
    }

    const user = userId
      ? await serverStorage.getUser(userId)
      : await serverStorage.getUserBySession(sessionId || '');

    if (!user) {
      // Create new user if not found
      const newUser: UserState = {
        ...INITIAL_USER_STATE,
        id: userId || randomUUID(),
      };
      const saved = await serverStorage.saveUser(newUser);
      const response = NextResponse.json(saved);
      // Set session cookie if not exists
      if (!sessionId) {
        response.cookies.set('sessionId', saved.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
      }
      return response;
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// POST /api/user - Create or update user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user: UserState = body;

    const saved = await serverStorage.saveUser(user);

    const response = NextResponse.json(saved);
    // Set session cookie if not exists
    if (!request.cookies.get('sessionId')) {
      response.cookies.set('sessionId', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return response;
  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json(
      { error: 'Failed to save user' },
      { status: 500 }
    );
  }
}

// PUT /api/user - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const user: UserState = body;

    const saved = await serverStorage.saveUser(user);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

