import { Request, Response } from 'express';
import StudentModel from '../models/Student.model';
import TaskModel from '../models/Task.model';
import DocumentModel from '../models/Document.model';
import QueryModel from '../models/Query.model';
import UserModel from '../models/User.model';
import {
  uploadBufferToImageKit,
  deleteFromImageKit,
} from '../services/imagekit.service';
import { formatBytes } from '../middlewares/upload.middleware';

const Student: any = (StudentModel as any)?.default || StudentModel;
const Task: any = (TaskModel as any)?.default || TaskModel;
const Document: any = (DocumentModel as any)?.default || DocumentModel;
const Inquiry: any = (QueryModel as any)?.default || QueryModel;
const User: any = (UserModel as any)?.default || UserModel;

const getMentorQueryFilter = async (req: Request) => {
  let mentorId = req.query.mentorId ? String(req.query.mentorId).trim() : '';
  if (!mentorId && (req as any).user) {
    mentorId = String(
      (req as any).user.identifier || (req as any).user.id || ''
    ).trim();
  }
  if (!mentorId || mentorId === 'ALL') return {};

  const mentorUser = await User.findOne({
    $or: [
      { identifier: mentorId },
      { _id: mentorId.match(/^[0-9a-fA-F]{24}$/) ? mentorId : null },
    ],
  }).lean();

  const mentorName = mentorUser?.name || '';
  const possibleValues: any[] = [mentorId];

  if (!isNaN(Number(mentorId))) {
    const numVal = Number(mentorId);
    possibleValues.push(numVal);
    possibleValues.push(String(numVal));
    possibleValues.push(String(numVal).padStart(4, '0'));
  }
  if (mentorName) possibleValues.push(mentorName);

  return {
    $or: [
      { mentorId: { $in: possibleValues } },
      { mentorName: { $regex: new RegExp(`^${mentorId}$`, 'i') } },
      ...(mentorName
        ? [{ mentorName: { $regex: new RegExp(mentorName, 'i') } }]
        : []),
    ],
  };
};

// ============================================================================
// 1. GET ALLOCATED MENTEES FOR MENTOR
// ============================================================================
export const getMentees = async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? String(req.query.year).trim() : undefined;
    const mentorFilter = await getMentorQueryFilter(req);
    const query: any = { ...mentorFilter, isApproved: true };
    if (year && year !== 'ALL') {
      query.admissionYear = year;
    }
    const mentees = await Student.find(query).sort({ usn: 1 }).lean();
    return res.status(200).json(mentees || []);
  } catch (error: any) {
    console.error('[Mentor getMentees Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to fetch mentees: ${error.message}` });
  }
};

