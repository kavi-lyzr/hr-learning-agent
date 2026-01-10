import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AnalyticsEvent from '@/models/analyticsEvent';
import OrganizationAnalytics from '@/models/organizationAnalytics';
import CourseAnalytics from '@/models/courseAnalytics';
import UserAnalytics from '@/models/userAnalytics';
import Enrollment from '@/models/enrollment';
import mongoose from 'mongoose';

/**
 * Manual aggregation endpoint
 * Aggregates raw events into analytics collections
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, period = 'daily', startDate, endDate } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Adjust dates based on period
    if (period === 'weekly') {
      start.setDate(start.getDate() - start.getDay()); // Start of week
      end.setDate(end.getDate() + (6 - end.getDay())); // End of week
    } else if (period === 'monthly') {
      start.setDate(1); // Start of month
      end.setMonth(end.getMonth() + 1, 0); // End of month
    }

    const orgId = new mongoose.Types.ObjectId(organizationId);
    const dateFilter = {
      organizationId: orgId,
      timestamp: { $gte: start, $lte: end },
    };

    // Aggregate organization-level analytics
    const [timeSpentResult, quizScoreResult, uniqueUsers, coursesCompletedCount] = await Promise.all([
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
            totalTimeSpent: { $sum: '$totalTime' },
            avgTimeSpent: { $avg: '$totalTime' },
          },
        },
      ]),

      AnalyticsEvent.aggregate([
        { $match: { ...dateFilter, eventType: 'quiz_completed' } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$properties.score' },
          },
        },
      ]),

      AnalyticsEvent.distinct('userId', dateFilter),

      AnalyticsEvent.countDocuments({
        ...dateFilter,
        eventType: 'course_completed',
      }),
    ]);

    const totalEngagements = await AnalyticsEvent.countDocuments(dateFilter);

    // Get enrollments for progress calculation
    const enrollments = await Enrollment.find({ organizationId: orgId }).lean();
    const avgProgress = enrollments.length > 0
      ? enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / enrollments.length
      : 0;

    // Create organization analytics document
    const orgAnalytics = await OrganizationAnalytics.findOneAndUpdate(
      {
        organizationId: orgId,
        period,
        startDate: start,
        endDate: end,
      },
      {
        totalTimeSpent: Math.round(timeSpentResult[0]?.totalTimeSpent || 0),
        avgTimeSpent: Math.round(timeSpentResult[0]?.avgTimeSpent || 0),
        activeUsers: uniqueUsers.length,
        totalEngagements,
        avgLearningProgress: Math.round(avgProgress * 10) / 10,
        avgQuizScore: Math.round((quizScoreResult[0]?.avgScore || 0) * 10) / 10,
        coursesCompleted: coursesCompletedCount,
        courseAggregations: [],
        userAggregations: [],
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Analytics aggregated successfully',
      aggregation: {
        organizationId,
        period,
        startDate: start,
        endDate: end,
        metrics: {
          totalTimeSpent: orgAnalytics.totalTimeSpent,
          avgTimeSpent: orgAnalytics.avgTimeSpent,
          activeUsers: orgAnalytics.activeUsers,
          totalEngagements: orgAnalytics.totalEngagements,
          avgLearningProgress: orgAnalytics.avgLearningProgress,
          avgQuizScore: orgAnalytics.avgQuizScore,
          coursesCompleted: orgAnalytics.coursesCompleted,
        },
      },
    });
  } catch (error) {
    console.error('Error aggregating analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get aggregation status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const orgId = new mongoose.Types.ObjectId(organizationId);

    // Get latest aggregation dates
    const [latestOrgAnalytics, latestCourseAnalytics, latestUserAnalytics] = await Promise.all([
      OrganizationAnalytics.findOne({ organizationId: orgId })
        .sort({ endDate: -1 })
        .lean(),
      CourseAnalytics.findOne({ organizationId: orgId })
        .sort({ endDate: -1 })
        .lean(),
      UserAnalytics.findOne({ organizationId: orgId })
        .sort({ endDate: -1 })
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      status: {
        organizationAnalytics: {
          lastAggregated: latestOrgAnalytics?.endDate || null,
          period: latestOrgAnalytics?.period || null,
        },
        courseAnalytics: {
          lastAggregated: latestCourseAnalytics?.endDate || null,
          period: latestCourseAnalytics?.period || null,
        },
        userAnalytics: {
          lastAggregated: latestUserAnalytics?.endDate || null,
          period: latestUserAnalytics?.period || null,
        },
      },
    });
  } catch (error) {
    console.error('Error getting aggregation status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
