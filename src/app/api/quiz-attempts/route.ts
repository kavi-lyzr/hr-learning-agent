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

    // Update lesson progress to mark as completed if passed
    if (passed) {
      await LessonProgress.findOneAndUpdate(
        {
          userId: user._id,
          lessonId,
        },
        {
          $set: {
            status: 'completed',
          },
        },
        { upsert: true }
      );
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
