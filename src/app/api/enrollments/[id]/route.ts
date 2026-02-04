import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/enrollment';
import LessonProgress from '@/models/lessonProgress';
import Course from '@/models/course';
import mongoose from 'mongoose';

/**
 * GET /api/enrollments/[id]
 * Get enrollment with detailed progress
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
        { error: 'Invalid enrollment ID' },
        { status: 400 }
      );
    }

    const enrollment = await Enrollment.findById(id)
      .populate({
        path: 'courseId',
        populate: {
          path: 'createdBy',
          select: 'name email',
        },
      })
      .lean();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Get lesson progress for this enrollment
    const lessonProgress = await LessonProgress.find({
      userId: enrollment.userId,
      courseId: enrollment.courseId,
    }).lean();

    return NextResponse.json({
      enrollment: {
        ...enrollment,
        lessonProgress,
      },
    });
  } catch (error: any) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/enrollments/[id]
 * Update enrollment progress
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
        { error: 'Invalid enrollment ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, currentLessonId, completedLessonIds } = body;

    // Build update object
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (currentLessonId !== undefined) updateData['progress.currentLessonId'] = currentLessonId;
    if (completedLessonIds !== undefined) {
      updateData['progress.completedLessonIds'] = completedLessonIds;
    }

    // If status changed to in-progress and no startedAt, set it
    if (status === 'in-progress') {
      const enrollment = await Enrollment.findById(id);
      if (enrollment && !enrollment.startedAt) {
        updateData.startedAt = new Date();
      }
    }

    // If status changed to completed, set completedAt
    if (status === 'completed') {
      updateData.completedAt = new Date();
      updateData.progressPercentage = 100;
    }

    // Calculate progress percentage based on completed lessons
    if (completedLessonIds) {
      const enrollment = await Enrollment.findById(id).populate('courseId');
      if (enrollment && (enrollment.courseId as any).modules) {
        const totalLessons = (enrollment.courseId as any).modules.reduce(
          (sum: number, module: any) => sum + (module.lessons?.length || 0),
          0
        );
        if (totalLessons > 0) {
          updateData.progressPercentage = Math.round(
            (completedLessonIds.length / totalLessons) * 100
          );
        }
      }
    }

    const enrollment = await Enrollment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('courseId')
      .lean();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ enrollment });
  } catch (error: any) {
    console.error('Error updating enrollment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/enrollments/[id]/recalculate
 * Recalculate enrollment progress from LessonProgress data
 * This is useful to fix inconsistencies where LessonProgress shows completed
 * but Enrollment.completedLessonIds is out of sync
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid enrollment ID' },
        { status: 400 }
      );
    }

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Get all completed LessonProgress entries for this user+course
    const completedLessonProgress = await LessonProgress.find({
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      status: 'completed',
    }).lean();

    console.log(`🔄 Recalculating progress for enrollment ${id}`);
    console.log(`   Found ${completedLessonProgress.length} completed LessonProgress entries`);

    // Get the course to calculate total lessons
    const course = await Course.findById(enrollment.courseId);
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Get all lessons in order
    const sortedModules = [...(course.modules || [])].sort((a, b) => a.order - b.order);
    const allCourseLessons = sortedModules.flatMap((mod) =>
      [...(mod.lessons || [])].sort((a, b) => a.order - b.order)
    );
    const totalLessons = allCourseLessons.length;

    // Build new completedLessonIds from LessonProgress data
    const newCompletedLessonIds = completedLessonProgress.map(
      (lp) => new mongoose.Types.ObjectId(lp.lessonId)
    );

    const oldCompletedCount = enrollment.progress.completedLessonIds.length;
    const oldPercentage = enrollment.progressPercentage;

    // Update enrollment
    enrollment.progress.completedLessonIds = newCompletedLessonIds;
    enrollment.progressPercentage = totalLessons > 0
      ? Math.round((newCompletedLessonIds.length / totalLessons) * 100)
      : 0;

    // Find next uncompleted lesson
    const nextUncompletedLesson = allCourseLessons.find((l) =>
      l._id && !newCompletedLessonIds.some((id) => id.equals(l._id!))
    );
    enrollment.progress.currentLessonId = nextUncompletedLesson?._id;

    // Update status based on progress
    if (enrollment.progressPercentage === 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      console.log(`   🎉 Course marked as completed!`);
    } else if (enrollment.progressPercentage > 0 && enrollment.status === 'not-started') {
      enrollment.status = 'in-progress';
      enrollment.startedAt = enrollment.startedAt || new Date();
    }

    await enrollment.save();

    console.log(`   📊 Progress updated: ${oldCompletedCount}/${totalLessons} (${oldPercentage}%) → ${newCompletedLessonIds.length}/${totalLessons} (${enrollment.progressPercentage}%)`);

    return NextResponse.json({
      success: true,
      enrollment: {
        _id: enrollment._id,
        status: enrollment.status,
        progressPercentage: enrollment.progressPercentage,
        completedLessons: newCompletedLessonIds.length,
        totalLessons,
        currentLessonId: enrollment.progress.currentLessonId,
      },
      changes: {
        completedLessonsBefore: oldCompletedCount,
        completedLessonsAfter: newCompletedLessonIds.length,
        percentageBefore: oldPercentage,
        percentageAfter: enrollment.progressPercentage,
      },
    });
  } catch (error: any) {
    console.error('Error recalculating enrollment progress:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/enrollments/[id]
 * Delete an enrollment and associated progress
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
        { error: 'Invalid enrollment ID' },
        { status: 400 }
      );
    }

    const enrollment = await Enrollment.findById(id);

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Delete associated lesson progress
    await LessonProgress.deleteMany({
      userId: enrollment.userId,
      courseId: enrollment.courseId,
    });

    // Delete the enrollment
    await Enrollment.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting enrollment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