// ============================================================================
// 2. RECORD STUDENT EVALUATION (Marks & Attendance)
// ============================================================================
export const recordEvaluation = async (req: Request, res: Response) => {
  try {
    const rawStudentId = req.params.studentId;
    const studentId = Array.isArray(rawStudentId)
      ? rawStudentId[0]
      : rawStudentId;
    const { term, marks, attendance, rawMarks, rawAttendance } = req.body;

    if (!studentId || !term || marks === undefined || attendance === undefined) {
      return res.status(400).json({ error: 'Missing evaluation parameters.' });
    }

    const cleanStudentId = studentId ? String(studentId).trim() : '';
    const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(cleanStudentId);

    const student = await Student.findOne({
      $or: [
        { usn: cleanStudentId },
        { tempAdmissionNo: cleanStudentId },
        ...(isValidMongoId ? [{ _id: cleanStudentId }] : []),
      ],
    });

    if (!student) {
      return res.status(404).json({ error: 'Scholar record not found.' });
    }

    if (!Array.isArray(student.history)) {
      student.history = [];
    }

    const existingIndex = student.history.findIndex((h: any) => h.term === term);
    const historyEntry = {
      term,
      marks: Number(marks),
      attendance: Number(attendance),
      rawMarks: rawMarks || { obtained: marks, total: 10 },
      rawAttendance: rawAttendance || { attended: attendance, total: 10 },
      date: new Date(),
    };

    if (existingIndex >= 0) {
      student.history[existingIndex] = historyEntry;
    } else {
      student.history.push(historyEntry);
    }

    student.currentMarks = Number(marks);
    student.currentAttendance = Number(attendance);
    student.dynamicTotal = Number(
      (0.6 * Number(marks) + 0.4 * Number(attendance)).toFixed(2)
    );

    if (student.dynamicTotal < 6.0) {
      student.riskLevel = 'At Risk';
    } else if (student.dynamicTotal < 7.5) {
      student.riskLevel = 'Moderate Watch';
    } else {
      student.riskLevel = 'Satisfactory';
    }

    if (!student.email) {
      student.email = `${String(student.usn).toLowerCase()}@vtu.ac.in`;
    }

    await student.save();
    return res.status(200).json({
      message: `Evaluation recorded successfully for Term ${term}.`,
      student,
    });
  } catch (error: any) {
    console.error('[Mentor recordEvaluation Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to record evaluation: ${error.message}` });
  }
};

// ============================================================================
// 3. UPDATE COUNSELING REMARKS
// ============================================================================
export const updateRemarks = async (req: Request, res: Response) => {
  try {
    const rawStudentId = req.params.studentId;
    const studentId = Array.isArray(rawStudentId)
      ? rawStudentId[0]
      : rawStudentId;
    const { remarks } = req.body;

    const student = await Student.findOneAndUpdate(
      { $or: [{ usn: studentId }, { tempAdmissionNo: studentId }] },
      { $set: { remarks: remarks || '' } },
      { new: true, runValidators: false }
    );

    if (!student) {
      return res.status(404).json({ error: 'Scholar not found.' });
    }

    return res
      .status(200)
      .json({ message: 'Counseling remarks updated successfully.', student });
  } catch (error: any) {
    console.error('[Mentor updateRemarks Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to update remarks: ${error.message}` });
  }
};

// ============================================================================
// 4. GET DOCUMENTS FOR MENTOR'S STUDENTS
// ============================================================================
export const getMentorDocuments = async (req: Request, res: Response) => {
  try {
    const mentorFilter = await getMentorQueryFilter(req);
    let mentees = await Student.find(
      mentorFilter,
      'usn tempAdmissionNo name dossier mentorId'
    ).lean();

    if (!mentees || mentees.length === 0) {
      mentees = await Student.find(
        {},
        'usn tempAdmissionNo name dossier mentorId'
      ).lean();
    }

    const studentIds = (mentees || [])
      .flatMap((s: any) => [s.usn, s.tempAdmissionNo])
      .filter(Boolean);

    const dossierByStudentId: Record<string, any> = {};
    (mentees || []).forEach((s: any) => {
      if (s.usn) dossierByStudentId[s.usn] = s.dossier || null;
      if (s.tempAdmissionNo)
        dossierByStudentId[s.tempAdmissionNo] = s.dossier || null;
    });

    const rawMentorId = req.query.mentorId
      ? String(req.query.mentorId).trim()
      : '';
    const mentorIdVariants = rawMentorId
      ? [
          rawMentorId,
          String(Number(rawMentorId)),
          String(Number(rawMentorId)).padStart(4, '0'),
        ]
      : [];

    let documents = await Document.find(
      studentIds.length > 0 || mentorIdVariants.length > 0
        ? {
            $or: [
              ...(studentIds.length > 0
                ? [{ studentId: { $in: studentIds } }]
                : []),
              ...(mentorIdVariants.length > 0
                ? [{ mentorId: { $in: mentorIdVariants } }]
                : []),
            ],
          }
        : {}
    )
      .sort({ createdAt: -1 })
      .lean();

    if (!documents || documents.length === 0) {
      documents = await Document.find({}).sort({ createdAt: -1 }).lean();
    }

    const enriched = (documents || []).map((d: any) => ({
      ...d,
      id: String(d._id),
      date:
        d.date ||
        (d.createdAt
          ? new Date(d.createdAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]),
      dossierSnapshot:
        d.dossierSnapshot || dossierByStudentId[d.studentId] || null,
    }));

    return res.status(200).json(enriched);
  } catch (error: any) {
    console.error('[Mentor getMentorDocuments Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to fetch documents: ${error.message}` });
  }
};

// ============================================================================
// 5. VERIFY & PERMANENTLY DELETE DOCUMENT (MENTOR ONLY)
// ============================================================================
export const verifyDocument = async (req: Request, res: Response) => {
  try {
    const rawDocId = req.params.docId;
    const docId = Array.isArray(rawDocId) ? rawDocId[0] : rawDocId;
    const doc = await Document.findById(docId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    doc.verified = !doc.verified;
    await doc.save();

    return res
      .status(200)
      .json({ message: 'Document verification status toggled.', doc });
  } catch (error: any) {
    console.error('[Mentor verifyDocument Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to verify document: ${error.message}` });
  }
};

export const deleteMentorDocument = async (req: Request, res: Response) => {
  try {
    const rawDocId = req.params.docId;
    const docId = Array.isArray(rawDocId) ? rawDocId[0] : rawDocId;

    if (docId && /^[0-9a-fA-F]{24}$/.test(String(docId))) {
      const deleted = await Document.findByIdAndDelete(docId);
      if (!deleted) {
        return res.status(404).json({ error: 'Document record not found.' });
      }
    }

    return res.status(200).json({
      message: 'Document permanently deleted from institutional archive.',
      deletedId: docId,
    });
  } catch (error: any) {
    console.error('[Mentor deleteMentorDocument Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to delete document: ${error.message}` });
  }
};

// ============================================================================
// 6. GET TASKS FOR MENTOR'S STUDENTS
// ============================================================================
export const getMentorTasks = async (req: Request, res: Response) => {
  try {
    const mentorFilter = await getMentorQueryFilter(req);
    const mentees = await Student.find(
      mentorFilter,
      'usn tempAdmissionNo'
    ).lean();
    const studentIds = (mentees || [])
      .flatMap((s: any) => [s.usn, s.tempAdmissionNo])
      .filter(Boolean);

    const tasks = await Task.find({
      $or: [
        { studentId: { $in: studentIds } },
        { mentorId: req.query.mentorId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(tasks || []);
  } catch (error: any) {
    console.error('[Mentor getMentorTasks Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to fetch tasks: ${error.message}` });
  }
};

// ============================================================================
// 7. CREATE ACTION TASK FOR MENTEE (Supports optional PDF/Image reference)
// ============================================================================
export const createTask = async (req: Request, res: Response) => {
  try {
    const { studentId, title, description, priority, dueDate, mentorId } =
      req.body;
    if (!studentId || !title) {
      return res
        .status(400)
        .json({ error: 'Student ID and Task Title are required.' });
    }

    let referenceFile = null;
    if (req.file && req.file.buffer) {
      const uploaded = await uploadBufferToImageKit(
        req.file.buffer,
        req.file.originalname,
        '/vtu-mentoring-tasks'
      );
      referenceFile = {
        fileName: req.file.originalname,
        fileUrl: uploaded.url,
        fileId: uploaded.fileId,
        mimeType: req.file.mimetype || 'application/pdf',
        fileSize: formatBytes(uploaded.size || req.file.size),
      };
    }

    const resolvedMentorId =
      mentorId ||
      (req as any).user?.identifier ||
      (req as any).user?.id ||
      '';

    const newTask = await Task.create({
      studentId: String(studentId).trim(),
      mentorId: String(resolvedMentorId).trim(),
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      priority: priority || 'Medium',
      dueDate: dueDate || 'Next Session',
      status: 'Pending',
      referenceFile,
    });

    return res
      .status(201)
      .json({ message: 'Remedial task assigned successfully.', task: newTask });
  } catch (error: any) {
    console.error('[Mentor createTask Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to create task: ${error.message}` });
  }
};

// ============================================================================
// 8. UPDATE TASK STATUS & DELETE TASK (Cleans up ImageKit files)
// ============================================================================
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const rawTaskId = req.params.taskId;
    const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    const requestedStatus = req.body?.status;
    task.status =
      requestedStatus || (task.status === 'Completed' ? 'Pending' : 'Completed');
    await task.save();
    return res.status(200).json({ message: 'Task status updated.', task });
  } catch (error: any) {
    console.error('[Mentor updateTaskStatus Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to update task status: ${error.message}` });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const rawTaskId = req.params.taskId;
    const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;
    const existing = await Task.findByIdAndDelete(taskId);
    if (existing) {
      if (existing.referenceFile?.fileId) {
        await deleteFromImageKit(existing.referenceFile.fileId);
      }
      if (existing.submission?.fileId) {
        await deleteFromImageKit(existing.submission.fileId);
      }
    }
    return res.status(200).json({ message: 'Task removed successfully.' });
  } catch (error: any) {
    console.error('[Mentor deleteTask Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to delete task: ${error.message}` });
  }
};

// ============================================================================
// 9. GET INQUIRIES / GUIDANCE QUERIES
// ============================================================================
export const getMentorInquiries = async (req: Request, res: Response) => {
  try {
    const mentorFilter = await getMentorQueryFilter(req);
    const mentees = await Student.find(
      mentorFilter,
      'usn tempAdmissionNo'
    ).lean();
    const studentIds = (mentees || [])
      .flatMap((s: any) => [s.usn, s.tempAdmissionNo])
      .filter(Boolean);

    const queries = await Inquiry.find({
      $or: [
        { studentId: { $in: studentIds } },
        { mentorId: req.query.mentorId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(queries || []);
  } catch (error: any) {
    console.error('[Mentor getMentorInquiries Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to fetch inquiries: ${error.message}` });
  }
};

// ============================================================================
// 10. REPLY TO INQUIRY
// ============================================================================
export const replyInquiry = async (req: Request, res: Response) => {
  try {
    const rawQueryId = req.params.queryId;
    const queryId = Array.isArray(rawQueryId) ? rawQueryId[0] : rawQueryId;
    const { response } = req.body;

    const queryDoc = await Inquiry.findById(queryId);
    if (!queryDoc) return res.status(404).json({ error: 'Inquiry not found.' });

    queryDoc.response = response || '';
    queryDoc.status = 'Answered';
    await queryDoc.save();

    return res
      .status(200)
      .json({ message: 'Mentor response dispatched.', query: queryDoc });
  } catch (error: any) {
    console.error('[Mentor replyInquiry Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to reply to inquiry: ${error.message}` });
  }
};

// ============================================================================
// 11. DELETE INQUIRY
// ============================================================================
export const deleteInquiry = async (req: Request, res: Response) => {
  try {
    const rawQueryId = req.params.queryId;
    const queryId = Array.isArray(rawQueryId) ? rawQueryId[0] : rawQueryId;
    await Inquiry.findByIdAndDelete(queryId);
    return res.status(200).json({ message: 'Inquiry dismissed.' });
  } catch (error: any) {
    console.error('[Mentor deleteInquiry Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to delete inquiry: ${error.message}` });
  }
};