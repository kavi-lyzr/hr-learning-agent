import mongoose, { Document, Schema } from 'mongoose';

export interface IEnrollment extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId; // Denormalized
  status: 'not-started' | 'in-progress' | 'completed';
  progressPercentage: number; // 0-100
  progress: {
    completedLessonIds: mongoose.Types.ObjectId[];
    currentLessonId?: mongoose.Types.ObjectId;
  };
  enrolledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
  progress: {
    completedLessonIds: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    currentLessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  },
  enrolledAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date },
}, {
  timestamps: true,
});

// Compound indexes
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
EnrollmentSchema.index({ organizationId: 1, userId: 1 });
EnrollmentSchema.index({ organizationId: 1, courseId: 1 });
EnrollmentSchema.index({ userId: 1, status: 1 });

// Clear cache
if (mongoose.models.Enrollment) {
  delete mongoose.models.Enrollment;
}

export default mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
