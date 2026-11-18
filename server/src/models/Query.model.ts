import mongoose, { Schema, Document } from 'mongoose';

export interface IInquiryEntity extends Document {
  studentId: string;
  studentName?: string;
  subject: string;
  message: string;
  response?: string;
  status: 'Pending' | 'Answered';
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiryEntity>(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, default: 'Scholar' },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    response: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Answered'], default: 'Pending' },
  },
  { timestamps: true }
);

export const InquiryModel = mongoose.model<IInquiryEntity>('Inquiry', InquirySchema);
export default InquiryModel;