import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentSession extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: string; // Lyzr session ID
  agentType: 'tutor' | 'content-generator' | 'quiz-generator';
  context: {
    organizationId?: mongoose.Types.ObjectId;
    courseId?: mongoose.Types.ObjectId;
    moduleId?: mongoose.Types.ObjectId;
    lessonId?: mongoose.Types.ObjectId;
    currentPage?: string; // 'dashboard', 'course-view', 'lesson-view', etc.
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    attachments?: Array<{
      name: string;
      type: string;
      size: number;
      assetId: string;
    }>;
  }>;
  isActive: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSessionSchema = new Schema<IAgentSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: String, required: true, unique: true },
  agentType: {
    type: String,
    enum: ['tutor', 'content-generator', 'quiz-generator'],
    required: true
  },
  context: {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    currentPage: { type: String },
  },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    attachments: [{
      name: { type: String },
      type: { type: String },
      size: { type: Number },
      assetId: { type: String },
    }],
  }],
  isActive: { type: Boolean, default: true },
  lastMessageAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Indexes
AgentSessionSchema.index({ userId: 1, agentType: 1 });
AgentSessionSchema.index({ sessionId: 1 }, { unique: true });
AgentSessionSchema.index({ userId: 1, isActive: 1, lastMessageAt: -1 });

// Clear cache
if (mongoose.models.AgentSession) {
  delete mongoose.models.AgentSession;
}

export default mongoose.model<IAgentSession>('AgentSession', AgentSessionSchema);
