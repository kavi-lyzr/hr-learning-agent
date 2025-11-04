/**
 * POST /api/tools/get_user_progress
 *
 * Tool endpoint for Lyzr Tutor Agent.
 * Fetches user's learning progress including enrollments, lesson progress, and quiz attempts.
 * Requires x-token authentication from Lyzr agent tool calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Course from '@/models/course'; // CRITICAL: Must import to register model for populate()
import Enrollment from '@/models/enrollment';
import LessonProgress from '@/models/lessonProgress';
import QuizAttempt from '@/models/quizAttempt';
import { validateToolToken } from '@/lib/middleware/tool-auth';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    // Validate tool authentication
    const authResult = validateToolToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { organizationId } = authResult.context!;

    // Parse request body
    const body = await request.json();
    const { userId, courseId, lessonId } = body;

    // Validate userId (Lyzr ID)
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Find user by Lyzr ID
    const user = await User.findOne({ lyzrId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userMongoId = user._id;

    // Build response object
    const response: any = {
      userId,
      userName: user.name || user.email,
    };

    // Case 1: Get progress for a specific lesson
    if (lessonId) {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return NextResponse.json(
          { error: 'Invalid lessonId format' },
          { status: 400 }
        );
      }

      const lessonProgress = await LessonProgress.findOne({
        userId: userMongoId,
        lessonId,
      }).lean();

      const quizAttempts = await QuizAttempt.find({
        userId: userMongoId,
        lessonId,
      })
        .sort({ attemptedAt: -1 })
        .lean();

      response.lessonProgress = lessonProgress
        ? {
            status: lessonProgress.status,
            watchTime: lessonProgress.watchTime,
            scrollDepth: lessonProgress.scrollDepth,
            timeSpent: lessonProgress.timeSpent,
            lastAccessedAt: lessonProgress.lastAccessedAt,
          }
        : null;

      response.quizAttempts = quizAttempts.map((attempt) => ({
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        passed: attempt.passed,
        completedAt: attempt.completedAt,
      }));

      console.log(`✅ Tool call: get_user_progress - Returned lesson progress for user: ${user.email}`);
      return NextResponse.json(response);
    }

    // Case 2: Get progress for a specific course
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return NextResponse.json(
          { error: 'Invalid courseId format' },
          { status: 400 }
        );
      }

      const enrollment = await Enrollment.findOne({
        userId: userMongoId,
        courseId,
        organizationId: new mongoose.Types.ObjectId(organizationId), // Convert string to ObjectId
      })
        .populate('courseId', 'title description')
        .lean();

      if (!enrollment) {
        return NextResponse.json(
          { error: 'Enrollment not found' },
          { status: 404 }
        );
      }

      const lessonProgressRecords = await LessonProgress.find({
        userId: userMongoId,
        courseId,
      }).lean();

      const quizAttempts = await QuizAttempt.find({
        userId: userMongoId,
        courseId,
      })
        .sort({ attemptedAt: -1 })
        .lean();

      response.enrollment = {
        courseId: enrollment.courseId._id.toString(),
        courseTitle: (enrollment.courseId as any).title,
        status: enrollment.status,
        progressPercentage: enrollment.progressPercentage,
        completedLessons: enrollment.progress.completedLessonIds.length,
        enrolledAt: enrollment.enrolledAt,
        startedAt: enrollment.startedAt,
        completedAt: enrollment.completedAt,
      };

      response.lessonProgress = lessonProgressRecords.map((lp) => ({
        lessonId: lp.lessonId.toString(),
        status: lp.status,
        timeSpent: lp.timeSpent,
      }));

      response.quizAttempts = quizAttempts.map((attempt) => ({
        lessonId: attempt.lessonId.toString(),
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        passed: attempt.passed,
        completedAt: attempt.completedAt,
      }));

      console.log(`✅ Tool call: get_user_progress - Returned course progress for user: ${user.email}`);
      return NextResponse.json(response);
    }

    // Case 3: Get all enrollments for the user in this organization
    const enrollments = await Enrollment.find({
      userId: userMongoId,
      organizationId: new mongoose.Types.ObjectId(organizationId), // Convert string to ObjectId
    })
      .populate('courseId', 'title description')
      .sort({ enrolledAt: -1 })
      .lean();

    response.enrollments = enrollments.map((e) => ({
      courseId: e.courseId._id.toString(),
      courseTitle: (e.courseId as any).title,
      status: e.status,
      progressPercentage: e.progressPercentage,
      completedLessons: e.progress.completedLessonIds.length,
      enrolledAt: e.enrolledAt,
    }));

    response.totalCourses = enrollments.length;
    response.completedCourses = enrollments.filter(
      (e) => e.status === 'completed'
    ).length;
    response.inProgressCourses = enrollments.filter(
      (e) => e.status === 'in-progress'
    ).length;

    console.log(`✅ Tool call: get_user_progress - Returned all enrollments for user: ${user.email}`);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in get_user_progress tool:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to fetch user progress',
      },
      { status: 500 }
    );
  }
}
