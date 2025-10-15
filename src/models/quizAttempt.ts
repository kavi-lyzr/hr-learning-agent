import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId; // Denormalized
  organizationId: mongoose.Types.ObjectId; // Denormalized
  attemptNumber: number; // 1, 2, 3, etc.
  answers: Array<{
    questionIndex: number;
    selectedAnswerIndex: number;
    isCorrect: boolean;
  }>;
  score: number; // Percentage 0-100
  passed: boolean;
  timeSpent: number; // Time spent on quiz in seconds
  startedAt: Date;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  attemptNumber: { type: Number, required: true, min: 1 },
  answers: [{
    questionIndex: { type: Number, required: true },
    selectedAnswerIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
  }],
  score: { type: Number, required: true, min: 0, max: 100 },
  passed: { type: Boolean, required: true },
  timeSpent: { type: Number, default: 0 },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date, required: true },
}, {
  timestamps: true,
});

// Compound indexes
QuizAttemptSchema.index({ userId: 1, lessonId: 1, attemptNumber: 1 }, { unique: true });
QuizAttemptSchema.index({ userId: 1, courseId: 1 });
QuizAttemptSchema.index({ organizationId: 1, lessonId: 1 });
QuizAttemptSchema.index({ lessonId: 1, passed: 1 });

// Clear cache
if (mongoose.models.QuizAttempt) {
  delete mongoose.models.QuizAttempt;
}

export default mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
