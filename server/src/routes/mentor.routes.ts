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
  updateTaskStatus,
  deleteTask,
  getMentorInquiries,
  replyInquiry,
  deleteInquiry,
} from '../controllers/mentor.controller';
import { taskMemoryUpload } from '../middlewares/upload.middleware';

const router = Router();

// Mentees & Evaluations
router.get('/mentees', getMentees);
router.post('/mentees/:studentId/evaluation', recordEvaluation);
router.put('/mentees/:studentId/remarks', updateRemarks);

// Documents Verification & Permanent Deletion (Mentor Authority)
router.get('/documents', getMentorDocuments);
router.put('/documents/:docId/verify', verifyDocument);
router.delete('/documents/:docId', deleteMentorDocument);

// Remedial Tasks Desk (Supports optional PDF/Image attachment)
router.get('/tasks', getMentorTasks);
router.post('/tasks', taskMemoryUpload.single('file'), createTask);
router.put('/tasks/:taskId', updateTaskStatus);
router.delete('/tasks/:taskId', deleteTask);

// Student Inquiries / Guidance Queries
router.get('/inquiries', getMentorInquiries);
router.put('/inquiries/:queryId/reply', replyInquiry);
router.delete('/inquiries/:queryId', deleteInquiry);

export default router;