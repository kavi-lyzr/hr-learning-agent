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

    const userId = new mongoose.Types.ObjectId(id);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter (default to last 90 days if not specified)
    const dateFilter: any = { userId };
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 90);

    dateFilter.timestamp = {
      $gte: startDate ? new Date(startDate) : defaultStartDate,
      $lte: endDate ? new Date(endDate) : new Date(),
    };

    // Aggregate activity by date
    const heatmapData = await AnalyticsEvent.aggregate([
      {
        $match: {
          ...dateFilter,
          eventType: 'time_spent_updated',
        },
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timestamp',
            },
          },
          timeSpent: '$properties.timeSpent',
        },
      },
      {
        $group: {
          _id: '$date',
          minutesSpent: { $sum: '$timeSpent' },
          eventCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          minutesSpent: { $round: ['$minutesSpent', 0] },
          eventCount: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    // Calculate statistics
    const totalMinutes = heatmapData.reduce((sum, day) => sum + day.minutesSpent, 0);
    const avgMinutesPerDay = heatmapData.length > 0 
      ? Math.round(totalMinutes / heatmapData.length) 
      : 0;
    const maxDay = heatmapData.reduce((max, day) => 
      day.minutesSpent > max.minutesSpent ? day : max, 
      { minutesSpent: 0, date: '' }
    );

    return NextResponse.json({
      success: true,
      heatmap: heatmapData,
      statistics: {
        totalMinutes: Math.round(totalMinutes),
        avgMinutesPerDay,
        activeDays: heatmapData.length,
        maxDay: maxDay.minutesSpent > 0 ? maxDay : null,
        dateRange: {
          start: dateFilter.timestamp.$gte,
          end: dateFilter.timestamp.$lte,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user heatmap:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
