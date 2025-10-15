import mongoose, { Document, Schema } from 'mongoose';

export interface ILessonProgress extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId; // Denormalized
  status: 'not-started' | 'in-progress' | 'completed';
  watchTime?: number; // For videos, in seconds
  scrollDepth?: number; // For articles, percentage 0-100
  timeSpent: number; // Total time spent in seconds
  lastAccessedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LessonProgressSchema = new Schema<ILessonProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  watchTime: { type: Number, default: 0 },
  scrollDepth: { type: Number, default: 0, min: 0, max: 100 },
  timeSpent: { type: Number, default: 0 },
  lastAccessedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
}, {
  timestamps: true,
});

// Compound indexes
LessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
LessonProgressSchema.index({ userId: 1, courseId: 1 });
LessonProgressSchema.index({ lessonId: 1, status: 1 });

// Clear cache
if (mongoose.models.LessonProgress) {
  delete mongoose.models.LessonProgress;
}

export default mongoose.model<ILessonProgress>('LessonProgress', LessonProgressSchema);
