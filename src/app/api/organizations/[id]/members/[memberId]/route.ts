import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrganizationMember from '@/models/organizationMember';
import Department from '@/models/department';
import Enrollment from '@/models/enrollment';
import mongoose from 'mongoose';

/**
 * PUT /api/organizations/[id]/members/[memberId]
 * Update a member
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  await dbConnect();

  try {
    const { id: organizationId, memberId } = await params;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return NextResponse.json(
        { error: 'Invalid member ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, role, departmentId, status, courseIds } = body;

    // Build update object
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (role !== undefined) {
      if (!['admin', 'employee'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be "admin" or "employee"' },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

    if (departmentId !== undefined) {
      // Handle "general" department - it's stored in organization, not departments collection
      if (departmentId === null || departmentId === 'general') {
        updateData.departmentId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(departmentId)) {
          return NextResponse.json(
            { error: 'Invalid department ID' },
            { status: 400 }
          );
        }

        // Verify department exists and belongs to organization
        const department = await Department.findOne({
          _id: departmentId,
          organizationId
        });

        if (!department) {
          return NextResponse.json(
            { error: 'Department not found' },
            { status: 404 }
          );
        }

        updateData.departmentId = departmentId;
      }
    }

    if (status !== undefined) {
      if (!['active', 'invited', 'inactive'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be "active", "invited", or "inactive"' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (courseIds !== undefined && Array.isArray(courseIds)) {
      // Update assigned course IDs
      updateData.assignedCourseIds = courseIds.map((id: string) => new mongoose.Types.ObjectId(id));
    }

    const member = await OrganizationMember.findOneAndUpdate(
      { _id: memberId, organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('departmentId', 'name');

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Get enrollment stats
    let stats = {
      coursesEnrolled: 0,
      coursesCompleted: 0,
      coursesInProgress: 0,
      avgProgress: 0,
    };

    if (member.userId) {
      // For active members with userId, get actual enrollments
      const enrollments = await Enrollment.find({
        userId: member.userId,
        organizationId
      }).lean();

      const completed = enrollments.filter(e => e.status === 'completed').length;
      const inProgress = enrollments.filter(e => e.status === 'in-progress').length;
      const avgProgress = enrollments.length > 0
        ? enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / enrollments.length
        : 0;

      stats = {
        coursesEnrolled: enrollments.length,
        coursesCompleted: completed,
        coursesInProgress: inProgress,
        avgProgress: Math.round(avgProgress),
      };
    } else if (member.role === 'employee') {
      // For invited members, count assigned courses
      let assignedCourseCount = 0;

      // Count directly assigned courses
      if (member.assignedCourseIds && Array.isArray(member.assignedCourseIds)) {
        assignedCourseCount = member.assignedCourseIds.length;
      }

      // Add department default courses if auto-enroll is enabled
      if (member.departmentId) {
        const dept = await Department.findById(member.departmentId).lean();
        if (dept && dept.autoEnroll && dept.defaultCourseIds && Array.isArray(dept.defaultCourseIds)) {
          // Only add department courses that aren't already in assignedCourseIds
          const assignedIds = new Set((member.assignedCourseIds || []).map((id: any) => id.toString()));
          const additionalCourses = dept.defaultCourseIds.filter((id: any) => !assignedIds.has(id.toString()));
          assignedCourseCount += additionalCourses.length;
        }
      }

      stats.coursesEnrolled = assignedCourseCount;
    }

    return NextResponse.json({
      member: {
        ...member.toObject(),
        ...stats,
      },
    });
  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[id]/members/[memberId]
 * Remove a member from organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  await dbConnect();

  try {
    const { id: organizationId, memberId } = await params;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return NextResponse.json(
        { error: 'Invalid member ID' },
        { status: 400 }
      );
    }

    const member = await OrganizationMember.findOneAndDelete({
      _id: memberId,
      organizationId
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Delete associated enrollments if they have a userId
    if (member.userId) {
      await Enrollment.deleteMany({
        userId: member.userId,
        organizationId
      });
    }

    return NextResponse.json({
      message: 'Member removed successfully',
      memberId,
    });
  } catch (error: any) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

