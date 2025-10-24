import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Course from '@/models/course';
import mongoose from 'mongoose';

/**
 * GET /api/courses/[id]
 * Get a single course with all modules and lessons
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
        { error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const course = await Course.findById(id)
      .populate('createdBy', 'name email')
      .lean();

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ course });
  } catch (error: any) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/courses/[id]
 * Update a course (including modules and lessons)
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
        { error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, category, status, modules, thumbnailUrl } = body;

    // Helper function to clean temp IDs from objects
    const cleanTempIds = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => cleanTempIds(item));
      }
      if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        for (const key in obj) {
          if (key === '_id' && typeof obj[key] === 'string' && obj[key].startsWith('temp-')) {
            // Skip temp IDs - let MongoDB generate new ones
            continue;
          }
          if (key === 'createdAt' || key === 'updatedAt') {
            // Skip timestamp fields - let MongoDB handle them
            continue;
          }
          cleaned[key] = cleanTempIds(obj[key]);
        }
        return cleaned;
      }
      return obj;
    };

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (modules !== undefined) {
      // Clean temp IDs from modules and lessons
      updateData.modules = cleanTempIds(modules);
      // Recalculate total duration
      const totalDuration = modules.reduce((courseSum: number, module: any) => {
        const moduleDuration = module.lessons?.reduce((modSum: number, lesson: any) =>
          modSum + (lesson.duration || 0), 0) || 0;
        return courseSum + moduleDuration;
      }, 0);
      updateData.estimatedDuration = totalDuration;
    }

    const course = await Course.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ course });
  } catch (error: any) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/[id]
 * Delete a course
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
        { error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // TODO: Also delete related enrollments and progress records

    return NextResponse.json({
      message: 'Course deleted successfully',
      courseId: id,
    });
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
