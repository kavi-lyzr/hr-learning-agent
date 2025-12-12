import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Course from '@/models/course';
import Enrollment from '@/models/enrollment';
import mongoose from 'mongoose';
import { getSignedImageUrl, cleanS3Url } from '@/lib/s3-utils';

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

    // Convert thumbnail to presigned URL if it's an S3 URL
    if (course.thumbnailUrl && course.thumbnailUrl.includes('.s3.') && course.thumbnailUrl.includes('.amazonaws.com')) {
      try {
        // Clean the URL first (remove old signatures), then get fresh signed URL
        const cleanUrl = cleanS3Url(course.thumbnailUrl);
        course.thumbnailUrl = await getSignedImageUrl(cleanUrl);
      } catch (error) {
        console.error('Error getting signed URL for thumbnail:', error);
      }
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
    // Clean thumbnail URL before storing (remove any query params/signatures)
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = cleanS3Url(thumbnailUrl);
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

    // If modules were updated, recalculate all enrollments for this course
    if (modules !== undefined) {
      await recalculateEnrollmentProgress(id, course);
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

/**
 * Helper function to recalculate enrollment progress for all users enrolled in a course.
 * This is called when modules/lessons are added or removed from a course.
 */
async function recalculateEnrollmentProgress(courseId: string, course: any) {
  try {
    // Get all lesson IDs from the updated course
    const allLessonIds = new Set<string>();
    course.modules?.forEach((module: any) => {
      module.lessons?.forEach((lesson: any) => {
        if (lesson._id) {
          allLessonIds.add(lesson._id.toString());
        }
      });
    });
    
    const totalLessons = allLessonIds.size;
    console.log(`📊 Course ${courseId} now has ${totalLessons} lessons`);

    // Find all enrollments for this course
    const enrollments = await Enrollment.find({ courseId });
    console.log(`🔄 Recalculating progress for ${enrollments.length} enrollment(s)`);

    for (const enrollment of enrollments) {
      const previousProgress = enrollment.progressPercentage;
      const previousStatus = enrollment.status;
      
      // Filter completed lessons to only include lessons that still exist in the course
      const validCompletedLessonIds = enrollment.progress.completedLessonIds.filter(
        (lessonId: mongoose.Types.ObjectId) => allLessonIds.has(lessonId.toString())
      );
      
      // Update completedLessonIds to only include valid lessons
      enrollment.progress.completedLessonIds = validCompletedLessonIds;
      
      // Recalculate progress percentage
      const completedCount = validCompletedLessonIds.length;
      enrollment.progressPercentage = totalLessons > 0
        ? Math.round((completedCount / totalLessons) * 100)
        : 0;

      // Update status based on new progress
      if (enrollment.progressPercentage === 0 && completedCount === 0) {
        // If no lessons completed and was previously completed, reset to not-started
        if (enrollment.status === 'completed') {
          enrollment.status = 'not-started';
          enrollment.completedAt = undefined;
        }
      } else if (enrollment.progressPercentage < 100 && enrollment.status === 'completed') {
        // If progress dropped below 100%, change back to in-progress
        enrollment.status = 'in-progress';
        enrollment.completedAt = undefined;
      } else if (enrollment.progressPercentage === 100 && enrollment.status !== 'completed') {
        // If now at 100%, mark as completed
        enrollment.status = 'completed';
        enrollment.completedAt = new Date();
      }

      await enrollment.save();
      
      if (previousProgress !== enrollment.progressPercentage || previousStatus !== enrollment.status) {
        console.log(
          `   📈 User ${enrollment.userId}: ${previousProgress}% (${previousStatus}) → ${enrollment.progressPercentage}% (${enrollment.status})`
        );
      }
    }

    console.log(`✅ Progress recalculation complete`);
  } catch (error) {
    console.error('Error recalculating enrollment progress:', error);
    // Don't throw - this is a non-critical operation
  }
}
