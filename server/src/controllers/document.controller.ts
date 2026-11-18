import { Request, Response } from 'express';
import DocumentModel from '../models/Document.model';
import {
  uploadBufferToImageKit,
  deleteFromImageKit,
} from '../services/imagekit.service';

const DocModel: any = (DocumentModel as any)?.default || DocumentModel;

// ============================================================================
// 1. UPLOAD PDF OR IMAGE BUFFER TO IMAGEKIT CLOUD
// ============================================================================
export const uploadStudentDocument = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    const {
      title,
      category = 'Marks Card',
      notes = '',
      dossierSummary = '',
      studentId,
      studentName = 'Scholar',
      fileName,
      fileSize,
      mimeType,
    } = req.body;

    const resolvedStudentId = String(
      studentId || (req as any).user?.identifier || ''
    )
      .trim()
      .toUpperCase();

    if (!resolvedStudentId) {
      return res.status(400).json({ error: 'Student USN / ID is required.' });
    }

    if (!file || !file.buffer) {
      return res.status(400).json({
        error:
          'No binary file received. Ensure multipart field name is "file" and multer.memoryStorage() is active.',
      });
    }

    const originalName =
      fileName || file.originalname || `VTU_Proof_${Date.now()}.pdf`;

    console.log('[Upload Incoming]:', {
      studentId: resolvedStudentId,
      fileName: originalName,
      mimeType: file.mimetype,
      bytes: file.size,
    });

    // Stream binary buffer straight to ImageKit CDN
    const cloudAsset = await uploadBufferToImageKit(
      file.buffer,
      originalName,
      `/vtu-mentoring/${resolvedStudentId}`
    );

    console.log('[ImageKit Success]:', cloudAsset.url);

    const newDoc = await DocModel.create({
      studentId: resolvedStudentId,
      studentName: String(studentName).trim(),
      title: String(title || originalName).trim(),
      category: String(category).trim(),
      notes: String(notes).trim(),
      dossierSummary: String(dossierSummary || notes).trim(),
      fileName: originalName,
      fileSize:
        fileSize || `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      mimeType: mimeType || file.mimetype || 'application/pdf',
      fileUrl: cloudAsset.url,
      imagekitFileId: cloudAsset.fileId,
      verified: false,
      date: new Date().toISOString().split('T')[0],
    });

    return res.status(201).json({
      message: 'Document uploaded to ImageKit cloud successfully.',
      document: newDoc,
    });
  } catch (error: any) {
    console.error('[ImageKit Upload Error]:', error.message);
    return res.status(500).json({
      error: `Cloud upload failed: ${error.message}`,
    });
  }
};

// ============================================================================
// 2. LIST DOCUMENTS
// ============================================================================
export const getStudentDocuments = async (req: Request, res: Response) => {
  try {
    const studentId = String(
      req.query.studentId || (req as any).user?.identifier || ''
    )
      .trim()
      .toUpperCase();

    const filter = studentId ? { studentId } : {};
    const docs = await DocModel.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json(docs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// 3. MENTOR VERIFY / REVOKE DOCUMENT
// ============================================================================
export const toggleDocumentVerification = async (req: Request, res: Response) => {
  try {
    const { docId } = req.params;
    const doc = await DocModel.findById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    doc.verified = !doc.verified;
    await doc.save();
    return res.status(200).json({ doc, verified: doc.verified });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// 4. DELETE DOCUMENT (REMOVES FROM MONGODB & IMAGEKIT CLOUD)
// ============================================================================
export const removeDocument = async (req: Request, res: Response) => {
  try {
    const { docId } = req.params;
    const doc = await DocModel.findByIdAndDelete(docId);
    if (doc?.imagekitFileId) {
      await deleteFromImageKit(doc.imagekitFileId);
    }
    return res
      .status(200)
      .json({ message: 'Document permanently removed from cloud & database.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};