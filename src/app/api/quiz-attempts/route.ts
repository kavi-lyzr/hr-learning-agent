/**
 * Quiz Attempts API
 *
 * GET  /api/quiz-attempts?userId=xxx&lessonId=xxx - Get quiz attempts for a lesson
 * POST /api/quiz-attempts - Submit a quiz attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuizAttempt from '@/models/quizAttempt';
import User from '@/models/user';
import LessonProgress from '@/models/lessonProgress';
import Enrollment from '@/models/enrollment';
import Course from '@/models/course';
import mongoose from 'mongoose';
import { storeAnalyticsEvent } from '@/lib/analytics-storage';

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Lyzr ID
    const lessonId = searchParams.get('lessonId');

    if (!userId || !lessonId) {
      return NextResponse.json(
        { error: 'userId and lessonId are required' },
        { status: 400 }
      );
    }

    // Get user's MongoDB _id from Lyzr ID
    const user = await User.findOne({ lyzrId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all quiz attempts for this lesson by this user
    const attempts = await QuizAttempt.find({
      userId: user._id,
      lessonId,
    })
      .sort({ createdAt: -1 }) // Most recent first
      .lean();

    return NextResponse.json({ attempts });

  } catch (error: any) {
    console.error('Error fetching quiz attempts:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to fetch quiz attempts',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const {
      userId, // Lyzr ID
      lessonId,
      courseId,
      organizationId,
      attemptNumber,
      answers,
      score,
      passed,
      timeSpent,
      isModuleAssessment,
    } = body;

    // Validate required fields
    if (!userId || !lessonId || !courseId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user's MongoDB _id from Lyzr ID
    const user = await User.findOne({ lyzrId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create quiz attempt
    const now = new Date();
    const quizAttempt = new QuizAttempt({
      userId: user._id,
      lessonId,
      courseId,
      organizationId,
      attemptNumber: attemptNumber || 1,
      answers: answers || [],
      score: score || 0,
      passed: passed || false,
      timeSpent: timeSpent || 0,
      isModuleAssessment: isModuleAssessment || false,
      startedAt: new Date(now.getTime() - (timeSpent || 0) * 1000), // Calculate start time
      completedAt: now,
    });

    await quizAttempt.save();

    // Update lesson progress and enrollment if passed
    if (passed) {
      // Check if LessonProgress already exists
      const existingProgress = await LessonProgress.findOne({
        userId: user._id,
        lessonId,
      });

      const wasAlreadyCompleted = existingProgress?.status === 'completed';

      // Update or create LessonProgress with all required fields
      await LessonProgress.findOneAndUpdate(
        {
          userId: user._id,
          lessonId,
        },
        {
          $set: {
            status: 'completed',
            courseId,
            completedAt: now,
            lastAccessedAt: now,
          },
          $setOnInsert: {
            watchTime: 0,
            scrollDepth: 0,
            timeSpent: timeSpent || 0,
          },
        },
        { upsert: true }
      );

      // Only update enrollment if this is the first time completing this lesson
      if (!wasAlreadyCompleted) {
        await updateEnrollmentProgressOnQuizPass(user._id as mongoose.Types.ObjectId, courseId, lessonId, organizationId);
      }
    }

    console.log(`✅ Quiz attempt saved for user ${user.email}, score: ${score}%`);

    return NextResponse.json({
      success: true,
      attempt: quizAttempt,
    });

  } catch (error: any) {
    console.error('Error saving quiz attempt:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to save quiz attempt',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update enrollment progress when a quiz is passed
 * This is similar to the function in lesson-progress/route.ts but adapted for quiz completion
 */
async function updateEnrollmentProgressOnQuizPass(
  userId: mongoose.Types.ObjectId,
  courseId: string,
  lessonId: string,
  organizationId: string
) {
  try {
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
      console.warn(`⚠️  No enrollment found for userId: ${userId}, courseId: ${courseId}`);
      return;
    }

    // Add lesson to completed list if not already there
    const lessonObjectId = new mongoose.Types.ObjectId(lessonId);
    const alreadyCompleted = enrollment.progress.completedLessonIds.some(
      (id: mongoose.Types.ObjectId) => id.equals(lessonObjectId)
    );

    if (!alreadyCompleted) {
      enrollment.progress.completedLessonIds.push(lessonObjectId);
      console.log(`✅ Marked lesson ${lessonId} as completed (via quiz pass)`);
    } else {
      console.log(`ℹ️  Lesson ${lessonId} was already marked as completed`);
      return; // No need to recalculate if already completed
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

    console.log(`📊 Course Progress (quiz pass): ${completedCount}/${totalCompletableLessons} lessons (${oldPercentage}% → ${enrollment.progressPercentage}%)`);

    // Update status: not-started → in-progress
    if (enrollment.status === 'not-started') {
      enrollment.status = 'in-progress';
      enrollment.startedAt = new Date();
      console.log(`🚀 Course started (via quiz pass)`);
    }

    // Determine next uncompleted lesson (first in sequence not in completedLessonIds)
    const nextUncompletedLesson = allCourseLessons.find((l) =>
      l._id && !enrollment.progress.completedLessonIds.some((id: mongoose.Types.ObjectId) => id.equals(l._id!))
    );
    enrollment.progress.currentLessonId = nextUncompletedLesson?._id;

    // Mark course completed when 100%
    if (enrollment.progressPercentage === 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      console.log(`🎉 Course completed (via quiz pass)!`);

      // Track course completion analytics
      try {
        const userDoc = await User.findById(userId);
        if (userDoc) {
          const allLessonProgress = await LessonProgress.find({ userId, courseId });
          const totalTimeSpent = allLessonProgress.reduce((sum, lp) => sum + (lp.timeSpent || 0), 0);
          await storeAnalyticsEvent({
            organizationId,
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
    console.error('Error updating enrollment progress on quiz pass:', error);
  }
}
