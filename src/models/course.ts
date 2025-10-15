import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: 'onboarding' | 'technical' | 'sales' | 'soft-skills' | 'compliance' | 'other';
  thumbnailUrl?: string;
  status: 'draft' | 'published' | 'archived';
  estimatedDuration: number; // in minutes
  createdBy: mongoose.Types.ObjectId; // User who created
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ['onboarding', 'technical', 'sales', 'soft-skills', 'compliance', 'other'],
    default: 'other'
  },
  thumbnailUrl: { type: String },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  estimatedDuration: { type: Number, default: 0 }, // Auto-calculated from modules/lessons
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Indexes
CourseSchema.index({ organizationId: 1, status: 1 });
CourseSchema.index({ organizationId: 1, category: 1 });

// Clear cache
if (mongoose.models.Course) {
  delete mongoose.models.Course;
}

export default mongoose.model<ICourse>('Course', CourseSchema);
