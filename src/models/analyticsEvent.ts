import mongoose, { Document, Schema } from 'mongoose';

export type EventType =
  | 'lesson_started'
  | 'lesson_completed'
  | 'lesson_abandoned'
  | 'quiz_started'
  | 'quiz_completed'
  | 'quiz_failed'
  | 'course_enrolled'
  | 'course_completed'
  | 'time_spent_updated';

export interface IAnalyticsEvent extends Document {
  eventId: string; // Unique identifier for the event
  organizationId: mongoose.Types.ObjectId;
  userId: string; // Lyzr User ID (string, not ObjectId)
  eventType: EventType;
  eventName: string; // Human-readable event name
  properties: Record<string, any>; // Flexible properties object for event-specific data
  timestamp: Date;
  sessionId?: string; // Optional session identifier for grouping related events
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>({
  eventId: { type: String, required: true, unique: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: String, required: true, index: true }, // Lyzr User ID as string
  eventType: {
    type: String,
    required: true,
    enum: [
      'lesson_started',
      'lesson_completed',
      'lesson_abandoned',
      'quiz_started',
      'quiz_completed',
      'quiz_failed',
      'course_enrolled',
      'course_completed',
      'time_spent_updated',
    ],
    index: true,
  },
  eventName: { type: String, required: true },
  properties: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, required: true, index: true },
  sessionId: { type: String, index: true },
}, {
  timestamps: true,
});

// Compound indexes for common query patterns
AnalyticsEventSchema.index({ organizationId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ organizationId: 1, eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });

// Clear cache to use latest schema
if (mongoose.models.AnalyticsEvent) {
  delete mongoose.models.AnalyticsEvent;
}

export default mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
