import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CourseAnalytics from '@/models/courseAnalytics';
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

    // First, try to get aggregated analytics
    const query: any = {
      courseId: new mongoose.Types.ObjectId(id),
      period,
    };

    if (startDate) query.startDate = { $gte: new Date(startDate) };
    if (endDate) query.endDate = { $lte: new Date(endDate) };

    const aggregatedAnalytics = await CourseAnalytics.find(query)
      .sort({ startDate: -1 })
      .limit(10)
      .lean();

    // If no aggregated data, calculate real-time analytics
    if (aggregatedAnalytics.length === 0) {
      const courseIdStr = id;
      const dateFilter: any = { 'properties.courseId': courseIdStr };
      
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
        if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
      }

      // Calculate metrics
      const [enrollmentCount, completionCount, timeSpentResult, quizScoreResult] = await Promise.all([
        // Enrollment count
        AnalyticsEvent.countDocuments({
          ...dateFilter,
          eventType: 'course_enrolled',
        }),

        // Completion count
        AnalyticsEvent.countDocuments({
          ...dateFilter,
          eventType: 'course_completed',
        }),

        // Avg time spent
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
              avgTime: { $avg: '$totalTime' },
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
              avgAttempts: { $avg: '$properties.attemptNumber' },
            },
          },
        ]),
      ]);

      const completionRate = enrollmentCount > 0 
        ? Math.round((completionCount / enrollmentCount) * 100 * 10) / 10 
        : 0;

      const realTimeAnalytics = {
        courseId: id,
        period,
        enrollmentCount,
        completionCount,
        completionRate,
        avgTimeSpent: Math.round(timeSpentResult[0]?.avgTime || 0),
        avgScore: Math.round((quizScoreResult[0]?.avgScore || 0) * 10) / 10,
        avgAttemptsToPass: Math.round((quizScoreResult[0]?.avgAttempts || 0) * 10) / 10,
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
    console.error('Error fetching course analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
