import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  identifier: string; // Holds USN or Admission No for students; Faculty ID for mentors
  phone?: string;
  password?: string;
  passwordHash?: string;
  role: 'admin' | 'mentor' | 'student';
  designation?: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    identifier: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    password: { type: String, select: false },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ['admin', 'mentor', 'student'], default: 'student' },
    designation: { type: String, default: '' },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>('User', UserSchema);

export { User };
export default User;