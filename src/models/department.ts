import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  defaultCourseIds: mongoose.Types.ObjectId[]; // Default courses for new employees
  autoEnroll: boolean; // Auto-enroll new employees in default courses
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  defaultCourseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  autoEnroll: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Compound index for unique department names per organization
DepartmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

// Clear cache
if (mongoose.models.Department) {
  delete mongoose.models.Department;
}

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
