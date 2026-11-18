import { Router } from 'express';
import {
  getStudents,
  getMentors,
  createMentor,
  getPendingApprovals,
  approveUser,
  rejectUser,
  getSystemConfig,
  updateSystemConfig,
  addBatchYear,
  assignStudents,
  batchAdmitStudents,
  assignOfficialUsn,
  getInstitutionalReport,
} from '../controllers/admin.controller';

const router = Router();

// Students & Mentors
router.get('/students', getStudents);
router.get('/mentors', getMentors);
router.post('/mentors', createMentor);

// Self-Registration Approvals
router.get('/approvals', getPendingApprovals);
router.put('/approvals/:userId/approve', approveUser);
router.delete('/approvals/:userId/reject', rejectUser);

// System Threshold Config & Custom Academic Batch Years
router.get('/config', getSystemConfig);
router.put('/config', updateSystemConfig);
router.post('/batches', addBatchYear);

// Batch Operations: Pre-Admit, Re-Allot, Issue USN, & Rankings Report
router.post('/batch/admit', batchAdmitStudents);
router.put('/students/assign', assignStudents);
router.put('/students/:studentId/assign-usn', assignOfficialUsn);
router.get('/report', getInstitutionalReport);

export default router;