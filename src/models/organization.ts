import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string; // URL-friendly identifier
  iconUrl?: string;
  ownerId: mongoose.Types.ObjectId; // Reference to User (creator)
  // Lyzr AI Agents (shared by all employees)
  tutorAgent: {
    agentId: string;
    version: string;
  };
  quizGeneratorAgent: {
    agentId: string;
    version: string;
  };
  contentGeneratorAgent: {
    agentId: string;
    version: string;
  };
  settings: {
    defaultTheme?: string;
    allowEmployeeSelfEnrollment?: boolean;
    requireQuizPassing?: boolean;
    passingScore?: number; // Default: 70
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
  // Lyzr AI Agents (created using owner's API key)
  tutorAgent: {
    agentId: { type: String, required: true },
    version: { type: String, required: true },
  },
  quizGeneratorAgent: {
    agentId: { type: String, required: true },
    version: { type: String, required: true },
  },
  contentGeneratorAgent: {
    agentId: { type: String, required: true },
    version: { type: String, required: true },
  },
  settings: {
    defaultTheme: { type: String, default: 'light' },
    allowEmployeeSelfEnrollment: { type: Boolean, default: false },
    requireQuizPassing: { type: Boolean, default: true },
    passingScore: { type: Number, default: 70 },
  },
  schemaVersion: { type: Number, default: 1 },
}, {
  timestamps: true,
});

// Indexes
OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ ownerId: 1 });

// Clear cache
if (mongoose.models.Organization) {
  delete mongoose.models.Organization;
}

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
