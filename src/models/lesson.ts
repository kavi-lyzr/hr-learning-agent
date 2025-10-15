import mongoose, { Document, Schema } from 'mongoose';

export interface ILesson extends Document {
  moduleId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId; // Denormalized
  organizationId: mongoose.Types.ObjectId; // Denormalized
  title: string;
  description?: string;
  contentType: 'video' | 'article';
  contentData: {
    // For video
    videoUrl?: string; // YouTube URL
    videoDuration?: number; // in seconds
    transcript?: string;
    // For article
    articleHtml?: string;
    wordCount?: number;
  };
  order: number; // Position in module
  estimatedTime: number; // in minutes
  hasQuiz: boolean;
  quizData?: {
    questions: Array<{
      questionText: string;
      options: string[]; // 4 options
      correctAnswerIndex: number; // 0-3
      explanation: string;
    }>;
    passingScore: number; // Default: 70
  };
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ILesson>({
  moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  contentType: { type: String, enum: ['video', 'article'], required: true },
  contentData: {
    videoUrl: { type: String },
    videoDuration: { type: Number },
    transcript: { type: String },
    articleHtml: { type: String },
    wordCount: { type: Number },
  },
  order: { type: Number, required: true, default: 0 },
  estimatedTime: { type: Number, default: 0 }, // Auto-calculated
  hasQuiz: { type: Boolean, default: false },
  quizData: {
    questions: [{
      questionText: { type: String, required: true },
      options: [{ type: String, required: true }], // Array of 4 strings
      correctAnswerIndex: { type: Number, required: true, min: 0, max: 3 },
      explanation: { type: String, required: true },
    }],
    passingScore: { type: Number, default: 70 },
  },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
}, {
  timestamps: true,
});

// Compound indexes
LessonSchema.index({ moduleId: 1, order: 1 });
LessonSchema.index({ courseId: 1 });
LessonSchema.index({ organizationId: 1, moduleId: 1 });

// Clear cache
if (mongoose.models.Lesson) {
  delete mongoose.models.Lesson;
}

export default mongoose.model<ILesson>('Lesson', LessonSchema);
