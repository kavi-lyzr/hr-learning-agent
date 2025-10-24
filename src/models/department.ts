import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  defaultCourseIds: mongoose.Types.ObjectId[]; // Courses auto-assigned to new members
  autoEnroll: boolean; // Whether to auto-enroll new members
  memberCount?: number; // Virtual field for UI
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true,
    minlength: [2, 'Department name must be at least 2 characters'],
    maxlength: [100, 'Department name must be less than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must be less than 500 characters']
  },
  defaultCourseIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Course'
  }],
  autoEnroll: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for organization + name uniqueness
DepartmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

// Index for queries
DepartmentSchema.index({ organizationId: 1, createdAt: -1 });

// Validate that department name is unique within organization (case-insensitive)
DepartmentSchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    const existingDept = await mongoose.model('Department').findOne({
      organizationId: this.organizationId,
      name: { $regex: new RegExp(`^${this.name}$`, 'i') },
      _id: { $ne: this._id }
    });
    
    if (existingDept) {
      throw new Error(`Department "${this.name}" already exists in this organization`);
    }
  }
  next();
});

// Clear cache to use latest schema
if (mongoose.models.Department) {
  delete mongoose.models.Department;
}

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
