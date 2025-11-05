import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrganizationMember from '@/models/organizationMember';
import Department from '@/models/department';
import Enrollment from '@/models/enrollment';
import mongoose from 'mongoose';

/**
 * GET /api/organizations/[id]/members
 * Get all members for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id: organizationId } = await params;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    const members = await OrganizationMember.find({ organizationId })
      .populate('userId', 'name email avatarUrl lyzrId')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Get enrollment counts for each member
    const membersWithStats = await Promise.all(
      members.map(async (member: any) => {
        // Calculate enrollments for any member with a userId (both employees and admins)
        if (member.userId) {
          // member.userId is populated, so we need to use the _id
          const userMongoId = member.userId._id;
          console.log('🔍 Fetching enrollments for user:', userMongoId, 'role:', member.role);

          const enrollments = await Enrollment.find({
            userId: userMongoId,
            organizationId
          }).lean();

          console.log('📊 Found enrollments:', enrollments.length, 'for user:', member.userId.email);

          const completed = enrollments.filter(e => e.status === 'completed').length;
          const inProgress = enrollments.filter(e => e.status === 'in-progress').length;
          const avgProgress = enrollments.length > 0
            ? enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / enrollments.length
            : 0;

          return {
            ...member,
            coursesEnrolled: enrollments.length,
            coursesCompleted: completed,
            coursesInProgress: inProgress,
            avgProgress: Math.round(avgProgress),
          };
        }

        // For invited members without userId yet
        return {
          ...member,
          coursesEnrolled: 0,
          coursesCompleted: 0,
          coursesInProgress: 0,
          avgProgress: 0,
        };
      })
    );

    return NextResponse.json({ members: membersWithStats });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/[id]/members
 * Add a new member to organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id: organizationId } = await params;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, name, role, departmentId, courseIds } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if member already exists
    const existingMember = await OrganizationMember.findOne({
      organizationId,
      email: email.toLowerCase()
    });

    if (existingMember) {
      // If adding as admin and member already exists with different role, update their role
      if (role === 'admin' && existingMember.role !== 'admin') {
        existingMember.role = 'admin';
        await existingMember.save();

        return NextResponse.json({
          member: existingMember,
          message: `${email} role updated to admin`
        });
      }

      return NextResponse.json(
        { error: `${email} is already a member of this organization` },
        { status: 409 }
      );
    }

    // Validate department if provided
    let department = null;
    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return NextResponse.json(
          { error: 'Invalid department ID' },
          { status: 400 }
        );
      }

      department = await Department.findOne({
        _id: departmentId,
        organizationId
      });

      if (!department) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }
    }

    // Create member
    const member = new OrganizationMember({
      organizationId,
      email: email.toLowerCase(),
      name: name?.trim() || '',
      role: role || 'employee',
      status: 'invited',
      departmentId: departmentId || undefined,
      invitedAt: new Date(),
    });

    await member.save();

    // Determine which courses to enroll
    let coursesToEnroll: string[] = [];
    
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      // Use provided course IDs
      coursesToEnroll = courseIds;
    } else if (department && department.autoEnroll && department.defaultCourseIds.length > 0) {
      // Use department default courses if auto-enroll is enabled
      coursesToEnroll = department.defaultCourseIds.map((id: any) => id.toString());
    }

    // Create enrollments for the courses
    if (coursesToEnroll.length > 0 && member.role === 'employee') {
      // Note: We'll create enrollments when the user actually joins/signs up
      // For now, we'll just store the intent
    }

    // Populate department info
    await member.populate('departmentId', 'name');

    return NextResponse.json({
      member: {
        ...member.toObject(),
        coursesEnrolled: 0,
        coursesCompleted: 0,
        avgProgress: 0,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding member:', error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Member already exists in this organization' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
