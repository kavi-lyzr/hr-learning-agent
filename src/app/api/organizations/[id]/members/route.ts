import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrganizationMember from '@/models/organizationMember';
import Department from '@/models/department';
import Enrollment from '@/models/enrollment';
import Course from '@/models/course';
import Organization from '@/models/organization';
import mongoose from 'mongoose';
import { getSignedImageUrl, isS3Url } from '@/lib/s3-utils';
import { sendWelcomeEmail } from '@/lib/email-service';

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

    // Get enrollment counts for each member and sign avatar URLs
    const membersWithStats = await Promise.all(
      members.map(async (member: any) => {
        // Sign avatar URL if present
        let signedAvatarUrl = member.userId?.avatarUrl;
        if (signedAvatarUrl && isS3Url(signedAvatarUrl)) {
          try {
            signedAvatarUrl = await getSignedImageUrl(signedAvatarUrl);
          } catch (error) {
            console.error('Error signing avatar URL:', error);
          }
        }

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
            userId: {
              ...member.userId,
              avatarUrl: signedAvatarUrl,
            },
            coursesEnrolled: enrollments.length,
            coursesCompleted: completed,
            coursesInProgress: inProgress,
            avgProgress: Math.round(avgProgress),
          };
        }

        // For invited members without userId yet, calculate assigned courses
        let assignedCourseCount = 0;

        // Count directly assigned courses
        if (member.assignedCourseIds && Array.isArray(member.assignedCourseIds)) {
          assignedCourseCount = member.assignedCourseIds.length;
        }

        // Add department default courses if auto-enroll is enabled
        if (member.departmentId && member.role === 'employee') {
          const dept = await Department.findById(member.departmentId).lean();
          if (dept && dept.autoEnroll && dept.defaultCourseIds && Array.isArray(dept.defaultCourseIds)) {
            // Only add department courses that aren't already in assignedCourseIds
            const assignedIds = new Set((member.assignedCourseIds || []).map((id: any) => id.toString()));
            const additionalCourses = dept.defaultCourseIds.filter((id: any) => !assignedIds.has(id.toString()));
            assignedCourseCount += additionalCourses.length;
          }
        }

        return {
          ...member,
          coursesEnrolled: assignedCourseCount,
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
    let finalDepartmentId = null;

    if (departmentId) {
      // Handle "general" department - it's stored in organization, not departments collection
      if (departmentId === 'general') {
        finalDepartmentId = null; // General department is represented as null
      } else {
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

        finalDepartmentId = departmentId;
      }
    }

    // Determine which courses to assign
    let coursesToAssign: string[] = [];

    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      // Use provided course IDs
      coursesToAssign = courseIds;
    } else if (department && department.autoEnroll && department.defaultCourseIds.length > 0) {
      // Use department default courses if auto-enroll is enabled
      coursesToAssign = department.defaultCourseIds.map((id: any) => id.toString());
    }

    // Add general department courses if auto-enroll is enabled
    const organization = await Organization.findById(organizationId);
    if (organization?.generalDepartment?.autoEnroll && organization.generalDepartment.courseIds.length > 0) {
      const generalCourseIds = organization.generalDepartment.courseIds.map((id: any) => id.toString());
      // Add general courses that aren't already in the list
      const existingIds = new Set(coursesToAssign);
      for (const courseId of generalCourseIds) {
        if (!existingIds.has(courseId)) {
          coursesToAssign.push(courseId);
        }
      }
      console.log(`📚 Added ${generalCourseIds.length} general department course(s) to new employee`);
    }

    // Create member with assigned courses
    const member = new OrganizationMember({
      organizationId,
      email: email.toLowerCase(),
      name: name?.trim() || '',
      role: role || 'employee',
      status: 'invited',
      departmentId: finalDepartmentId || undefined,
      assignedCourseIds: coursesToAssign.map(id => new mongoose.Types.ObjectId(id)),
      invitedAt: new Date(),
    });

    await member.save();

    // Populate department info
    await member.populate('departmentId', 'name');

    // Send welcome email to all new employees (regardless of course assignment)
    if (member.role === 'employee') {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const loginLink = `${baseUrl}/employee/dashboard`;

        // Fetch course details for email (if any courses assigned)
        let validCourses: Array<{
          title: string;
          description?: string;
          link: string;
        }> = [];

        if (coursesToAssign.length > 0) {
          const courseDetails = await Promise.all(
            coursesToAssign.map(async (courseId) => {
              const course = await Course.findById(courseId);
              if (!course) return null;
              return {
                title: course.title,
                description: course.description,
                link: `${baseUrl}/employee/courses/${courseId}`,
              };
            })
          );

          validCourses = courseDetails.filter(c => c !== null) as Array<{
            title: string;
            description?: string;
            link: string;
          }>;
        }

        await sendWelcomeEmail(
          member.email,
          member.name || member.email.split('@')[0],
          organization?.name || 'the organization',
          (member.departmentId as any)?.name,
          validCourses,
          loginLink
        );

        console.log(`📧 Welcome email sent to ${member.email}${validCourses.length > 0 ? ` with ${validCourses.length} course(s)` : ' (no courses assigned)'}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError instanceof Error ? emailError.message : 'Unknown error');
        // Don't fail the member creation if email fails
      }
    }

    return NextResponse.json({
      member: {
        ...member.toObject(),
        coursesEnrolled: coursesToAssign.length,
        coursesCompleted: 0,
        coursesInProgress: 0,
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

/**
 * DELETE /api/organizations/[id]/members
 * Remove a member from an organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id: organizationId } = await params;
    const body = await request.json();
    const { email, memberId } = body;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    let member;

    if (memberId) {
      // Find by member ID
      if (!mongoose.Types.ObjectId.isValid(memberId)) {
        return NextResponse.json(
          { error: 'Invalid member ID' },
          { status: 400 }
        );
      }
      member = await OrganizationMember.findOne({
        _id: memberId,
        organizationId
      });
    } else if (email) {
      // Find by email
      member = await OrganizationMember.findOne({
        email: email.toLowerCase(),
        organizationId
      });
    } else {
      return NextResponse.json(
        { error: 'Either email or memberId is required' },
        { status: 400 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found in this organization' },
        { status: 404 }
      );
    }

    // Delete the member
    await OrganizationMember.deleteOne({ _id: member._id });

    // Optionally: Delete related enrollments if you want
    // await Enrollment.deleteMany({ userId: member.userId, organizationId });

    return NextResponse.json({
      success: true,
      message: `Member ${member.email} removed from organization`
    });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
