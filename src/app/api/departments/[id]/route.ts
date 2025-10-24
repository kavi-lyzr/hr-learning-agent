import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Department from '@/models/department';
import OrganizationMember from '@/models/organizationMember';
import mongoose from 'mongoose';

/**
 * GET /api/departments/[id]
 * Get a single department
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    const department = await Department.findById(id)
      .populate('defaultCourseIds', 'title category status')
      .lean();

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Get member count
    const memberCount = await OrganizationMember.countDocuments({
      departmentId: id,
      status: { $in: ['active', 'invited'] }
    });

    return NextResponse.json({
      department: {
        ...department,
        memberCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching department:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/departments/[id]
 * Update a department
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, defaultCourseIds, autoEnroll } = body;

    // Build update object
    const updateData: any = {};
    
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return NextResponse.json(
          { error: 'Department name must be at least 2 characters' },
          { status: 400 }
        );
      }
      if (trimmedName.length > 100) {
        return NextResponse.json(
          { error: 'Department name must be less than 100 characters' },
          { status: 400 }
        );
      }

      // Check for duplicate name (case-insensitive)
      const department = await Department.findById(id);
      if (!department) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }

      const existingDept = await Department.findOne({
        organizationId: department.organizationId,
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingDept) {
        return NextResponse.json(
          { error: `Department "${trimmedName}" already exists` },
          { status: 409 }
        );
      }

      updateData.name = trimmedName;
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (defaultCourseIds !== undefined) {
      // Validate course IDs
      if (Array.isArray(defaultCourseIds)) {
        for (const courseId of defaultCourseIds) {
          if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return NextResponse.json(
              { error: `Invalid course ID: ${courseId}` },
              { status: 400 }
            );
          }
        }
      }
      updateData.defaultCourseIds = defaultCourseIds;
    }

    if (autoEnroll !== undefined) {
      updateData.autoEnroll = Boolean(autoEnroll);
    }

    const department = await Department.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('defaultCourseIds', 'title category status');

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Get member count
    const memberCount = await OrganizationMember.countDocuments({
      departmentId: id,
      status: { $in: ['active', 'invited'] }
    });

    return NextResponse.json({
      department: {
        ...department.toObject(),
        memberCount,
      },
    });
  } catch (error: any) {
    console.error('Error updating department:', error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Department name already exists' },
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
 * DELETE /api/departments/[id]
 * Delete a department
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    // Check if department has members
    const memberCount = await OrganizationMember.countDocuments({
      departmentId: id,
      status: { $in: ['active', 'invited'] }
    });

    if (memberCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete department with active members',
          details: `This department has ${memberCount} member(s). Please reassign or remove them first.`
        },
        { status: 409 }
      );
    }

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Department deleted successfully',
      departmentId: id,
    });
  } catch (error: any) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

