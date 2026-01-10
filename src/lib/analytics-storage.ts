import dbConnect from './db';
import AnalyticsEvent, { EventType, IAnalyticsEvent } from '@/models/analyticsEvent';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

/**
 * Analytics Storage Service
 * Handles storing and retrieving analytics events from MongoDB
 */

export interface StoreEventParams {
  organizationId: string;
  userId: string;
  eventType: EventType;
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  sessionId?: string;
}

export interface EventFilters {
  eventType?: EventType | EventType[];
  userId?: string;
  courseId?: string;
  startDate?: Date;
  endDate?: Date;
  sessionId?: string;
  limit?: number;
  skip?: number;
}

/**
 * Store a single analytics event to MongoDB
 */
export const storeAnalyticsEvent = async (params: StoreEventParams): Promise<IAnalyticsEvent | null> => {
  try {
    await dbConnect();

    const event = new AnalyticsEvent({
      eventId: uuidv4(),
      organizationId: new mongoose.Types.ObjectId(params.organizationId),
      userId: params.userId, // Store Lyzr ID as string
      eventType: params.eventType,
      eventName: params.eventName,
      properties: params.properties || {},
      timestamp: params.timestamp || new Date(),
      sessionId: params.sessionId,
    });

    await event.save();
    return event;
  } catch (error) {
    console.error('Error storing analytics event:', error);
    return null;
  }
};

/**
 * Store multiple analytics events in bulk
 */
export const batchStoreEvents = async (events: StoreEventParams[]): Promise<IAnalyticsEvent[]> => {
  try {
    await dbConnect();

    const analyticsEvents = events.map(params => ({
      eventId: uuidv4(),
      organizationId: new mongoose.Types.ObjectId(params.organizationId),
      userId: params.userId, // Store Lyzr ID as string
      eventType: params.eventType,
      eventName: params.eventName,
      properties: params.properties || {},
      timestamp: params.timestamp || new Date(),
      sessionId: params.sessionId,
    }));

    const savedEvents = await AnalyticsEvent.insertMany(analyticsEvents);
    return savedEvents;
  } catch (error) {
    console.error('Error batch storing analytics events:', error);
    return [];
  }
};

/**
 * Retrieve events by organization with filters
 */
export const getEventsByOrganization = async (
  organizationId: string,
  filters?: EventFilters
): Promise<{ events: IAnalyticsEvent[]; total: number }> => {
  try {
    await dbConnect();

    const query: any = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    // Apply filters
    if (filters?.eventType) {
      if (Array.isArray(filters.eventType)) {
        query.eventType = { $in: filters.eventType };
      } else {
        query.eventType = filters.eventType;
      }
    }

    if (filters?.userId) {
      query.userId = filters.userId; // Use Lyzr ID as string
    }

    if (filters?.courseId) {
      query['properties.courseId'] = filters.courseId;
    }

    if (filters?.sessionId) {
      query.sessionId = filters.sessionId;
    }

    if (filters?.startDate || filters?.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    const total = await AnalyticsEvent.countDocuments(query);

    const events = await AnalyticsEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(filters?.skip || 0)
      .limit(filters?.limit || 50)
      .lean();

    return { events: events as unknown as IAnalyticsEvent[], total };
  } catch (error) {
    console.error('Error retrieving events by organization:', error);
    return { events: [], total: 0 };
  }
};

/**
 * Retrieve events by user with filters
 */
export const getEventsByUser = async (
  userId: string,
  filters?: EventFilters
): Promise<{ events: IAnalyticsEvent[]; total: number }> => {
  try {
    await dbConnect();

    const query: any = {
      userId: userId, // Use Lyzr ID as string
    };

    // Apply filters
    if (filters?.eventType) {
      if (Array.isArray(filters.eventType)) {
        query.eventType = { $in: filters.eventType };
      } else {
        query.eventType = filters.eventType;
      }
    }

    if (filters?.courseId) {
      query['properties.courseId'] = filters.courseId;
    }

    if (filters?.sessionId) {
      query.sessionId = filters.sessionId;
    }

    if (filters?.startDate || filters?.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    const total = await AnalyticsEvent.countDocuments(query);

    const events = await AnalyticsEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(filters?.skip || 0)
      .limit(filters?.limit || 50)
      .lean();

    return { events: events as unknown as IAnalyticsEvent[], total };
  } catch (error) {
    console.error('Error retrieving events by user:', error);
    return { events: [], total: 0 };
  }
};

/**
 * Retrieve events by course with filters
 */
export const getEventsByCourse = async (
  courseId: string,
  filters?: EventFilters
): Promise<{ events: IAnalyticsEvent[]; total: number }> => {
  try {
    await dbConnect();

    const query: any = {
      'properties.courseId': courseId,
    };

    // Apply filters
    if (filters?.eventType) {
      if (Array.isArray(filters.eventType)) {
        query.eventType = { $in: filters.eventType };
      } else {
        query.eventType = filters.eventType;
      }
    }

    if (filters?.userId) {
      query.userId = filters.userId; // Use Lyzr ID as string
    }

    if (filters?.sessionId) {
      query.sessionId = filters.sessionId;
    }

    if (filters?.startDate || filters?.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    const total = await AnalyticsEvent.countDocuments(query);

    const events = await AnalyticsEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(filters?.skip || 0)
      .limit(filters?.limit || 50)
      .lean();

    return { events: events as unknown as IAnalyticsEvent[], total };
  } catch (error) {
    console.error('Error retrieving events by course:', error);
    return { events: [], total: 0 };
  }
};

/**
 * Get event statistics for an organization
 */
export const getEventStats = async (
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalEvents: number;
  eventsByType: Record<string, number>;
  uniqueUsers: number;
}> => {
  try {
    await dbConnect();

    const matchQuery: any = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) matchQuery.timestamp.$gte = startDate;
      if (endDate) matchQuery.timestamp.$lte = endDate;
    }

    const [statsResult, uniqueUsersResult] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
          },
        },
      ]),
      AnalyticsEvent.distinct('userId', matchQuery),
    ]);

    const eventsByType: Record<string, number> = {};
    let totalEvents = 0;

    statsResult.forEach((stat: any) => {
      eventsByType[stat._id] = stat.count;
      totalEvents += stat.count;
    });

    return {
      totalEvents,
      eventsByType,
      uniqueUsers: uniqueUsersResult.length,
    };
  } catch (error) {
    console.error('Error getting event stats:', error);
    return {
      totalEvents: 0,
      eventsByType: {},
      uniqueUsers: 0,
    };
  }
};

/**
 * Delete old events (for data retention policy)
 */
export const deleteOldEvents = async (daysToKeep: number = 90): Promise<number> => {
  try {
    await dbConnect();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AnalyticsEvent.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  } catch (error) {
    console.error('Error deleting old events:', error);
    return 0;
  }
};
