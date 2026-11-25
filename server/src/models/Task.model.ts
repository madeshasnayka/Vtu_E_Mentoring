import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskAttachment {
  fileName: string;
  fileUrl: string;
  fileId?: string;
  mimeType: string;
  fileSize?: string;
}

export interface ITaskSubmission {
  remarks?: string;
  submittedAt: Date;
  fileName?: string;
  fileUrl?: string;
  fileId?: string;
  mimeType?: string;
  fileSize?: string;
}

export interface ITask extends Document {
  studentId: string;
  mentorId?: string;
  title: string;
  description?: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'Pending' | 'Completed';
  referenceFile?: ITaskAttachment | null;
  submission?: ITaskSubmission | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskAttachmentSchema = new Schema<ITaskAttachment>(
  {
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileId: { type: String, default: '' },
    mimeType: { type: String, default: 'application/pdf' },
    fileSize: { type: String, default: '' },
  },
  { _id: false }
);

const TaskSubmissionSchema = new Schema<ITaskSubmission>(
  {
    remarks: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    fileName: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    fileId: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: String, default: '' },
  },
  { _id: false }
);

const TaskSchema = new Schema<ITask>(
  {
    studentId: { type: String, required: true, trim: true },
    mentorId: { type: String, default: '', trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    dueDate: { type: String, default: 'Next Session' },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    referenceFile: { type: TaskAttachmentSchema, default: null },
    submission: { type: TaskSubmissionSchema, default: null },
  },
  { timestamps: true }
);

const Task = mongoose.model<ITask>('Task', TaskSchema);
export { Task };
export default Task;