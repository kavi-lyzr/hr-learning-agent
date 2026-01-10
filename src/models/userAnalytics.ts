import mongoose, { Document, Schema } from 'mongoose';

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';
export type EngagementLevel = 'low' | 'medium' | 'high';

export interface IKnowledgeGap {
  moduleId: mongoose.Types.ObjectId;
  moduleTitle: string;
  courseId: mongoose.Types.ObjectId;
  courseTitle: string;
  avgScore: number; // Average score in this module (low score = knowledge gap)
  attemptCount: number; // Number of attempts
}

export interface IActivityHeatmapDay {
  date: Date;
  minutesSpent: number;
}

export interface ILastAccessedCourse {
  courseId: mongoose.Types.ObjectId;
  courseTitle: string;
  lastAccessedAt: Date;
  progressPercentage: number;
}

export interface IUserAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  // Time metrics
  totalTimeSpent: number; // Total minutes spent learning in this period
  // Course metrics
  coursesEnrolled: number; // Courses enrolled in this period
  coursesCompleted: number; // Courses completed in this period
  // Performance metrics
  avgQuizScore: number; // Average quiz score across all attempts
  knowledgeGaps: IKnowledgeGap[]; // Modules where user has low scores
  // Activity tracking
  activityHeatmap: IActivityHeatmapDay[]; // Daily activity breakdown
  engagementLevel: EngagementLevel; // Overall engagement classification
  lastAccessedCourses: ILastAccessedCourse[]; // Recently accessed courses with progress
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeGapSchema = new Schema({
  moduleId: { type: Schema.Types.ObjectId, required: true },
  moduleTitle: { type: String, required: true },
  courseId: { type: Schema.Types.ObjectId, required: true },
  courseTitle: { type: String, required: true },
  avgScore: { type: Number, default: 0 },
  attemptCount: { type: Number, default: 0 },
}, { _id: false });

const ActivityHeatmapDaySchema = new Schema({
  date: { type: Date, required: true },
  minutesSpent: { type: Number, default: 0 },
}, { _id: false });

const LastAccessedCourseSchema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  courseTitle: { type: String, required: true },
  lastAccessedAt: { type: Date, required: true },
  progressPercentage: { type: Number, default: 0 },
}, { _id: false });

const UserAnalyticsSchema = new Schema<IUserAnalytics>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  totalTimeSpent: { type: Number, default: 0 },
  coursesEnrolled: { type: Number, default: 0 },
  coursesCompleted: { type: Number, default: 0 },
  avgQuizScore: { type: Number, default: 0 },
  knowledgeGaps: [KnowledgeGapSchema],
  activityHeatmap: [ActivityHeatmapDaySchema],
  engagementLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  lastAccessedCourses: [LastAccessedCourseSchema],
}, {
  timestamps: true,
});

// Compound indexes for efficient querying
UserAnalyticsSchema.index({ userId: 1, period: 1, startDate: -1 });
UserAnalyticsSchema.index({ organizationId: 1, userId: 1, startDate: 1, endDate: 1 });
UserAnalyticsSchema.index({ userId: 1, startDate: 1, endDate: 1 });

// Clear cache to use latest schema
if (mongoose.models.UserAnalytics) {
  delete mongoose.models.UserAnalytics;
}

export default mongoose.model<IUserAnalytics>('UserAnalytics', UserAnalyticsSchema);
