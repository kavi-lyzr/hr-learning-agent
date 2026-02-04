import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrganizationMember from '@/models/organizationMember';
import User from '@/models/user'; // Required so Mongoose can resolve ref: 'User' in populate()
import mongoose from 'mongoose';

/**
 * GET /api/departments/[id]/members
 * Get all members of a specific department
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id: departmentId } = await params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    const members = await OrganizationMember.find({ departmentId })
      .populate('userId', 'name email')
      .lean();

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Error fetching department members:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
