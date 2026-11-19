import { IAssessmentEntry, IDiagnosticResult } from './diagnostic.types';

export interface IStudentEntity {
  id: string; // USN (e.g. "91325")
  name: string;
  mentorId: string; // e.g. "0001"
  remarks: string;
  history: IAssessmentEntry[];
  analysis?: IDiagnosticResult;
}

export interface IActionTask {
  id: string;
  studentId: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface IGuidanceQuery {
  id: string;
  studentId: string;
  subject: string;
  message: string;
  response: string;
  status: 'Pending' | 'Answered';
}

export interface IDocumentRecord {
  id: string;
  studentId: string;
  studentName: string;
  category: 'Marks Card' | 'Attendance / Medical Proof' | 'Profile & Bio-Data' | 'Project Draft';
  title: string;
  fileName: string;
  fileSize: string;
  date: string;
  verified: boolean;
  notes?: string;
  fileUri?: string;   // <--- Device file path
  mimeType?: string;  // <--- 'image/jpeg', 'application/pdf', etc.
}

export interface IPendingRegistration {
  id: string;
  name: string;
  identifier: string; // USN or Faculty ID
  role: 'student' | 'mentor';
  submittedDate: string;
  email: string;
}