import mongoose, { Document, Schema } from 'mongoose';

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

export interface ICourseAggregation {
  courseId: mongoose.Types.ObjectId;
  courseName: string;
  enrollmentCount: number;
  completionCount: number;
  completionRate: number; // Percentage
  avgTimeSpent: number; // In minutes
  avgScore: number; // Average quiz score
}

export interface IUserAggregation {
  userId: mongoose.Types.ObjectId;
  userName: string;
  totalTimeSpent: number; // In minutes
  coursesEnrolled: number;
  coursesCompleted: number;
  avgQuizScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
}

export interface IOrganizationAnalytics extends Document {
  organizationId: mongoose.Types.ObjectId;
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  // Overall metrics
  totalTimeSpent: number; // Total minutes spent by all users
  avgTimeSpent: number; // Average minutes per active user
  activeUsers: number; // Count of users who had activity
  totalEngagements: number; // Total number of learning events
  avgLearningProgress: number; // Average progress percentage across all enrollments
  avgQuizScore: number; // Average quiz score across all attempts
  coursesCompleted: number; // Total courses completed in this period
  // Course-level aggregations
  courseAggregations: ICourseAggregation[];
  // User-level aggregations
  userAggregations: IUserAggregation[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseAggregationSchema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String, required: true },
  enrollmentCount: { type: Number, default: 0 },
  completionCount: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },
  avgTimeSpent: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
}, { _id: false });

const UserAggregationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  totalTimeSpent: { type: Number, default: 0 },
  coursesEnrolled: { type: Number, default: 0 },
  coursesCompleted: { type: Number, default: 0 },
  avgQuizScore: { type: Number, default: 0 },
  engagementLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
}, { _id: false });

const OrganizationAnalyticsSchema = new Schema<IOrganizationAnalytics>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  totalTimeSpent: { type: Number, default: 0 },
  avgTimeSpent: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  totalEngagements: { type: Number, default: 0 },
  avgLearningProgress: { type: Number, default: 0 },
  avgQuizScore: { type: Number, default: 0 },
  coursesCompleted: { type: Number, default: 0 },
  courseAggregations: [CourseAggregationSchema],
  userAggregations: [UserAggregationSchema],
}, {
  timestamps: true,
});

// Compound indexes for efficient querying
OrganizationAnalyticsSchema.index({ organizationId: 1, period: 1, startDate: -1 });
OrganizationAnalyticsSchema.index({ organizationId: 1, startDate: 1, endDate: 1 });

// Clear cache to use latest schema
if (mongoose.models.OrganizationAnalytics) {
  delete mongoose.models.OrganizationAnalytics;
}

export default mongoose.model<IOrganizationAnalytics>('OrganizationAnalytics', OrganizationAnalyticsSchema);
