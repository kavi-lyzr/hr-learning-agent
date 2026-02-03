import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LessonProgress from '@/models/lessonProgress';
import Enrollment from '@/models/enrollment';
import User from '@/models/user';
import Course, { ICourse, ILesson } from '@/models/course';
import mongoose from 'mongoose';
import { storeAnalyticsEvent } from '@/lib/analytics-storage';
import QuizAttempt from '@/models/quizAttempt';
import type { ILessonProgress } from '@/models/lessonProgress';

/**
 * Find an embedded lesson by id within a course (modules[].lessons).
 * Returns the lesson object or null if not found.
 */
function findLessonInCourse(course: ICourse | null, lessonId: string): ILesson | null {
  if (!course?.modules) return null;
  const lessonOid = new mongoose.Types.ObjectId(lessonId);
  for (const mod of course.modules) {
    const lesson = (mod.lessons || []).find(
      (l: ILesson) => l._id != null && lessonOid.equals(l._id)
    );
    if (lesson) return lesson;
  }
  return null;
}

/**
 * Determines if a lesson should be marked as completed based on its type and progress data.
 *
 * @param lesson The lesson (embedded in course).
 * @param progress The lesson progress document.
 * @returns true if the lesson is considered completed.
 */
async function isLessonActuallyCompleted(
  lesson: ILesson,
  progress: ILessonProgress
): Promise<boolean> {
  switch (lesson.contentType) {
    case 'video':
      // duration is in minutes; watchTime is in seconds. Mark complete when watched 90%.
      const videoDurationSec = (lesson.duration || 0) * 60 || 1;
      return (progress.watchTime || 0) / videoDurationSec >= 0.9;
    case 'article':
      // Mark complete when scrolled 80% and spent 50% of estimated time (duration in minutes → seconds).
      const minTimeSec = (lesson.duration || 0) * 60 * 0.5 || 0;
      return (progress.scrollDepth || 0) >= 80 && (progress.timeSpent || 0) >= minTimeSec;
    case 'video-article':
      // For video+article: complete when either video is 90% watched OR article is 80% scrolled
      // This allows users to complete via their preferred medium
      const videoArticleDurationSec = (lesson.duration || 0) * 60 || 1;
      const videoComplete = (progress.watchTime || 0) / videoArticleDurationSec >= 0.9;
      const articleMinTimeSec = (lesson.duration || 0) * 60 * 0.5 || 0;
      const articleComplete = (progress.scrollDepth || 0) >= 80 && (progress.timeSpent || 0) >= articleMinTimeSec;
      return videoComplete || articleComplete;
    case 'assessment':
      // Check for a passed quiz attempt for this assessment lesson
      const latestQuizAttempt = await QuizAttempt.findOne({
        userId: progress.userId,
        lessonId: progress.lessonId,
        passed: true, // Only consider passed attempts
      }).sort({ completedAt: -1 }); // Get the latest attempt

      return !!latestQuizAttempt; // True if a passed attempt exists
    default:
      console.warn(`Unknown content type ${lesson.contentType} for lesson ${lesson._id}. Cannot determine completion.`);
      return false;
  }
}

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
      // The status sent from the client. We'll re-evaluate this.
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

    // Lessons are embedded in Course; find the lesson by courseId + lessonId
    const course = await Course.findById(courseId);
    const lesson = findLessonInCourse(course, lessonId);
    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Find or create lesson progress
    let progress = await LessonProgress.findOne({
      userId: user._id,
      lessonId,
    });

    let originalProgressStatus = progress?.status; // Store original status for comparison

    if (!progress) {
      progress = new LessonProgress({
        userId: user._id,
        lessonId,
        courseId,
        status: 'in-progress', // Always start as in-progress
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
      // Do not update status directly from client; let isLessonActuallyCompleted determine it.
      progress.lastAccessedAt = new Date();
    }

    // Re-evaluate lesson completion based on the current progress and lesson type
    // For quizzes, we need to fetch quiz attempts. For now, we'll assume a default 'not_attempted'.
    // This will be updated later when quiz attempt tracking is integrated.
    const isCompleted = await isLessonActuallyCompleted(lesson, progress);

    if (isCompleted && progress.status !== 'completed') {
        progress.status = 'completed';
        progress.completedAt = new Date();
        console.log(`🎉 Lesson ${lessonId} marked as completed automatically.`);
    } else if (!isCompleted && progress.status === 'completed') {
        // If it was completed but no longer meets criteria, revert to in-progress
        // This handles cases where progress might regress, e.g., video watched time drops below 90%
        progress.status = 'in-progress';
        progress.completedAt = undefined;
        console.log(`⚠️ Lesson ${lessonId} reverted to in-progress.`);
    } else if (!isCompleted && progress.status === 'not-started') {
        // If not completed but progress has been made, mark as in-progress
        progress.status = 'in-progress';
    }

    await progress.save();

    // Only update enrollment if the lesson's completion status has changed to completed
    if (progress.status === 'completed' && originalProgressStatus !== 'completed') {
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
    if (!enrollment) {
      console.warn(`⚠️  No enrollment found for userId: ${userId}, courseId: ${courseId}`);
      return;
    }

    // Add lesson to completed list if not already there
    const lessonObjectId = new mongoose.Types.ObjectId(lessonId);
    const alreadyCompleted = enrollment.progress.completedLessonIds.some(id => id.equals(lessonObjectId));

    if (!alreadyCompleted) {
      enrollment.progress.completedLessonIds.push(lessonObjectId);
      console.log(`✅ Marked lesson ${lessonId} as completed`);
    } else {
      console.log(`ℹ️  Lesson ${lessonId} was already marked as completed`);
    }

    // Get total lessons in course
    const course = await Course.findById(courseId);
    if (!course) {
      console.warn(`⚠️  Course not found: ${courseId}`);
      return;
    }

    // All lessons in course, in sequence: by module order, then lesson order within each module
    const sortedModules = [...(course.modules || [])].sort((a, b) => a.order - b.order);
    const allCourseLessons = sortedModules.flatMap((mod) =>
      [...(mod.lessons || [])].sort((a, b) => a.order - b.order)
    );
    const totalCompletableLessons = allCourseLessons.length;

    // Calculate progress percentage
    const completedCount = enrollment.progress.completedLessonIds.length;
    const oldPercentage = enrollment.progressPercentage;
    enrollment.progressPercentage = totalCompletableLessons > 0
      ? Math.round((completedCount / totalCompletableLessons) * 100)
      : 0;

    console.log(`📊 Course Progress: ${completedCount}/${totalCompletableLessons} completable lessons (${oldPercentage}% → ${enrollment.progressPercentage}%)`);

    // Update status: not-started → in-progress
    if (enrollment.status === 'not-started') {
      enrollment.status = 'in-progress';
      enrollment.startedAt = new Date();
      console.log(`🚀 Course started`);
    }

    // Determine next uncompleted lesson (first in sequence not in completedLessonIds)
    const nextUncompletedLesson = allCourseLessons.find((l) =>
      l._id && !enrollment.progress.completedLessonIds.some((id) => id.equals(l._id!))
    );
    enrollment.progress.currentLessonId = nextUncompletedLesson?._id;

    // Mark course completed when 100%
    if (enrollment.progressPercentage === 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      console.log(`🎉 Course completed!`);
      try {
        const userDoc = await User.findById(userId);
        if (userDoc) {
          const allLessonProgress = await LessonProgress.find({ userId, courseId });
          const totalTimeSpent = allLessonProgress.reduce((sum, lp) => sum + (lp.timeSpent || 0), 0);
          await storeAnalyticsEvent({
            organizationId: enrollment.organizationId.toString(),
            userId: userDoc.lyzrId,
            eventType: 'course_completed',
            eventName: 'Course Completed',
            properties: {
              courseId,
              courseTitle: course.title,
              courseCategory: course.category,
              totalLessons: totalCompletableLessons,
              completedLessons: enrollment.progress.completedLessonIds.length,
              totalTimeSpent: Math.floor(totalTimeSpent / 60),
              startedAt: enrollment.startedAt?.toISOString() ?? '',
              completedAt: enrollment.completedAt?.toISOString() ?? '',
              durationDays: enrollment.startedAt && enrollment.completedAt
                ? Math.floor(
                    (enrollment.completedAt.getTime() - enrollment.startedAt.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0,
            },
            sessionId: '',
          });
        }
      } catch (trackError) {
        console.error(
          'Failed to track course completion:',
          trackError instanceof Error ? trackError.message : 'Unknown error'
        );
      }
    }

    await enrollment.save();
  } catch (error) {
    console.error('Error updating enrollment progress:', error);
  }
}