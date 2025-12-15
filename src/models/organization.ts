import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string; // URL-friendly identifier
  iconUrl?: string;
  ownerId: mongoose.Types.ObjectId; // Reference to User (creator)
  // Lyzr AI Agents (shared by all employees, created after org setup)
  tutorAgent?: {
    agentId: string;
    version: string;
    toolIds?: string[]; // Tool IDs for custom tools
    toolVersion?: string; // Version of tools (for recreation when app URL changes)
  };
  quizGeneratorAgent?: {
    agentId: string;
    version: string;
  };
  contentGeneratorAgent?: {
    agentId: string;
    version: string;
  };
  // Custom course categories (defaults to standard categories if empty)
  courseCategories?: string[];
  // General department (default for employees without department)
  generalDepartment?: {
    courseIds: mongoose.Types.ObjectId[]; // Default courses for all employees
    autoEnroll: boolean; // Auto-enroll all new employees in these courses
  };
  settings: {
    defaultTheme?: string;
    allowEmployeeSelfEnrollment?: boolean;
    requireQuizPassing?: boolean;
    passingScore?: number; // Default: 70
    allowedEmailDomains?: string[]; // Auto-add users with these email domains
  };
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: number;
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  iconUrl: { type: String },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Lyzr AI Agents (created using owner's API key after org creation)
  tutorAgent: {
    agentId: { type: String },
    version: { type: String },
    toolIds: [{ type: String }], // Tool IDs for custom tools
    toolVersion: { type: String }, // Version of tools (for recreation)
  },
  quizGeneratorAgent: {
    agentId: { type: String },
    version: { type: String },
  },
  contentGeneratorAgent: {
    agentId: { type: String },
    version: { type: String },
  },
  // Custom course categories
  courseCategories: [{ type: String }],
  // General department (default for employees without department)
  generalDepartment: {
    courseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    autoEnroll: { type: Boolean, default: true },
  },
  settings: {
    defaultTheme: { type: String, default: 'light' },
    allowEmployeeSelfEnrollment: { type: Boolean, default: false },
    requireQuizPassing: { type: Boolean, default: true },
    passingScore: { type: Number, default: 70 },
    allowedEmailDomains: [{ type: String }], // Auto-add users with these email domains
  },
  schemaVersion: { type: Number, default: 1 },
}, {
  timestamps: true,
});

// Indexes
// Note: slug already has unique: true in schema definition, so no need for explicit index
OrganizationSchema.index({ ownerId: 1 });

// Clear cache
if (mongoose.models.Organization) {
  delete mongoose.models.Organization;
}

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
