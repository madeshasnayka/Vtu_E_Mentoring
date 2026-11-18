import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  studentId: string;
  mentorId?: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'Pending' | 'Completed';
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    studentId: { type: String, required: true, trim: true },
    mentorId: { type: String, default: '', trim: true },
    title: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    dueDate: { type: String, default: 'Next Session' },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  },
  { timestamps: true }
);

const Task = mongoose.model<ITask>('Task', TaskSchema);

export { Task };
export default Task;