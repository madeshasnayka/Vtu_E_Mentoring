import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import StudentModel from '../models/Student.model';
import UserModel from '../models/User.model';
import DocumentModel from '../models/Document.model';
import TaskModel from '../models/Task.model';
import QueryModel from '../models/Query.model';
import {
  uploadStudentDocument,
  getStudentDocuments,
  removeDocument,
} from '../controllers/document.controller';

const Student: any = (StudentModel as any)?.default || StudentModel;
const User: any = (UserModel as any)?.default || UserModel;
const DocModel: any = (DocumentModel as any)?.default || DocumentModel;
const Task: any = (TaskModel as any)?.default || TaskModel;
const Query: any = (QueryModel as any)?.default || QueryModel;

const router = Router();

// Attach decoded JWT user if Authorization header is present (non-blocking)
const attachUserIfPresent = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'vtu_mentoring_secret_key'
      );
      (req as any).user = decoded;
    }
  } catch {
    // Allow fallback to explicit studentId/usn params if token is absent/expired
  }
  next();
};

router.use(attachUserIfPresent);

// Memory storage so req.file.buffer streams directly to ImageKit Cloud
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max PDF/Image
});

// ============================================================================
// 1. STUDENT PROFILE & DIAGNOSTICS (Strips Placeholder Scores When Unevaluated)
// ============================================================================
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const usn = String(
      req.query.usn || (req as any).user?.identifier || ''
    )
      .trim()
      .toUpperCase();

    const query = usn ? { usn } : {};
    const student: any = await Student.findOne(query).lean();
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const history = Array.isArray(student.history) ? student.history : [];
    const hasEvaluations = history.length > 0;
    const lastEntry = hasEvaluations ? history[history.length - 1] : null;

    const cleanMarks = hasEvaluations
      ? Number(lastEntry?.marks ?? student.currentMarks ?? 0)
      : null;
    const cleanAttendance = hasEvaluations
      ? Number(lastEntry?.attendance ?? student.currentAttendance ?? 0)
      : null;
    const cleanTotal =
      hasEvaluations && cleanMarks !== null && cleanAttendance !== null
        ? Number((0.6 * cleanMarks + 0.4 * cleanAttendance).toFixed(2))
        : null;

    const rawMentorId = String(student.mentorId || '').trim();
    let resolvedMentorName = 'No Mentor';
    if (rawMentorId && rawMentorId.toUpperCase() !== 'UNASSIGNED') {
      const mentorUser: any = await User.findOne({ identifier: rawMentorId }).lean();
      resolvedMentorName =
        mentorUser?.name ||
        student.mentorName ||
        (rawMentorId === '0001' ? 'Dr. Kumar P K' : `Faculty (${rawMentorId})`);
    }

    return res.status(200).json({
      student: {
        ...student,
        mentorId: rawMentorId,
        mentorName: resolvedMentorName,
        history,
        hasEvaluations,
        currentMarks: cleanMarks,
        currentAttendance: cleanAttendance,
        dynamicTotal: cleanTotal,
        riskLevel: hasEvaluations ? student.riskLevel || 'Competent' : 'Not Uploaded',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 2. DOCUMENTS & IMAGEKIT CLOUD UPLOAD
// ============================================================================
router.get('/documents', getStudentDocuments);
router.post('/documents', memoryUpload.single('file'), uploadStudentDocument);
router.delete('/documents/:docId', removeDocument);

// ============================================================================
// 3. 5-TAB VTU MENTORSHIP DOSSIER SYNC
// ============================================================================
router.get('/dossier/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.studentId || '')
      .trim()
      .toUpperCase();
    const student = await Student.findOne({ usn: studentId }).lean();
    return res.status(200).json({
      student: student || null,
      dossier: student?.dossier || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/dossier/:studentId/upload', async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.studentId || '')
      .trim()
      .toUpperCase();
    const {
      name,
      dossier,
      documentTitle,
      category = 'Marks Card',
      fileName = 'document.pdf',
      notes = '',
      skipDocCreate = false,
    } = req.body;

    const student = await Student.findOneAndUpdate(
      { usn: studentId },
      {
        $set: {
          ...(name ? { name: String(name).trim() } : {}),
          ...(dossier ? { dossier } : {}),
        },
      },
      { returnDocument: 'after' }
    );

    if (skipDocCreate) {
      await DocModel.findOneAndUpdate(
        { studentId },
        {
          $set: {
            dossierSnapshot: dossier || null,
            dossierSummary: notes,
          },
        },
        { sort: { createdAt: -1 } }
      );
    } else if (documentTitle) {
      await DocModel.create({
        studentId,
        studentName: name || student?.name || 'Scholar',
        title: documentTitle,
        category,
        fileName,
        notes,
        dossierSummary: notes,
        dossierSnapshot: dossier || null,
        verified: false,
        date: new Date().toISOString().split('T')[0],
      });
    }

    return res.status(200).json({
      message: 'VTU Mentorship Dossier synced successfully.',
      student,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 4. STUDENT ASSIGNED ACTION TASKS (NO STUDENT REVOKE ONCE COMPLETED)
// ============================================================================
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const usn = String(
      req.query.studentId || (req as any).user?.identifier || ''
    )
      .trim()
      .toUpperCase();
    const filter = usn ? { studentId: usn } : {};
    const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json(tasks);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/tasks/:taskId/toggle', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    const requestedStatus = req.body?.status;
    task.status =
      requestedStatus || (task.status === 'Completed' ? 'Pending' : 'Completed');
    await task.save();
    return res.status(200).json({ task });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 5. STUDENT GUIDANCE INQUIRIES
// ============================================================================
router.get('/inquiries', async (req: Request, res: Response) => {
  try {
    const usn = String(
      req.query.studentId || (req as any).user?.identifier || ''
    )
      .trim()
      .toUpperCase();
    const filter = usn ? { studentId: usn } : {};
    const queries = await Query.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json(queries);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/inquiries', async (req: Request, res: Response) => {
  try {
    const usn = String(
      req.body.studentId || (req as any).user?.identifier || ''
    )
      .trim()
      .toUpperCase();
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required.' });
    }
    const query = await Query.create({
      studentId: usn,
      subject: String(subject).trim(),
      message: String(message).trim(),
      status: 'Pending',
    });
    return res.status(201).json({ query });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;