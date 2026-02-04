import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserAnalytics from '@/models/userAnalytics';
import AnalyticsEvent from '@/models/analyticsEvent';
import Enrollment from '@/models/enrollment';
import QuizAttempt from '@/models/quizAttempt';
import Course from '@/models/course';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    await dbConnect();

    // Ensure Course model is registered for populate operations
    // This prevents "Schema hasn't been registered" errors during hot reload
    Course;

    const period = searchParams.get('period') || 'weekly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const userId = new mongoose.Types.ObjectId(id);

    // Try to get aggregated analytics first
    const query: any = { userId, period };
    if (startDate) query.startDate = { $gte: new Date(startDate) };
    if (endDate) query.endDate = { $lte: new Date(endDate) };

    const aggregatedAnalytics = await UserAnalytics.find(query)
      .sort({ startDate: -1 })
      .limit(10)
      .lean();

    // If no aggregated data, calculate real-time analytics
    if (aggregatedAnalytics.length === 0) {
      const dateFilter: any = { userId };
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
        if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
      }

      // Calculate metrics
      const [timeSpentResult, enrollments, quizScoreResult, coursesCompleted, quizAttempts] = await Promise.all([
        // Total time spent
        AnalyticsEvent.aggregate([
          { $match: { ...dateFilter, eventType: 'time_spent_updated' } },
          {
            $group: {
              _id: null,
              totalTime: { $sum: '$properties.timeSpent' },
            },
          },
        ]),

        // Enrollments
        Enrollment.find({ userId }).lean(),

        // Avg quiz score
        AnalyticsEvent.aggregate([
          { $match: { ...dateFilter, eventType: 'quiz_completed' } },
          {
            $group: {
              _id: null,
              avgScore: { $avg: '$properties.score' },
            },
          },
        ]),

        // Courses completed
        AnalyticsEvent.countDocuments({
          ...dateFilter,
          eventType: 'course_completed',
        }),

        // Quiz attempts - populate course only (lessons are embedded in courses)
        QuizAttempt.find({ userId })
          .populate('courseId', 'title modules')
          .sort({ completedAt: -1 })
          .lean(),
      ]);

      // Helper function to find lesson title from embedded lessons in course
      const getLessonTitle = (course: any, lessonId: string): string => {
        if (!course?.modules) return 'Unknown Lesson';
        for (const module of course.modules) {
          const lesson = module.lessons?.find((l: any) => l._id?.toString() === lessonId);
          if (lesson) return lesson.title;
        }
        return 'Unknown Lesson';
      };

      // Calculate engagement level
      const totalTimeSpent = timeSpentResult[0]?.totalTime || 0;
      let engagementLevel: 'low' | 'medium' | 'high' = 'low';
      if (totalTimeSpent > 300) engagementLevel = 'high';
      else if (totalTimeSpent > 100) engagementLevel = 'medium';

      // Calculate quiz statistics
      const totalQuizAttempts = quizAttempts.length;
      const passedQuizzes = quizAttempts.filter((q: any) => q.passed).length;
      const avgQuizScore = quizAttempts.length > 0
        ? quizAttempts.reduce((sum: number, q: any) => sum + q.score, 0) / quizAttempts.length
        : (quizScoreResult[0]?.avgScore || 0);

      // Find knowledge gaps (quizzes with low scores)
      const knowledgeGaps = quizAttempts
        .filter((q: any) => q.score < 70)
        .slice(0, 5)
        .map((q: any) => ({
          courseTitle: q.courseId?.title || 'Unknown Course',
          lessonTitle: getLessonTitle(q.courseId, q.lessonId?.toString()),
          score: q.score,
          attemptNumber: q.attemptNumber,
          completedAt: q.completedAt,
          isModuleAssessment: q.isModuleAssessment || false,
        }));

      const realTimeAnalytics = {
        userId: id,
        period,
        totalTimeSpent: Math.round(totalTimeSpent),
        coursesEnrolled: enrollments.length,
        coursesCompleted,
        avgQuizScore: Math.round(avgQuizScore * 10) / 10,
        engagementLevel,
        knowledgeGaps,
        activityHeatmap: [],
        lastAccessedCourses: [],
        quizStatistics: {
          totalAttempts: totalQuizAttempts,
          passed: passedQuizzes,
          failed: totalQuizAttempts - passedQuizzes,
          avgScore: Math.round(avgQuizScore * 10) / 10,
          recentAttempts: quizAttempts.slice(0, 10).map((q: any) => ({
            courseTitle: q.courseId?.title || 'Unknown Course',
            lessonTitle: getLessonTitle(q.courseId, q.lessonId?.toString()),
            score: q.score,
            passed: q.passed,
            attemptNumber: q.attemptNumber,
            timeSpent: q.timeSpent,
            completedAt: q.completedAt,
            isModuleAssessment: q.isModuleAssessment || false,
          })),
        },
        realTime: true,
      };

      return NextResponse.json({
        success: true,
        analytics: [realTimeAnalytics],
        count: 1,
        realTime: true,
      });
    }

    return NextResponse.json({
      success: true,
      analytics: aggregatedAnalytics,
      count: aggregatedAnalytics.length,
      realTime: false,
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
