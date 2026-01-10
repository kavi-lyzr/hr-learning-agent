import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AnalyticsEvent from '@/models/analyticsEvent';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    await dbConnect();

    const courseIdStr = id;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    const dateFilter: any = { 'properties.courseId': courseIdStr };
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
      if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
    }

    // Find lessons where users abandoned
    const abandonedLessons = await AnalyticsEvent.aggregate([
      {
        $match: {
          ...dateFilter,
          eventType: 'lesson_abandoned',
        },
      },
      {
        $group: {
          _id: {
            lessonId: '$properties.lessonId',
            lessonTitle: '$properties.lessonTitle',
          },
          dropoffCount: { $sum: 1 },
          users: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          _id: 0,
          lessonId: '$_id.lessonId',
          lessonTitle: '$_id.lessonTitle',
          dropoffCount: 1,
          uniqueUsers: { $size: '$users' },
        },
      },
      { $sort: { dropoffCount: -1 } },
    ]);

    // Get total users who started lessons in this course
    const totalUsersStarted = await AnalyticsEvent.distinct('userId', {
      ...dateFilter,
      eventType: 'lesson_started',
    });

    const totalUsers = totalUsersStarted.length;

    // Calculate dropoff rates
    const dropoffPoints = abandonedLessons.map((lesson: any) => ({
      ...lesson,
      dropoffRate: totalUsers > 0 
        ? Math.round((lesson.uniqueUsers / totalUsers) * 100 * 10) / 10 
        : 0,
    }));

    // Get lesson completion funnel
    const lessonFunnel = await AnalyticsEvent.aggregate([
      {
        $match: {
          ...dateFilter,
          eventType: { $in: ['lesson_started', 'lesson_completed'] },
        },
      },
      {
        $group: {
          _id: {
            lessonId: '$properties.lessonId',
            lessonTitle: '$properties.lessonTitle',
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            lessonId: '$_id.lessonId',
            lessonTitle: '$_id.lessonTitle',
          },
          started: {
            $sum: {
              $cond: [{ $eq: ['$_id.eventType', 'lesson_started'] }, '$count', 0],
            },
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$_id.eventType', 'lesson_completed'] }, '$count', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          lessonId: '$_id.lessonId',
          lessonTitle: '$_id.lessonTitle',
          started: 1,
          completed: 1,
          completionRate: {
            $cond: [
              { $gt: ['$started', 0] },
              {
                $multiply: [
                  { $divide: ['$completed', '$started'] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { started: -1 } },
    ]);

    return NextResponse.json({
      success: true,
      dropoffPoints,
      lessonFunnel,
      totalUsers,
      summary: {
        mostAbandonedLesson: dropoffPoints[0] || null,
        totalDropoffs: abandonedLessons.reduce((sum: number, l: any) => sum + l.dropoffCount, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching course dropoff analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
