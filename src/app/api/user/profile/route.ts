/**
 * PUT /api/user/profile
 * Update user profile (name)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import { headers } from 'next/headers';

export async function PUT(request: NextRequest) {
  await dbConnect();

  try {
    // Get user ID from auth context (simplified - in production use proper auth)
    // For now, we'll get it from the request body
    const body = await request.json();
    const { name, userId, email } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

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

    // Update name
    user.name = name.trim();
    await user.save();

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
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
