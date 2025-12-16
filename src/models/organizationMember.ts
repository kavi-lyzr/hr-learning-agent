import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganizationMember extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // Reference to User (if they've signed up)
  email: string; // Email used for invitation
  name?: string;
  role: 'admin' | 'employee';
  status: 'active' | 'invited' | 'inactive';
  departmentId?: mongoose.Types.ObjectId; // Reference to Department
  assignedCourseIds?: mongoose.Types.ObjectId[]; // Directly assigned courses (for invited members)
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationMemberSchema = new Schema<IOrganizationMember>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, required: true, lowercase: true },
  name: { type: String },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee', required: true },
  status: { type: String, enum: ['active', 'invited', 'inactive'], default: 'invited' },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  assignedCourseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  invitedAt: { type: Date, default: Date.now },
  joinedAt: { type: Date },
}, {
  timestamps: true,
});

// Compound indexes
OrganizationMemberSchema.index({ organizationId: 1, email: 1 }, { unique: true });
OrganizationMemberSchema.index({ organizationId: 1, userId: 1 });
OrganizationMemberSchema.index({ organizationId: 1, role: 1 });
OrganizationMemberSchema.index({ organizationId: 1, departmentId: 1 });

// Clear cache
if (mongoose.models.OrganizationMember) {
  delete mongoose.models.OrganizationMember;
}

export default mongoose.model<IOrganizationMember>('OrganizationMember', OrganizationMemberSchema);
