import { NextRequest, NextResponse } from 'next/server';
import { storeAnalyticsEvent } from '@/lib/analytics-storage';
import { EventType } from '@/models/analyticsEvent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { organizationId, userId, eventType, eventName, properties, sessionId } = body;

    // Validate required fields
    if (!organizationId || !userId || !eventType || !eventName) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, userId, eventType, eventName' },
        { status: 400 }
      );
    }

    // Store event in MongoDB
    const event = await storeAnalyticsEvent({
      organizationId,
      userId,
      eventType: eventType as EventType,
      eventName,
      properties: properties || {},
      sessionId,
      timestamp: new Date(),
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Failed to store event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        eventId: event.eventId,
        eventType: event.eventType,
        eventName: event.eventName,
        timestamp: event.timestamp,
      },
    });
  } catch (error) {
    console.error('Error in analytics events API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      );
    }

    // Import here to avoid issues
    const { getEventsByOrganization } = await import('@/lib/analytics-storage');

    // Get filters from query params
    const filters: any = {};
    
    const eventType = searchParams.get('eventType');
    if (eventType) filters.eventType = eventType as EventType;
    
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

    const { events, total } = await getEventsByOrganization(organizationId, filters);

    return NextResponse.json({
      success: true,
      events,
      total,
      pagination: {
        limit: filters.limit || 50,
        skip: filters.skip || 0,
      },
    });
  } catch (error) {
    console.error('Error in analytics events API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
