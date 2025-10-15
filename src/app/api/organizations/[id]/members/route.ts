import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrganizationMember from '@/models/organizationMember';
import User from '@/models/user';
import Enrollment from '@/models/enrollment';
import Department from '@/models/department';

/**
 * GET /api/organizations/[id]/members
 * Get all members of an organization
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;
    const members = await OrganizationMember.find({
      organizationId: id,
    })
      .populate('userId', 'name email avatarUrl')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .exec();

    // Get enrollment counts for each member
    const membersWithProgress = await Promise.all(
      members.map(async (member: any) => {
        const enrollmentCount = member.userId
          ? await Enrollment.countDocuments({ userId: member.userId })
          : 0;

        return {
          id: member._id,
          userId: member.userId?._id,
          email: member.email,
          name: member.name || member.userId?.name,
          avatarUrl: member.userId?.avatarUrl,
          role: member.role,
          status: member.status,
          department: member.departmentId
            ? {
                id: member.departmentId._id,
                name: member.departmentId.name,
              }
            : null,
          enrollmentCount,
          invitedAt: member.invitedAt,
          joinedAt: member.joinedAt,
        };
      })
    );

    return NextResponse.json({ members: membersWithProgress });
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
 * Add a single member to an organization
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;
    const { email, name, role, departmentId, courseIds } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      );
    }

    // Check if member already exists
    const existingMember = await OrganizationMember.findOne({
      organizationId: id,
      email: email.toLowerCase(),
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Member with this email already exists in the organization' },
        { status: 409 }
      );
    }

    // Check if user exists in system
    const user = await User.findOne({ email: email.toLowerCase() });

    // Create member
    const member = new OrganizationMember({
      organizationId: id,
      userId: user?._id,
      email: email.toLowerCase(),
      name,
      role: role || 'employee',
      status: user ? 'active' : 'invited',
      departmentId,
      joinedAt: user ? new Date() : undefined,
    });
    await member.save();

    // If user exists and courses are specified, enroll them
    if (user && courseIds && courseIds.length > 0) {
      for (const courseId of courseIds) {
        const existingEnrollment = await Enrollment.findOne({
          userId: user._id,
          courseId,
        });

        if (!existingEnrollment) {
          const enrollment = new Enrollment({
            userId: user._id,
            courseId,
            organizationId: id,
            status: 'not-started',
            progressPercentage: 0,
            progress: {
              completedLessonIds: [],
            },
          });
          await enrollment.save();
        }
      }
    }

    // If department with auto-enroll is set, enroll in default courses
    if (user && departmentId) {
      const department = await Department.findById(departmentId);
      if (department && department.autoEnroll && department.defaultCourseIds.length > 0) {
        for (const courseId of department.defaultCourseIds) {
          const existingEnrollment = await Enrollment.findOne({
            userId: user._id,
            courseId,
          });

          if (!existingEnrollment) {
            const enrollment = new Enrollment({
              userId: user._id,
              courseId,
              organizationId: id,
              status: 'not-started',
              progressPercentage: 0,
              progress: {
                completedLessonIds: [],
              },
            });
            await enrollment.save();
          }
        }
      }
    }

    return NextResponse.json({
      member: {
        id: member._id,
        email: member.email,
        name: member.name,
        role: member.role,
        status: member.status,
      },
    });
  } catch (error: any) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
