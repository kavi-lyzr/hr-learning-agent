import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  lyzrId: string; // From Lyzr OAuth
  email: string;
  name?: string;
  avatarUrl?: string;
  lyzrApiKey: string; // Encrypted
  credits: number;
  lastAccessedOrganization?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: number;
}

const UserSchema = new Schema<IUser>({
  lyzrId: { type: String, required: true, unique: true },
  email: { type: String, required: true, index: true },
  name: { type: String },
  avatarUrl: { type: String },
  lyzrApiKey: { type: String, required: true }, // Stored encrypted
  credits: { type: Number, default: 0 },
  lastAccessedOrganization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  schemaVersion: { type: Number, default: 1 },
}, {
  timestamps: true,
});

// Clear cache to use latest schema
if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model<IUser>('User', UserSchema);
