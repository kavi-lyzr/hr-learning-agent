import { NextRequest, NextResponse } from 'next/server';
import { getEventsByOrganization } from '@/lib/analytics-storage';
import { EventType } from '@/models/analyticsEvent';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    // Build filters from query parameters
    const filters: any = {};

    const eventType = searchParams.get('eventType');
    if (eventType) {
      const types = eventType.split(',');
      filters.eventType = types.length > 1 ? types as EventType[] : types[0] as EventType;
    }

    const userId = searchParams.get('userId');
    if (userId) filters.userId = userId;

    const courseId = searchParams.get('courseId');
    if (courseId) filters.courseId = courseId;

    const startDate = searchParams.get('startDate');
    if (startDate) filters.startDate = new Date(startDate);

    const endDate = searchParams.get('endDate');
    if (endDate) filters.endDate = new Date(endDate);

    const limit = searchParams.get('limit');
    if (limit) filters.limit = parseInt(limit, 10);

    const skip = searchParams.get('skip');
    if (skip) filters.skip = parseInt(skip, 10);

    const sessionId = searchParams.get('sessionId');
    if (sessionId) filters.sessionId = sessionId;

    // Fetch events
    const { events, total } = await getEventsByOrganization(id, filters);

    return NextResponse.json({
      success: true,
      events,
      total,
      pagination: {
        limit: filters.limit || 50,
        skip: filters.skip || 0,
        hasMore: (filters.skip || 0) + events.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching organization events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
