/**
 * GET /api/organizations/[id]/activity
 * Fetch recent activity for the organization dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/enrollment';
import LessonProgress from '@/models/lessonProgress';
import QuizAttempt from '@/models/quizAttempt';
import User from '@/models/user';
import Course from '@/models/course';
import mongoose from 'mongoose';

interface ActivityEvent {
  id: string;
  type: 'enrollment' | 'lesson_completed' | 'quiz_attempted' | 'course_completed';
  userId: string;
  userName: string;
  courseId?: string;
  courseName?: string;
  lessonId?: string;
  lessonName?: string;
  metadata?: {
    score?: number;
    passed?: boolean;
    progressPercentage?: number;
  };
  timestamp: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id: organizationId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const activities: ActivityEvent[] = [];

    // Fetch recent enrollments
    const recentEnrollments = await Enrollment.find({
      organizationId: orgObjectId,
    })
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .sort({ enrolledAt: -1 })
      .limit(limit)
      .lean();

    for (const enrollment of recentEnrollments) {
      const user = enrollment.userId as any;
      const course = enrollment.courseId as any;

      // Course completion event
      if (enrollment.status === 'completed' && enrollment.completedAt) {
        activities.push({
          id: `course_completed_${enrollment._id}`,
          type: 'course_completed',
          userId: user._id.toString(),
          userName: user.name || user.email,
          courseId: course._id.toString(),
          courseName: course.title,
          metadata: {
            progressPercentage: enrollment.progressPercentage,
          },
          timestamp: enrollment.completedAt,
        });
      }

      // Enrollment event
      activities.push({
        id: `enrollment_${enrollment._id}`,
        type: 'enrollment',
        userId: user._id.toString(),
        userName: user.name || user.email,
        courseId: course._id.toString(),
        courseName: course.title,
        timestamp: enrollment.enrolledAt,
      });
    }

    // Fetch recent lesson completions
    const recentLessonCompletions = await LessonProgress.find({
      status: 'completed',
      completedAt: { $exists: true },
    })
      .populate('userId', 'name email')
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean();

    for (const lessonProgress of recentLessonCompletions) {
      // Verify this lesson belongs to the organization
      const course = await Course.findById(lessonProgress.courseId).lean();
      if (!course || course.organizationId.toString() !== organizationId) {
        continue;
      }

      const user = lessonProgress.userId as any;

      // Find lesson name
      let lessonName = 'Lesson';
      for (const module of course.modules || []) {
        const lesson = module.lessons?.find((l: any) => l._id.toString() === lessonProgress.lessonId.toString());
        if (lesson) {
          lessonName = lesson.title;
          break;
        }
      }

      activities.push({
        id: `lesson_completed_${lessonProgress._id}`,
        type: 'lesson_completed',
        userId: user._id.toString(),
        userName: user.name || user.email,
        courseId: course._id.toString(),
        courseName: course.title,
        lessonId: lessonProgress.lessonId.toString(),
        lessonName,
        timestamp: lessonProgress.completedAt!,
      });
    }

    // Fetch recent quiz attempts
    const recentQuizAttempts = await QuizAttempt.find({
      completedAt: { $exists: true },
    })
      .populate('userId', 'name email')
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean();

    for (const quizAttempt of recentQuizAttempts) {
      // Verify this quiz belongs to the organization
      const course = await Course.findById(quizAttempt.courseId).lean();
      if (!course || course.organizationId.toString() !== organizationId) {
        continue;
      }

      const user = quizAttempt.userId as any;

      // Find lesson name
      let lessonName = 'Quiz';
      for (const module of course.modules || []) {
        const lesson = module.lessons?.find((l: any) => l._id.toString() === quizAttempt.lessonId.toString());
        if (lesson) {
          lessonName = lesson.title;
          break;
        }
      }

      activities.push({
        id: `quiz_attempted_${quizAttempt._id}`,
        type: 'quiz_attempted',
        userId: user._id.toString(),
        userName: user.name || user.email,
        courseId: course._id.toString(),
        courseName: course.title,
        lessonId: quizAttempt.lessonId.toString(),
        lessonName,
        metadata: {
          score: quizAttempt.score,
          passed: quizAttempt.passed,
        },
        timestamp: quizAttempt.completedAt!,
      });
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Return only the requested limit
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({ activities: limitedActivities });
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
