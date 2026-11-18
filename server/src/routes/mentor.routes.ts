import { Router } from 'express';
import {
  getMentees,
  recordEvaluation,
  updateRemarks,
  getMentorDocuments,
  verifyDocument,
  deleteMentorDocument,
  getMentorTasks,
  createTask,
  deleteTask,
  getMentorInquiries,
  replyInquiry,
  deleteInquiry,
} from '../controllers/mentor.controller';

const router = Router();

// Mentees & Evaluations
router.get('/mentees', getMentees);
router.post('/mentees/:studentId/evaluation', recordEvaluation);
router.put('/mentees/:studentId/remarks', updateRemarks);

// Documents Verification & Permanent Deletion (Mentor Authority)
router.get('/documents', getMentorDocuments);
router.put('/documents/:docId/verify', verifyDocument);
router.delete('/documents/:docId', deleteMentorDocument);

// Remedial Tasks Desk
router.get('/tasks', getMentorTasks);
router.post('/tasks', createTask);
router.delete('/tasks/:taskId', deleteTask);

// Student Inquiries / Guidance Queries
router.get('/inquiries', getMentorInquiries);
router.put('/inquiries/:queryId/reply', replyInquiry);
router.delete('/inquiries/:queryId', deleteInquiry);

export default router;