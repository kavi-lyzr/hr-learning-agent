import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LessonProgress from '@/models/lessonProgress';
import Enrollment from '@/models/enrollment';
import User from '@/models/user';
import Course from '@/models/course';
import mongoose from 'mongoose';

/**
 * GET /api/lesson-progress?userId=xxx&lessonId=xxx
 * Get progress for a specific lesson
 */
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Lyzr ID
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Find user by lyzrId
    const user = await User.findOne({ lyzrId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build query
    const query: any = { userId: user._id };
    if (lessonId) query.lessonId = lessonId;
    if (courseId) query.courseId = courseId;

    const progress = await LessonProgress.find(query).lean();

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error('Error fetching lesson progress:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lesson-progress
 * Create or update lesson progress
 */
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const {
      userId, // Lyzr ID
      lessonId,
      courseId,
      watchTime,
      scrollDepth,
      timeSpent,
      status,
    } = body;

    // Validate required fields
    if (!userId || !lessonId || !courseId) {
      return NextResponse.json(
        { error: 'userId, lessonId, and courseId are required' },
        { status: 400 }
      );
    }

    // Find user by lyzrId
    const user = await User.findOne({ lyzrId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find or create lesson progress
    let progress = await LessonProgress.findOne({
      userId: user._id,
      lessonId,
    });

    if (!progress) {
      progress = new LessonProgress({
        userId: user._id,
        lessonId,
        courseId,
        status: status || 'in-progress',
        watchTime: watchTime || 0,
        scrollDepth: scrollDepth || 0,
        timeSpent: timeSpent || 0,
        lastAccessedAt: new Date(),
      });
    } else {
      // Update existing progress
      if (watchTime !== undefined) progress.watchTime = Math.max(progress.watchTime || 0, watchTime);
      if (scrollDepth !== undefined) progress.scrollDepth = Math.max(progress.scrollDepth || 0, scrollDepth);
      if (timeSpent !== undefined) progress.timeSpent = (progress.timeSpent || 0) + timeSpent;
      if (status !== undefined) progress.status = status;
      progress.lastAccessedAt = new Date();

      // If marked as completed, set completedAt
      if (status === 'completed' && !progress.completedAt) {
        progress.completedAt = new Date();
      }
    }

    await progress.save();

    // Update enrollment progress
    if (status === 'completed') {
      await updateEnrollmentProgress(user._id as mongoose.Types.ObjectId, courseId, lessonId);
    }

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error('Error saving lesson progress:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update enrollment progress when a lesson is completed
 */
async function updateEnrollmentProgress(
  userId: mongoose.Types.ObjectId,
  courseId: string,
  lessonId: string
) {
  try {
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) return;

    // Add lesson to completed list if not already there
    const lessonObjectId = new mongoose.Types.ObjectId(lessonId);
    if (!enrollment.progress.completedLessonIds.some(id => id.equals(lessonObjectId))) {
      enrollment.progress.completedLessonIds.push(lessonObjectId);
    }

    // Get total lessons in course
    const course = await Course.findById(courseId);
    if (!course) return;

    const totalLessons = course.modules.reduce(
      (sum, module) => sum + (module.lessons?.length || 0),
      0
    );

    // Calculate progress percentage
    const completedCount = enrollment.progress.completedLessonIds.length;
    enrollment.progressPercentage = totalLessons > 0
      ? Math.round((completedCount / totalLessons) * 100)
      : 0;

    // Update status
    if (enrollment.status === 'not-started') {
      enrollment.status = 'in-progress';
      enrollment.startedAt = new Date();
    }

    if (enrollment.progressPercentage === 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    }

    // Set current lesson
    enrollment.progress.currentLessonId = lessonObjectId;

    await enrollment.save();
  } catch (error) {
    console.error('Error updating enrollment progress:', error);
  }
}
