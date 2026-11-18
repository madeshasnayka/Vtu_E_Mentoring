import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  studentId: string;
  studentName: string;
  title: string;
  category: string;
  notes?: string;
  dossierSummary?: string;
  dossierSnapshot?: any;
  fileName: string;
  fileSize: string;
  mimeType: string;
  fileUrl: string;
  imagekitFileId?: string;
  verified: boolean;
  date: string;
}

const DocumentSchema = new Schema<IDocument>(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, default: 'Scholar' },
    title: { type: String, required: true },
    category: { type: String, default: 'Marks Card' },
    notes: { type: String, default: '' },
    dossierSummary: { type: String, default: '' },
    dossierSnapshot: { type: Schema.Types.Mixed, default: null },
    fileName: { type: String, default: 'document.pdf' },
    fileSize: { type: String, default: '1.2 MB' },
    mimeType: { type: String, default: 'application/pdf' },
    fileUrl: { type: String, default: '' },
    imagekitFileId: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  },
  { timestamps: true }
);

export const DocumentModel =
  mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
export default DocumentModel;