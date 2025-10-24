import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { createOrUpdateUser } from '@/lib/lyzr-services';

/**
 * POST /api/auth
 * Handles Lyzr OAuth authentication
 * Creates or updates user with their encrypted API key
 * Note: Agents are NOT created here - they're created when an organization is created
 */
export async function POST(request: Request) {
  await dbConnect();

  try {
    const { user: lyzrUser, lyzrApiKey } = await request.json();

    // Validate input
    if (!lyzrUser || !lyzrUser.id || !lyzrUser.email || !lyzrApiKey) {
      return NextResponse.json(
        { error: 'Invalid user data or API key provided' },
        { status: 400 }
      );
    }

    // Create or update user (without agents)
    const user = await createOrUpdateUser(lyzrUser, lyzrApiKey);
    console.log(`Successfully processed auth for user: ${user.email}`);

    // Return simple user data
    return NextResponse.json({
      user: {
        id: user._id,
        lyzrId: user.lyzrId,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        lastAccessedOrganization: user.lastAccessedOrganization,
      },
    });
  } catch (error: any) {
    console.error('Error in Lyzr auth callback:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
