import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AnalyticsEvent from '@/models/analyticsEvent';
import Enrollment from '@/models/enrollment';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    await dbConnect();

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const organizationId = new mongoose.Types.ObjectId(id);

    // Build date filter
    const dateFilter: any = { organizationId };
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
      if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
    }

    // Calculate engagement metrics using aggregation
    const [timeSpentResult, quizScoreResult, uniqueUsersResult, progressResult] = await Promise.all([
      // Avg total time spent
      AnalyticsEvent.aggregate([
        { $match: { ...dateFilter, eventType: 'time_spent_updated' } },
        {
          $group: {
            _id: '$userId',
            totalTime: { $sum: '$properties.timeSpent' },
          },
        },
        {
          $group: {
            _id: null,
            avgTimeSpent: { $avg: '$totalTime' },
            totalTimeSpent: { $sum: '$totalTime' },
          },
        },
      ]),

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

      // Active users count
      AnalyticsEvent.distinct('userId', dateFilter),

      // Avg learning progress (from enrollments)
      Enrollment.aggregate([
        { $match: { organizationId } },
        {
          $group: {
            _id: null,
            avgProgress: { $avg: '$progressPercentage' },
          },
        },
      ]),
    ]);

    const avgTimeSpent = timeSpentResult[0]?.avgTimeSpent || 0;
    const totalTimeSpent = timeSpentResult[0]?.totalTimeSpent || 0;
    const avgQuizScore = quizScoreResult[0]?.avgScore || 0;
    const activeUsers = uniqueUsersResult.length;
    const avgLearningProgress = progressResult[0]?.avgProgress || 0;

    // Get course completion count
    const coursesCompleted = await AnalyticsEvent.countDocuments({
      ...dateFilter,
      eventType: 'course_completed',
    });

    // Get total engagements
    const totalEngagements = await AnalyticsEvent.countDocuments(dateFilter);

    return NextResponse.json({
      success: true,
      engagement: {
        avgTimeSpent: Math.round(avgTimeSpent),
        totalTimeSpent: Math.round(totalTimeSpent),
        avgQuizScore: Math.round(avgQuizScore * 10) / 10,
        avgLearningProgress: Math.round(avgLearningProgress * 10) / 10,
        activeUsers,
        coursesCompleted,
        totalEngagements,
      },
    });
  } catch (error) {
    console.error('Error fetching organization engagement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
