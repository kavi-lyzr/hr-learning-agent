import mongoose, { Document, Schema } from 'mongoose';

export interface IModule extends Document {
  courseId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId; // Denormalized for efficient querying
  title: string;
  description?: string;
  order: number; // Position in course
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ModuleSchema = new Schema<IModule>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
}, {
  timestamps: true,
});

// Compound indexes
ModuleSchema.index({ courseId: 1, order: 1 });
ModuleSchema.index({ organizationId: 1, courseId: 1 });

// Clear cache
if (mongoose.models.Module) {
  delete mongoose.models.Module;
}

export default mongoose.model<IModule>('Module', ModuleSchema);
