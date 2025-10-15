import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import OrganizationMember from '@/models/organizationMember';
import { encrypt } from '@/lib/encryption';

/**
 * POST /api/auth/callback
 * Handles Lyzr OAuth callback
 * Creates or updates user with their encrypted API key
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

    // Encrypt the API key before storing
    const encryptedApiKey = encrypt(lyzrApiKey);

    // Find or create user
    let user = await User.findOne({ lyzrId: lyzrUser.id });

    if (user) {
      // Update existing user
      user.email = lyzrUser.email;
      user.name = lyzrUser.name || user.name;
      user.avatarUrl = lyzrUser.avatarUrl || user.avatarUrl;
      user.lyzrApiKey = encryptedApiKey; // Always update the API key
      await user.save();
      console.log(`Updated existing user: ${user.email}`);
    } else {
      // Create new user
      user = new User({
        lyzrId: lyzrUser.id,
        email: lyzrUser.email,
        name: lyzrUser.name || lyzrUser.email.split('@')[0],
        avatarUrl: lyzrUser.avatarUrl,
        lyzrApiKey: encryptedApiKey,
        credits: 0,
      });
      await user.save();
      console.log(`Created new user: ${user.email}`);
    }

    // Check if user belongs to any organizations
    const memberships = await OrganizationMember.find({ userId: user._id })
      .populate('organizationId')
      .exec();

    // Return user data with organization info
    return NextResponse.json({
      user: {
        id: user._id,
        lyzrId: user.lyzrId,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        credits: user.credits,
        lastAccessedOrganization: user.lastAccessedOrganization,
      },
      organizations: memberships.map((m: any) => ({
        id: m.organizationId._id,
        name: m.organizationId.name,
        slug: m.organizationId.slug,
        role: m.role,
        status: m.status,
      })),
    });
  } catch (error: any) {
    console.error('Error in Lyzr auth callback:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
