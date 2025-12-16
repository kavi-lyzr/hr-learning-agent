/**
 * User Profile API
 * GET - Fetch current user's profile
 * PUT/PATCH - Update user profile (name, avatar)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import { uploadImageToS3Server, getSignedImageUrl, isS3Url } from '@/lib/s3-utils';

/**
 * GET /api/user/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const userId = request.headers.get('x-user-id');
    const email = request.nextUrl.searchParams.get('email');

    let user;
    if (userId) {
      user = await User.findOne({ lyzrId: userId }).select('lyzrId email name avatarUrl');
    } else if (email) {
      user = await User.findOne({ email }).select('lyzrId email name avatarUrl');
    } else {
      return NextResponse.json({ error: 'User identification required' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Sign the avatar URL if it's an S3 URL
    let signedAvatarUrl = user.avatarUrl;
    if (user.avatarUrl && isS3Url(user.avatarUrl)) {
      try {
        signedAvatarUrl = await getSignedImageUrl(user.avatarUrl);
      } catch (error) {
        console.error('Error signing avatar URL:', error);
        // Fall back to original URL
      }
    }

    return NextResponse.json({
      user: {
        id: user.lyzrId,
        email: user.email,
        name: user.name,
        avatarUrl: signedAvatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * Update user profile (name, avatar)
 */
export async function PUT(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { name, userId, email, avatarBase64 } = body;

    // Find user by email or userId (from Lyzr)
    let user;
    if (userId) {
      user = await User.findOne({ lyzrId: userId });
    } else if (email) {
      user = await User.findOne({ email });
    } else {
      return NextResponse.json(
        { error: 'User identification required' },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update name if provided
    if (name !== undefined && name.trim()) {
      user.name = name.trim();
    }

    // Upload and update avatar if provided
    if (avatarBase64) {
      try {
        const avatarUrl = await uploadImageToS3Server(
          avatarBase64,
          `avatars/${user.lyzrId}-${Date.now()}.jpg`
        );
        user.avatarUrl = avatarUrl;
      } catch (uploadError: any) {
        console.error('Error uploading avatar:', uploadError);
        return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
      }
    }

    await user.save();

    // Sign the avatar URL if it's an S3 URL
    let signedAvatarUrl = user.avatarUrl;
    if (user.avatarUrl && isS3Url(user.avatarUrl)) {
      try {
        signedAvatarUrl = await getSignedImageUrl(user.avatarUrl);
      } catch (error) {
        console.error('Error signing avatar URL:', error);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: signedAvatarUrl,
        lyzrId: user.lyzrId,
      },
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Alias for PUT - Update user profile
 */
export async function PATCH(request: NextRequest) {
  return PUT(request);
}
