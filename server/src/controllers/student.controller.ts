import { Request, Response } from 'express';
import * as StudentModule from '../models/Student.model';
import * as UserModule from '../models/User.model';
import * as DocModule from '../models/Document.model';
import * as TaskModule from '../models/Task.model';
import * as QueryModule from '../models/Query.model';

const Student: any =
  (StudentModule as any).default || (StudentModule as any).Student || StudentModule;
const User: any =
  (UserModule as any).default || (UserModule as any).User || UserModule;
const DocumentModel: any =
  (DocModule as any).default ||
  (DocModule as any).DocumentRecord ||
  (DocModule as any).DocumentModel ||
  (DocModule as any).Document ||
  DocModule;
const Task: any =
  (TaskModule as any).default || (TaskModule as any).Task || TaskModule;
const Query: any =
  (QueryModule as any).default || (QueryModule as any).Query || QueryModule;

// Helper to resolve student with ObjectId safety (accepts string | string[] | undefined)
const resolveStudentFromRequest = async (
  req: Request,
  explicitUsn?: string | string[]
) => {
  const normalizedExplicit = Array.isArray(explicitUsn)
    ? explicitUsn[0]
    : explicitUsn;

  const rawId =
    normalizedExplicit ||
    (req as any).user?.identifier ||
    (req as any).user?.usn ||
    (req as any).user?.id ||
    (req as any).user?._id;
  const email = (req as any).user?.email
    ? String((req as any).user.email).trim().toLowerCase()
    : '';
  const cleanId = rawId ? String(rawId).trim() : '';
  const isValidMongoId = Boolean(cleanId && /^[0-9a-fA-F]{24}$/.test(cleanId));

  const student = await Student.findOne({
    $or: [
      ...(cleanId
        ? [
            { usn: { $regex: `^${cleanId}$`, $options: 'i' } },
            { tempAdmissionNo: { $regex: `^${cleanId}$`, $options: 'i' } },
            ...(isValidMongoId ? [{ user: cleanId }, { _id: cleanId }] : []),
          ]
        : []),
      ...(email ? [{ email }] : []),
    ],
  });

  return { student, cleanId };
};

// ============================================================================
// 1. GET STUDENT PROFILE (Dynamically looks up mentor name from User collection)
// ============================================================================
export const getStudentProfile = async (req: Request, res: Response) => {
  try {
    const identifier = (req as any).user?.identifier;
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!identifier && !userId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: Session missing student identifier.' });
    }

    const { student } = await resolveStudentFromRequest(req);
    if (!student) {
      return res
        .status(404)
        .json({ error: 'Student record not found in institutional database.' });
    }

    let resolvedMentorName = student.mentorName || 'Faculty Mentor';
    if (student.mentorId) {
      const cleanMentorId = String(student.mentorId).trim();
      const mentorUser = await User.findOne({
        $or: [
          { identifier: cleanMentorId },
          { identifier: { $regex: `^${cleanMentorId}$`, $options: 'i' } },
          { name: { $regex: `^${cleanMentorId}$`, $options: 'i' } },
        ],
      }).select('name');

      if (mentorUser?.name) {
        resolvedMentorName = mentorUser.name;
        if (student.mentorName !== resolvedMentorName) {
          student.mentorName = resolvedMentorName;
          await student.save();
        }
      } else if (cleanMentorId === '0001') {
        resolvedMentorName = 'Dr. Kumar P K';
      }
    }

    return res.status(200).json({
      student: {
        id: student.usn,
        usn: student.usn,
        name: student.name,
        email: student.email,
        phone: student.phone,
        mentorId: student.mentorId,
        mentorName: resolvedMentorName,
        remarks: student.remarks,
        history: student.history || [],
        currentMarks: student.currentMarks,
        currentAttendance: student.currentAttendance,
        deltaMarks: student.deltaMarks,
        deltaAttendance: student.deltaAttendance,
        dynamicTotal: student.dynamicTotal,
        riskLevel: student.riskLevel,
        isApproved: student.isApproved,
        dossier: student.dossier || null,
      },
    });
  } catch (error: any) {
    console.error('[getStudentProfile Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Server error retrieving profile.' });
  }
};

// ============================================================================
// 2. GET & UPLOAD STUDENT DOCUMENTS + VTU MENTORSHIP DOSSIER
// ============================================================================
export const getStudentDocuments = async (req: Request, res: Response) => {
  try {
    const { student, cleanId } = await resolveStudentFromRequest(req);
    if (!cleanId && !student) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: No student identifier in session.' });
    }

    const searchIds = [cleanId, student?.usn, student?.tempAdmissionNo].filter(
      Boolean
    );
    const docs = await DocumentModel.find({
      studentId: { $in: searchIds },
    }).sort({ createdAt: -1 });

    return res.status(200).json(docs);
  } catch (error: any) {
    console.error('[getStudentDocuments Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Server error retrieving documents.' });
  }
};

export const getStudentDossier = async (req: Request, res: Response) => {
  try {
    const paramId = Array.isArray(req.params.studentId)
      ? req.params.studentId[0]
      : req.params.studentId;
    const { student, cleanId } = await resolveStudentFromRequest(req, paramId);

    const effectiveId = student?.usn || student?.tempAdmissionNo || cleanId;
    const documents = await DocumentModel.find({
      $or: [
        ...(effectiveId ? [{ studentId: effectiveId }] : []),
        ...(cleanId ? [{ studentId: cleanId }] : []),
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      student: student || null,
      dossier: student?.dossier || null,
      documents: documents || [],
    });
  } catch (error: any) {
    console.error('[getStudentDossier Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Server error retrieving dossier.' });
  }
};

