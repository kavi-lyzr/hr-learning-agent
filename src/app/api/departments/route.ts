import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Department from '@/models/department';
import OrganizationMember from '@/models/organizationMember';
import mongoose from 'mongoose';

/**
 * GET /api/departments?organizationId=xxx
 * Get all departments for an organization
 */
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organizationId' },
        { status: 400 }
      );
    }

    // Fetch departments
    const departments = await Department.find({ organizationId })
      .populate('defaultCourseIds', 'title category status')
      .sort({ createdAt: -1 })
      .lean();

    // Get member counts for each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept: any) => {
        const memberCount = await OrganizationMember.countDocuments({
          organizationId,
          departmentId: dept._id,
          status: { $in: ['active', 'invited'] }
        });

        return {
          ...dept,
          memberCount,
        };
      })
    );

    return NextResponse.json({ departments: departmentsWithCounts });
  } catch (error: any) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/departments
 * Create a new department
 */
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { organizationId, name, description, defaultCourseIds, autoEnroll } = body;

    // Validate required fields
    if (!organizationId || !name) {
      return NextResponse.json(
        { error: 'organizationId and name are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organizationId' },
        { status: 400 }
      );
    }

    // Validate department name length
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Department name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Department name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Check if department name already exists (case-insensitive)
    const existingDept = await Department.findOne({
      organizationId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingDept) {
      return NextResponse.json(
        { error: `Department "${name}" already exists` },
        { status: 409 }
      );
    }

    // Validate course IDs if provided
    if (defaultCourseIds && Array.isArray(defaultCourseIds)) {
      for (const courseId of defaultCourseIds) {
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
          return NextResponse.json(
            { error: `Invalid course ID: ${courseId}` },
            { status: 400 }
          );
        }
      }
    }

    // Create department
    const department = new Department({
      organizationId,
      name: name.trim(),
      description: description?.trim() || '',
      defaultCourseIds: defaultCourseIds || [],
      autoEnroll: autoEnroll !== undefined ? autoEnroll : true,
    });

    await department.save();

    // Populate course details
    await department.populate('defaultCourseIds', 'title category status');

    return NextResponse.json({
      department: {
        ...department.toObject(),
        memberCount: 0,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating department:', error);
    
    // Handle duplicate key error
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

