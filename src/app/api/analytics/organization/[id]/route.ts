import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrganizationAnalytics from '@/models/organizationAnalytics';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    await dbConnect();

    // Get query parameters
    const period = searchParams.get('period') || 'weekly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {
      organizationId: new mongoose.Types.ObjectId(id),
      period,
    };

    if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }

    if (endDate) {
      query.endDate = { $lte: new Date(endDate) };
    }

    const analytics = await OrganizationAnalytics.find(query)
      .sort({ startDate: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      analytics,
      count: analytics.length,
    });
  } catch (error) {
    console.error('Error fetching organization analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
