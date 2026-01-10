import mongoose, { Document, Schema } from 'mongoose';

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

export interface IDropoffPoint {
  lessonId: mongoose.Types.ObjectId;
  lessonTitle: string;
  dropoffCount: number; // Number of users who abandoned at this lesson
  dropoffRate: number; // Percentage of users who dropped off
}

export interface ICourseAnalytics extends Document {
  courseId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  // Enrollment metrics
  enrollmentCount: number; // Total enrollments in this period
  completionCount: number; // Total completions in this period
  completionRate: number; // Percentage (completions / enrollments)
  // Engagement metrics
  avgTimeSpent: number; // Average minutes spent on course
  avgScore: number; // Average quiz score across all attempts
  avgAttemptsToPass: number; // Average number of quiz attempts needed to pass
  avgCompletionTime: number; // Average time to complete course (in days)
  // Drop-off analysis
  dropoffPoints: IDropoffPoint[]; // Lessons where users commonly abandon
  createdAt: Date;
  updatedAt: Date;
}

const DropoffPointSchema = new Schema({
  lessonId: { type: Schema.Types.ObjectId, required: true },
  lessonTitle: { type: String, required: true },
  dropoffCount: { type: Number, default: 0 },
  dropoffRate: { type: Number, default: 0 },
}, { _id: false });

const CourseAnalyticsSchema = new Schema<ICourseAnalytics>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  enrollmentCount: { type: Number, default: 0 },
  completionCount: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },
  avgTimeSpent: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  avgAttemptsToPass: { type: Number, default: 0 },
  avgCompletionTime: { type: Number, default: 0 },
  dropoffPoints: [DropoffPointSchema],
}, {
  timestamps: true,
});

// Compound indexes for efficient querying
CourseAnalyticsSchema.index({ courseId: 1, period: 1, startDate: -1 });
CourseAnalyticsSchema.index({ organizationId: 1, courseId: 1, startDate: 1, endDate: 1 });
CourseAnalyticsSchema.index({ courseId: 1, startDate: 1, endDate: 1 });

// Clear cache to use latest schema
if (mongoose.models.CourseAnalytics) {
  delete mongoose.models.CourseAnalytics;
}

export default mongoose.model<ICourseAnalytics>('CourseAnalytics', CourseAnalyticsSchema);