export const saveDossierAndUploadDocument = async (
  req: Request,
  res: Response
) => {
  try {
    const paramId = Array.isArray(req.params.studentId)
      ? req.params.studentId[0]
      : req.params.studentId;
    const {
      name,
      dossier,
      title,
      documentTitle,
      category,
      fileName,
      fileUrl,
      notes,
    } = req.body;

    const { student, cleanId } = await resolveStudentFromRequest(req, paramId);

    if (student) {
      if (name) student.name = String(name).trim();
      if (dossier) {
        student.dossier = {
          ...(student.dossier || {}),
          ...dossier,
        };
      }
      await student.save();
    }

    const effectiveId =
      student?.usn || student?.tempAdmissionNo || cleanId || '4VZ25MC055';
    const resolvedName =
      name || student?.name || (req as any).user?.name || 'Scholar';
    const activeDossier = dossier || student?.dossier;

    const cgpa =
      activeDossier?.academics?.qualifications?.[2]?.cgpaPercent || '9.12 CGPA';
    const projectTitle =
      activeDossier?.projects?.project?.title ||
      'Proactive Early-Warning E-Mentoring System';
    const summaryText = `${resolvedName} (${effectiveId}) • ${cgpa} • Project: ${projectTitle}`;

    const finalDocTitle = (documentTitle || title || '').trim();
    let createdDoc = null;

    if (finalDocTitle || fileName) {
      const safeFileName = fileName || `VTU_Proof_${Date.now()}.pdf`;
      createdDoc = await DocumentModel.create({
        studentId: effectiveId,
        studentName: resolvedName,
        mentorId: student?.mentorId || '0001',
        title: finalDocTitle || `${category || 'Marks Card'} Submission`,
        category: category || 'Marks Card',
        fileName: safeFileName,
        fileUrl: fileUrl || `/uploads/${safeFileName}`,
        fileSize: '1.2 MB',
        mimeType: safeFileName.endsWith('.jpg')
          ? 'image/jpeg'
          : 'application/pdf',
        verified: false,
        notes: notes || summaryText,
        dossierSummary: summaryText,
        dossierSnapshot: activeDossier || null,
        date: new Date().toISOString().split('T')[0],
      });
    }

    const documents = await DocumentModel.find({
      $or: [
        { studentId: effectiveId },
        ...(cleanId ? [{ studentId: cleanId }] : []),
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'VTU Mentorship Dossier & document proof saved successfully.',
      student,
      dossier: student?.dossier || activeDossier,
      document: createdDoc,
      documents,
    });
  } catch (error: any) {
    console.error('[saveDossierAndUploadDocument Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Server error saving dossier & proof.' });
  }
};

export const deleteStudentDocument = async (req: Request, res: Response) => {
  try {
    const rawDocId = req.params.docId;
    const docId = Array.isArray(rawDocId) ? rawDocId[0] : rawDocId;
    if (docId && /^[0-9a-fA-F]{24}$/.test(String(docId))) {
      await DocumentModel.findByIdAndDelete(docId);
    }
    return res.status(200).json({ message: 'Document removed successfully.' });
  } catch (error: any) {
    console.error('[deleteStudentDocument Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Server error deleting document.' });
  }
};

// ============================================================================
// 3. GET & TOGGLE STUDENT TASKS
// ============================================================================
export const getStudentTasks = async (req: Request, res: Response) => {
  try {
    const identifier = (req as any).user?.identifier;
    if (!identifier) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: No student identifier in session.' });
    }
    const cleanId = String(identifier).trim();
    const tasks = await Task.find({
      studentId: { $regex: `^${cleanId}$`, $options: 'i' },
    }).sort({ createdAt: -1 });
    return res.status(200).json(tasks);
  } catch (error: any) {
    console.error('[getStudentTasks Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Server error retrieving action plans.' });
  }
};

export const toggleTaskStatus = async (req: Request, res: Response) => {
  try {
    const rawTaskId = req.params.taskId;
    const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Action plan task not found.' });
    }
    task.status = task.status === 'Completed' ? 'Pending' : 'Completed';
    await task.save();
    return res.status(200).json({ message: 'Task status updated.', task });
  } catch (error: any) {
    console.error('[toggleTaskStatus Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Server error updating task.' });
  }
};

// ============================================================================
// 4. GET & CREATE STUDENT INQUIRIES
// ============================================================================
export const getStudentInquiries = async (req: Request, res: Response) => {
  try {
    const identifier = (req as any).user?.identifier;
    if (!identifier) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: No student identifier in session.' });
    }
    const cleanId = String(identifier).trim();
    const inquiries = await Query.find({
      studentId: { $regex: `^${cleanId}$`, $options: 'i' },
    }).sort({ createdAt: -1 });
    return res.status(200).json(inquiries);
  } catch (error: any) {
    console.error('[getStudentInquiries Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Server error retrieving inquiries.' });
  }
};

export const createStudentInquiry = async (req: Request, res: Response) => {
  try {
    const identifier = (req as any).user?.identifier;
    const { subject, message } = req.body;
    if (!identifier) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: No student identifier in session.' });
    }
    if (!subject || !message) {
      return res
        .status(400)
        .json({ error: 'Please provide both subject and message.' });
    }
    const cleanId = String(identifier).trim();
    const newQuery = await Query.create({
      studentId: cleanId,
      subject: subject.trim(),
      message: message.trim(),
      status: 'Pending',
    });
    return res
      .status(201)
      .json({ message: 'Inquiry dispatched to mentor.', query: newQuery });
  } catch (error: any) {
    console.error('[createStudentInquiry Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Server error dispatching inquiry.' });
  }
};