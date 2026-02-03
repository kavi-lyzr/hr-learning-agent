import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ICertificate extends Document {
  // Unique public ID for sharing (URL-friendly)
  certificateId: string;

  // References
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;

  // Snapshot data (for display - captures state at time of issue)
  userName: string;
  userAvatarUrl?: string;
  courseTitle: string;
  organizationName: string;
  organizationIconUrl?: string;

  // Course structure snapshot (for validity checking)
  totalLessonsAtIssue: number;
  totalModulesAtIssue: number;

  // Dates
  issuedAt: Date;
  completedAt: Date;

  // Validity
  isValid: boolean;
  invalidatedAt?: Date;
  invalidationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>({
  certificateId: {
    type: String,
    unique: true,
    required: true,
    default: () => uuidv4().replace(/-/g, '').slice(0, 12) // Short, URL-friendly ID
  },

  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true, unique: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },

  userName: { type: String, required: true },
  userAvatarUrl: { type: String },
  courseTitle: { type: String, required: true },
  organizationName: { type: String, required: true },
  organizationIconUrl: { type: String },

  totalLessonsAtIssue: { type: Number, required: true },
  totalModulesAtIssue: { type: Number, required: true },

  issuedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, required: true },

  isValid: { type: Boolean, default: true },
  invalidatedAt: { type: Date },
  invalidationReason: { type: String },
}, {
  timestamps: true,
});

// Indexes
CertificateSchema.index({ certificateId: 1 }, { unique: true });
CertificateSchema.index({ userId: 1, courseId: 1 });
CertificateSchema.index({ organizationId: 1, issuedAt: -1 });

// Clear cache
if (mongoose.models.Certificate) {
  delete mongoose.models.Certificate;
}

export default mongoose.model<ICertificate>('Certificate', CertificateSchema);
