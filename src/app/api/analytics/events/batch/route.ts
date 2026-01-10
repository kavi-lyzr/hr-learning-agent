import { NextRequest, NextResponse } from 'next/server';
import { batchStoreEvents } from '@/lib/analytics-storage';
import { EventType } from '@/models/analyticsEvent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { events } = body;

    // Validate events array
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty events array' },
        { status: 400 }
      );
    }

    // Validate each event has required fields
    for (const event of events) {
      if (!event.organizationId || !event.userId || !event.eventType || !event.eventName) {
        return NextResponse.json(
          { error: 'Each event must have: organizationId, userId, eventType, eventName' },
          { status: 400 }
        );
      }
    }

    // Store events in MongoDB
    const storedEvents = await batchStoreEvents(
      events.map((event: any) => ({
        organizationId: event.organizationId,
        userId: event.userId,
        eventType: event.eventType as EventType,
        eventName: event.eventName,
        properties: event.properties || {},
        sessionId: event.sessionId,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      }))
    );

    if (storedEvents.length === 0) {
      return NextResponse.json(
        { error: 'Failed to store events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: storedEvents.length,
      events: storedEvents.map(event => ({
        eventId: event.eventId,
        eventType: event.eventType,
        eventName: event.eventName,
        timestamp: event.timestamp,
      })),
    });
  } catch (error) {
    console.error('Error in batch analytics events API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
