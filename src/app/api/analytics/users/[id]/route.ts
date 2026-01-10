import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserAnalytics from '@/models/userAnalytics';
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
      const [timeSpentResult, enrollments, quizScoreResult, coursesCompleted] = await Promise.all([
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
      ]);

      // Calculate engagement level
      const totalTimeSpent = timeSpentResult[0]?.totalTime || 0;
      let engagementLevel: 'low' | 'medium' | 'high' = 'low';
      if (totalTimeSpent > 300) engagementLevel = 'high';
      else if (totalTimeSpent > 100) engagementLevel = 'medium';

      const realTimeAnalytics = {
        userId: id,
        period,
        totalTimeSpent: Math.round(totalTimeSpent),
        coursesEnrolled: enrollments.length,
        coursesCompleted,
        avgQuizScore: Math.round((quizScoreResult[0]?.avgScore || 0) * 10) / 10,
        engagementLevel,
        knowledgeGaps: [],
        activityHeatmap: [],
        lastAccessedCourses: [],
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
