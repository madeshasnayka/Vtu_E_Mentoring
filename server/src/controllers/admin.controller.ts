// import { Request, Response } from 'express';
// import bcrypt from 'bcryptjs';
// import StudentModel from '../models/Student.model';
// import UserModel from '../models/User.model';
// import SystemConfigModel from '../models/SystemConfig.model';
// import { sendInstitutionalInvitation } from '../services/email.service';

// const Student: any = (StudentModel as any)?.default || StudentModel;
// const User: any = (UserModel as any)?.default || UserModel;
// const SystemConfig: any = (SystemConfigModel as any)?.default || SystemConfigModel;

// // ============================================================================
// // 1. GET ALL STUDENTS (Safe Query & Year Filter)
// // ============================================================================
// export const getStudents = async (req: Request, res: Response) => {
//   try {
//     const year = req.query.year ? String(req.query.year).trim() : undefined;
//     const filter: any = {};
//     if (year && year !== 'ALL') {
//       filter.admissionYear = year;
//     }
//     const students = await Student.find(filter).sort({ createdAt: -1 }).lean();
//     return res.status(200).json(students || []);
//   } catch (error: any) {
//     console.error('[Admin getStudents Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Failed to fetch students: ${error.message}` });
//   }
// };

// // ============================================================================
// // 2. GET MENTORS ROSTER & CREATE NEW MENTOR
// // ============================================================================
// export const getMentors = async (_req: Request, res: Response) => {
//   try {
//     const mentors = await User.find(
//       { role: 'mentor', isApproved: true },
//       'identifier name email designation'
//     ).lean();

//     const mentorList = await Promise.all(
//       (mentors || []).map(async (m: any) => {
//         try {
//           const mId = String(m.identifier || '').trim();
//           const count = await Student.countDocuments({
//             $or: [{ mentorId: mId }, { mentorName: m.name }],
//             isApproved: true,
//           });
//           return {
//             id: mId,
//             name: m.name,
//             email: m.email || '',
//             designation: m.designation || 'Faculty Mentor',
//             menteeCount: count,
//           };
//         } catch {
//           return {
//             id: m.identifier,
//             name: m.name,
//             email: m.email || '',
//             designation: m.designation || 'Faculty Mentor',
//             menteeCount: 0,
//           };
//         }
//       })
//     );

//     return res.status(200).json(mentorList);
//   } catch (error: any) {
//     console.error('[Admin getMentors Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Failed to fetch mentors: ${error.message}` });
//   }
// };

// export const createMentor = async (req: Request, res: Response) => {
//   try {
//     const { name, identifier, email, designation, password } = req.body;
//     if (!name || !identifier) {
//       return res
//         .status(400)
//         .json({ error: 'Faculty Name and Staff ID are required.' });
//     }

//     const cleanId = String(identifier).trim();
//     const cleanName = String(name).trim();
//     const cleanEmail = email
//       ? String(email).trim().toLowerCase()
//       : `${cleanId.toLowerCase()}@vtu.ac.in`;

//     const existing = await User.findOne({
//       $or: [{ identifier: cleanId }, { email: cleanEmail }],
//     });
//     if (existing) {
//       return res
//         .status(409)
//         .json({ error: `Faculty ID ${cleanId} or email already exists.` });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(
//       String(password || 'password123'),
//       salt
//     );

//     const newMentor = await User.create({
//       identifier: cleanId,
//       name: cleanName,
//       email: cleanEmail,
//       role: 'mentor',
//       designation: designation ? String(designation).trim() : 'Faculty Mentor',
//       password: hashedPassword,
//       passwordHash: hashedPassword,
//       isApproved: true,
//     });

//     return res.status(201).json({
//       message: `Faculty Mentor ${cleanName} (${cleanId}) provisioned successfully.`,
//       mentor: {
//         id: newMentor.identifier,
//         name: newMentor.name,
//         email: newMentor.email,
//         designation: newMentor.designation,
//         menteeCount: 0,
//       },
//     });
//   } catch (error: any) {
//     console.error('[Admin createMentor Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Failed to create mentor: ${error.message}` });
//   }
// };

// // ============================================================================
// // 3. PENDING REGISTRATION APPROVALS
// // ============================================================================
// export const getPendingApprovals = async (_req: Request, res: Response) => {
//   try {
//     const pendings = await User.find({ isApproved: false, role: 'student' })
//       .sort({ createdAt: -1 })
//       .lean();

//     const enriched = await Promise.all(
//       (pendings || []).map(async (u: any) => {
//         const stu = await Student.findOne({
//           $or: [{ usn: u.identifier }, { email: u.email }],
//         })
//           .select('admissionYear mentorId')
//           .lean();
//         return {
//           ...u,
//           admissionYear: stu?.admissionYear || '2026',
//           mentorId: stu?.mentorId || '',
//         };
//       })
//     );

//     return res.status(200).json(enriched);
//   } catch (error: any) {
//     console.error('[Admin getPendingApprovals Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Failed to fetch approvals: ${error.message}` });
//   }
// };

// // ============================================================================
// // 4. GET & UPDATE SYSTEM CONFIG + CUSTOM BATCH YEARS
// // ============================================================================
// export const getSystemConfig = async (_req: Request, res: Response) => {
//   try {
//     let config = await SystemConfig.findOne().lean();
//     if (!config) {
//       config = await SystemConfig.create({
//         thetaM: 5.0,
//         thetaA: 7.5,
//         wM: 0.6,
//         wA: 0.4,
//         dropDelta: -1.5,
//         activeBatches: ['2026'],
//       });
//     }
//     if (!Array.isArray(config.activeBatches) || config.activeBatches.length === 0) {
//       config.activeBatches = ['2026'];
//     }
//     return res.status(200).json(config);
//   } catch {
//     return res.status(200).json({
//       thetaM: 5.0,
//       thetaA: 7.5,
//       wM: 0.6,
//       wA: 0.4,
//       dropDelta: -1.5,
//       activeBatches: ['2026'],
//     });
//   }
// };

// export const updateSystemConfig = async (req: Request, res: Response) => {
//   try {
//     let config = await SystemConfig.findOne();
//     if (!config) {
//       config = new SystemConfig(req.body);
//     } else {
//       Object.assign(config, req.body);
//     }
//     await config.save();
//     return res
//       .status(200)
//       .json({ message: 'Configuration saved successfully.', config });
//   } catch (error: any) {
//     console.error('[Admin updateSystemConfig Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Failed to save configuration: ${error.message}` });
//   }
// };

// export const addBatchYear = async (req: Request, res: Response) => {
//   try {
//     const rawYear = String(req.body.year || '').trim();
//     if (!/^\d{4}$/.test(rawYear)) {
//       return res
//         .status(400)
//         .json({ error: 'Please enter a valid 4-digit year (e.g. 2025 or 2027).' });
//     }
//     const config = await SystemConfig.findOneAndUpdate(
//       {},
//       { $addToSet: { activeBatches: rawYear } },
//       { returnDocument: 'after', upsert: true }
//     );
//     return res.status(200).json({
//       message: `Batch ${rawYear} created and activated.`,
//       activeBatches: config.activeBatches,
//     });
//   } catch (error: any) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// // ============================================================================
// // 5. BATCH CANDIDATE PRE-ADMISSION (Strict Duplicate Email Validation)
// // ============================================================================
// export const batchAdmitStudents = async (req: Request, res: Response) => {
//   try {
//     const { candidates, admissionYear = '2026', defaultMentorId = '' } = req.body;
//     if (!Array.isArray(candidates) || candidates.length === 0) {
//       return res
//         .status(400)
//         .json({ error: 'Please provide at least one admitted candidate.' });
//     }

//     const cleanYear = String(admissionYear).trim() || '2026';

//     // Validate duplicate emails before inserting any candidate
//     for (let i = 0; i < candidates.length; i++) {
//       const c = candidates[i];
//       const cleanName = String(c.name || '').trim();
//       if (!cleanName) {
//         return res.status(400).json({ error: `Row #${i + 1}: Candidate name is required.` });
//       }
//       const cleanEmail = c.email
//         ? String(c.email).trim().toLowerCase()
//         : `${cleanName.toLowerCase().replace(/\s+/g, '')}@vtu.ac.in`;

//       const existingStudent = await Student.findOne({ email: cleanEmail }).lean();
//       const existingUser = await User.findOne({ email: cleanEmail }).lean();
//       if (existingStudent || existingUser) {
//         return res.status(400).json({
//           error: `Student email "${cleanEmail}" already exists in the system.`,
//         });
//       }
//     }

//     await SystemConfig.findOneAndUpdate(
//       {},
//       { $addToSet: { activeBatches: cleanYear } },
//       { upsert: true }
//     );

//     const created: any[] = [];
//     const salt = await bcrypt.genSalt(10);
//     const defaultHashedPassword = await bcrypt.hash('password123', salt);

//     for (let i = 0; i < candidates.length; i++) {
//       const c = candidates[i];
//       const cleanName = String(c.name || '').trim();
//       const cleanEmail = c.email
//         ? String(c.email).trim().toLowerCase()
//         : `${cleanName.toLowerCase().replace(/\s+/g, '')}@vtu.ac.in`;

//       const rawMentor =
//         c.mentorId !== undefined ? String(c.mentorId).trim() : String(defaultMentorId || '').trim();
//       const candidateMentorId =
//         rawMentor && rawMentor.toUpperCase() !== 'UNASSIGNED' ? rawMentor : '';

//       let mentorName = 'No Mentor';
//       if (candidateMentorId) {
//         const specificMentor = await User.findOne({
//           identifier: candidateMentorId,
//         }).lean();
//         mentorName =
//           specificMentor?.name ||
//           (candidateMentorId === '0001'
//             ? 'Dr. Kumar P K'
//             : `Faculty (${candidateMentorId})`);
//       }

//       const tempAdmissionNo = `ADM-${cleanYear}-${Math.floor(1000 + Math.random() * 9000)}`;

//       const studentUser = await User.create({
//         identifier: tempAdmissionNo,
//         name: cleanName,
//         email: cleanEmail,
//         phone: c.phone || '',
//         role: 'student',
//         mentorId: candidateMentorId,
//         designation: `Student (${cleanYear} Batch)`,
//         password: defaultHashedPassword,
//         passwordHash: defaultHashedPassword,
//         isApproved: true,
//       });

//       const newStudent = await Student.create({
//         user: studentUser._id,
//         usn: tempAdmissionNo,
//         tempAdmissionNo,
//         name: cleanName,
//         email: cleanEmail,
//         phone: c.phone || '',
//         mentorId: candidateMentorId,
//         mentorName,
//         admissionYear: cleanYear,
//         status: 'active',
//         isApproved: true,
//         history: [],
//         currentMarks: null,
//         currentAttendance: null,
//         dynamicTotal: null,
//         riskLevel: 'Pending Evaluation',
//       });

//       try {
//         sendInstitutionalInvitation(
//           cleanEmail,
//           tempAdmissionNo,
//           cleanName,
//           mentorName
//         );
//       } catch {
//         // Non-blocking email dispatch
//       }

//       created.push(newStudent);
//     }

//     return res.status(201).json({
//       message: `Enrolled ${created.length} candidate(s) into Batch ${cleanYear}.`,
//       enrolledCount: created.length,
//       students: created,
//     });
//   } catch (error: any) {
//     console.error('[Admin batchAdmitStudents Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Batch admission failed: ${error.message}` });
//   }
// };

// // ============================================================================
// // 6. ASSIGN OFFICIAL UNIVERSITY USN
// // ============================================================================
// export const assignOfficialUsn = async (req: Request, res: Response) => {
//   try {
//     const rawParamId = req.params.studentId;
//     const rawStudentId =
//       (Array.isArray(rawParamId) ? rawParamId[0] : rawParamId) ||
//       req.body.studentId;
//     const rawOfficialUsn = req.body.officialUsn;

//     if (!rawStudentId) {
//       return res
//         .status(400)
//         .json({ error: 'Student ID or Admission Reference is required.' });
//     }
//     if (!rawOfficialUsn || !String(rawOfficialUsn).trim()) {
//       return res
//         .status(400)
//         .json({ error: 'Official University USN is required.' });
//     }

//     const cleanStudentId = String(rawStudentId).trim().toUpperCase();
//     const cleanNewUsn = String(rawOfficialUsn).trim().toUpperCase();

//     const duplicateCheck = await Student.findOne({ usn: cleanNewUsn });
//     if (duplicateCheck && duplicateCheck.usn !== cleanStudentId) {
//       return res.status(400).json({
//         error: `USN ${cleanNewUsn} is already registered to another scholar.`,
//       });
//     }

//     const student = await Student.findOne({
//       $or: [{ usn: cleanStudentId }, { tempAdmissionNo: cleanStudentId }],
//     });
//     if (!student) {
//       return res
//         .status(404)
//         .json({ error: 'Scholar admission record not found.' });
//     }

//     const oldId = student.usn;
//     student.usn = cleanNewUsn;
//     await student.save();

//     await User.updateOne(
//       { $or: [{ identifier: oldId }, { email: student.email }] },
//       { $set: { identifier: cleanNewUsn } }
//     );

//     return res.status(200).json({
//       message: `Official University USN (${cleanNewUsn}) assigned successfully.`,
//       student,
//     });
//   } catch (error: any) {
//     console.error('[Admin assignOfficialUsn Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Failed to assign official USN: ${error.message}` });
//   }
// };

// // ============================================================================
// // 7. APPROVE & REJECT USER REGISTRATION (Preserves Password + Mentor Dropdown)
// // ============================================================================
// export const approveUser = async (req: Request, res: Response) => {
//   try {
//     const { userId } = req.params;
//     const { mentorId, admissionYear } = req.body;

//     // Keep mentorId empty ('') if not explicitly assigned so student shows "No Mentor"
//     const cleanMentorId =
//       mentorId &&
//       String(mentorId).trim() !== '' &&
//       String(mentorId).trim().toUpperCase() !== 'UNASSIGNED'
//         ? String(mentorId).trim()
//         : '';

//     let resolvedMentorName = 'No Mentor';
//     if (cleanMentorId) {
//       const mentorUser = await User.findOne({ identifier: cleanMentorId }).lean();
//       resolvedMentorName =
//         mentorUser?.name ||
//         (cleanMentorId === '0001'
//           ? 'Dr. Kumar P K'
//           : `Faculty (${cleanMentorId})`);
//     }

//     const user = await User.findByIdAndUpdate(
//       userId,
//       {
//         $set: {
//           isApproved: true,
//           mentorId: cleanMentorId,
//           ...(admissionYear
//             ? { admissionYear: String(admissionYear).trim() }
//             : {}),
//         },
//       },
//       { returnDocument: 'after' }
//     );

//     if (!user) {
//       return res
//         .status(404)
//         .json({ error: 'Pending registration user not found.' });
//     }

//     const usn = String(user.identifier || '').trim().toUpperCase();
//     const resolvedYear = String(
//       admissionYear || user.admissionYear || '2026'
//     ).trim();

//     const student = await Student.findOneAndUpdate(
//       { usn },
//       {
//         $set: {
//           name: user.name || 'Scholar',
//           email: user.email || `${usn.toLowerCase()}@vtu.ac.in`,
//           phone: (user as any).phone || '',
//           mentorId: cleanMentorId,
//           mentorName: resolvedMentorName,
//           admissionYear: resolvedYear,
//           status: 'active',
//           isApproved: true,
//         },
//         $setOnInsert: {
//           usn,
//           history: [],
//           currentMarks: null,
//           currentAttendance: null,
//           dynamicTotal: null,
//           remarks: 'Self-registered scholar approved by Admin.',
//           riskLevel: 'Pending Evaluation',
//         },
//       },
//       { upsert: true, returnDocument: 'after' }
//     );

//     return res.status(200).json({
//       message: `${user.name} approved successfully (${resolvedMentorName}).`,
//       user,
//       student,
//     });
//   } catch (error: any) {
//     console.error('[Approval Error]:', error.message);
//     return res.status(500).json({
//       error: `Approval failed: ${error.message}`,
//     });
//   }
// };

// export const rejectUser = async (req: Request, res: Response) => {
//   try {
//     const rawParam = req.params.userId;
//     const rawUserId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
//     if (!rawUserId) {
//       return res.status(400).json({ error: 'User ID is required.' });
//     }

//     const user = await User.findByIdAndDelete(String(rawUserId).trim());
//     if (user) {
//       await Student.deleteOne({
//         $or: [
//           { user: user._id },
//           { usn: user.identifier },
//           { email: user.email },
//         ],
//         isApproved: false,
//       });
//     }

//     return res.status(200).json({ message: 'Registration rejected and purged.' });
//   } catch (error: any) {
//     console.error('[Admin rejectUser Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Rejection failed: ${error.message}` });
//   }
// };

// // ============================================================================
// // 8. REALLOCATE STUDENTS TO TARGET MENTOR (Strict ID & Name Sync)
// // ============================================================================
// export const assignStudents = async (req: Request, res: Response) => {
//   try {
//     const { mentorId, studentIds } = req.body;
//     if (!mentorId || !Array.isArray(studentIds) || studentIds.length === 0) {
//       return res
//         .status(400)
//         .json({ error: 'Target mentorId and studentIds array are required.' });
//     }

//     const cleanMentorId = String(mentorId).trim();
//     const mentorUser = await User.findOne({ identifier: cleanMentorId });
//     const mentorName =
//       mentorUser?.name ||
//       (cleanMentorId === '0001'
//         ? 'Dr. Kumar P K'
//         : cleanMentorId === '1'
//         ? 'Prof. Maddy'
//         : `Faculty (${cleanMentorId})`);

//     await Student.updateMany(
//       {
//         $or: [
//           { usn: { $in: studentIds } },
//           { tempAdmissionNo: { $in: studentIds } },
//         ],
//       },
//       {
//         $set: {
//           mentorId: cleanMentorId,
//           mentorName: mentorName,
//         },
//       }
//     );

//     return res.status(200).json({
//       message: `Transferred ${studentIds.length} scholar(s) to ${mentorName}.`,
//     });
//   } catch (error: any) {
//     console.error('[Admin assignStudents Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Allocation failed: ${error.message}` });
//   }
// };

// // ============================================================================
// // 9. INSTITUTIONAL REPORT & MENTOR RANKINGS (Excludes Unevaluated Placeholder Scores)
// // ============================================================================
// export const getInstitutionalReport = async (req: Request, res: Response) => {
//   try {
//     const year = req.query.year ? String(req.query.year).trim() : undefined;
//     const filter: any = { isApproved: true };
//     if (year && year !== 'ALL') {
//       filter.admissionYear = year;
//     }

//     const students = await Student.find(filter).sort({ usn: 1 }).lean();
//     const configDoc = await SystemConfig.findOne().lean();
//     const mentors = await User.find(
//       { role: 'mentor' },
//       'identifier name email designation'
//     ).lean();

//     const mentorNameMap = new Map(
//       mentors.map((m: any) => [
//         String(m.identifier).toLowerCase().trim(),
//         m.name,
//       ])
//     );

//     const wM = configDoc?.wM ?? 0.6;
//     const wA = configDoc?.wA ?? 0.4;

//     const records = (students || []).map((s: any) => {
//       const hasHistory = Array.isArray(s.history) && s.history.length > 0;
//       let safeMarks: number | null = null;
//       let safeAttend: number | null = null;
//       let safeTotal: number | null = null;

//       if (hasHistory) {
//         const last = s.history[s.history.length - 1];
//         safeMarks =
//           last?.marks !== undefined && last?.marks !== null
//             ? Number(last.marks)
//             : s.currentMarks !== undefined && s.currentMarks !== null
//             ? Number(s.currentMarks)
//             : null;
//         safeAttend =
//           last?.attendance !== undefined && last?.attendance !== null
//             ? Number(last.attendance)
//             : s.currentAttendance !== undefined && s.currentAttendance !== null
//             ? Number(s.currentAttendance)
//             : null;
//         if (safeMarks !== null && safeAttend !== null) {
//           safeTotal = Number((wM * safeMarks + wA * safeAttend).toFixed(2));
//         }
//       }

//       const rawMentorId = s.mentorId
//         ? String(s.mentorId).toLowerCase().trim()
//         : '';
//       const dynamicMentorName = !rawMentorId
//         ? 'No Mentor'
//         : mentorNameMap.get(rawMentorId) || s.mentorName || 'No Mentor';

//       return {
//         studId: s.usn,
//         studentName: s.name,
//         mentorId: s.mentorId || '',
//         mentorName: dynamicMentorName,
//         admissionYear: s.admissionYear || '2026',
//         marks: safeMarks !== null ? safeMarks : 'Not Uploaded',
//         attendance: safeAttend !== null ? safeAttend : 'Not Uploaded',
//         total: safeTotal !== null ? safeTotal : 'Not Uploaded',
//         riskLevel: hasHistory ? s.riskLevel || 'Satisfactory' : 'Not Uploaded',
//         hasEvaluations: safeTotal !== null,
//       };
//     });

//     return res.status(200).json({
//       department: 'Department of Computer Science & Engineering',
//       institution: 'Visvesvaraya Technological University, Mysuru',
//       admissionYear: year || 'All Batches',
//       records,
//     });
//   } catch (error: any) {
//     console.error('[Admin getInstitutionalReport Error]:', error.message);
//     return res
//       .status(500)
//       .json({ error: `Report generation failed: ${error.message}` });
//   }
// };
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import StudentModel from '../models/Student.model';
import UserModel from '../models/User.model';
import SystemConfigModel from '../models/SystemConfig.model';
import { sendInstitutionalInvitation } from '../services/email.service';

const Student: any = (StudentModel as any)?.default || StudentModel;
const User: any = (UserModel as any)?.default || UserModel;
const SystemConfig: any = (SystemConfigModel as any)?.default || SystemConfigModel;

// ============================================================================
// 1. GET ALL STUDENTS (Safe Query & Year Filter)
// ============================================================================
export const getStudents = async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? String(req.query.year).trim() : undefined;
    const filter: any = {};
    if (year && year !== 'ALL') {
      filter.admissionYear = year;
    }

    const students = await Student.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json(students || []);
  } catch (error: any) {
    console.error('[Admin getStudents Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to fetch students: ${error.message}` });
  }
};

// ============================================================================
// 2. GET MENTORS ROSTER & CREATE NEW MENTOR
// ============================================================================
export const getMentors = async (_req: Request, res: Response) => {
  try {
    const mentors = await User.find(
      { role: 'mentor', isApproved: true },
      'identifier name email designation'
    ).lean();

    const mentorList = await Promise.all(
      (mentors || []).map(async (m: any) => {
        try {
          const mId = String(m.identifier || '').trim();
          const count = await Student.countDocuments({
            $or: [{ mentorId: mId }, { mentorName: m.name }],
            isApproved: true,
          });
          return {
            id: mId,
            name: m.name,
            email: m.email || '',
            designation: m.designation || 'Faculty Mentor',
            menteeCount: count,
          };
        } catch {
          return {
            id: m.identifier,
            name: m.name,
            email: m.email || '',
            designation: m.designation || 'Faculty Mentor',
            menteeCount: 0,
          };
        }
      })
    );

    return res.status(200).json(mentorList);
  } catch (error: any) {
    console.error('[Admin getMentors Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to fetch mentors: ${error.message}` });
  }
};

export const createMentor = async (req: Request, res: Response) => {
  try {
    const { name, identifier, email, designation, password } = req.body;
    if (!name || !identifier) {
      return res
        .status(400)
        .json({ error: 'Faculty Name and Staff ID are required.' });
    }

    const cleanId = String(identifier).trim();
    const cleanName = String(name).trim();
    const cleanEmail = email
      ? String(email).trim().toLowerCase()
      : `${cleanId.toLowerCase()}@vtu.ac.in`;

    const existing = await User.findOne({
      $or: [{ identifier: cleanId }, { email: cleanEmail }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: `Faculty ID ${cleanId} or email already exists.` });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(
      String(password || 'password123'),
      salt
    );

    const newMentor = await User.create({
      identifier: cleanId,
      name: cleanName,
      email: cleanEmail,
      role: 'mentor',
      designation: designation ? String(designation).trim() : 'Faculty Mentor',
      password: hashedPassword,
      passwordHash: hashedPassword,
      isApproved: true,
    });

    return res.status(201).json({
      message: `Faculty Mentor ${cleanName} (${cleanId}) provisioned successfully.`,
      mentor: {
        id: newMentor.identifier,
        name: newMentor.name,
        email: newMentor.email,
        designation: newMentor.designation,
        menteeCount: 0,
      },
    });
  } catch (error: any) {
    console.error('[Admin createMentor Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to create mentor: ${error.message}` });
  }
};

// ============================================================================
// 3. PENDING REGISTRATION APPROVALS
// ============================================================================
export const getPendingApprovals = async (_req: Request, res: Response) => {
  try {
    const pendings = await User.find({ isApproved: false, role: 'student' })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      (pendings || []).map(async (u: any) => {
        const stu = await Student.findOne({
          $or: [{ usn: u.identifier }, { email: u.email }],
        })
          .select('admissionYear mentorId')
          .lean();

        return {
          ...u,
          admissionYear: stu?.admissionYear || '2026',
          mentorId: stu?.mentorId || '',
        };
      })
    );

    return res.status(200).json(enriched);
  } catch (error: any) {
    console.error('[Admin getPendingApprovals Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to fetch approvals: ${error.message}` });
  }
};

// ============================================================================
// 4. GET & UPDATE SYSTEM CONFIG + CUSTOM BATCH YEARS
// ============================================================================
export const getSystemConfig = async (_req: Request, res: Response) => {
  try {
    let config = await SystemConfig.findOne().lean();
    if (!config) {
      config = await SystemConfig.create({
        thetaM: 5.0,
        thetaA: 7.5,
        wM: 0.6,
        wA: 0.4,
        dropDelta: -1.5,
        activeBatches: ['2026'],
      });
    }
    if (!Array.isArray(config.activeBatches) || config.activeBatches.length === 0) {
      config.activeBatches = ['2026'];
    }
    return res.status(200).json(config);
  } catch {
    return res.status(200).json({
      thetaM: 5.0,
      thetaA: 7.5,
      wM: 0.6,
      wA: 0.4,
      dropDelta: -1.5,
      activeBatches: ['2026'],
    });
  }
};

export const updateSystemConfig = async (req: Request, res: Response) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig(req.body);
    } else {
      Object.assign(config, req.body);
    }
    await config.save();
    return res
      .status(200)
      .json({ message: 'Configuration saved successfully.', config });
  } catch (error: any) {
    console.error('[Admin updateSystemConfig Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to save configuration: ${error.message}` });
  }
};

export const addBatchYear = async (req: Request, res: Response) => {
  try {
    const rawYear = String(req.body.year || '').trim();
    if (!/^\d{4}$/.test(rawYear)) {
      return res
        .status(400)
        .json({ error: 'Please enter a valid 4-digit year (e.g. 2025 or 2027).' });
    }

    const config = await SystemConfig.findOneAndUpdate(
      {},
      { $addToSet: { activeBatches: rawYear } },
      { returnDocument: 'after', upsert: true }
    );

    return res.status(200).json({
      message: `Batch ${rawYear} created and activated.`,
      activeBatches: config.activeBatches,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// 5. BATCH CANDIDATE PRE-ADMISSION (Strict Duplicate Email Validation + Email Dispatch)
// ============================================================================
export const batchAdmitStudents = async (req: Request, res: Response) => {
  try {
    const { candidates, admissionYear = '2026', defaultMentorId = '' } = req.body;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res
        .status(400)
        .json({ error: 'Please provide at least one admitted candidate.' });
    }

    const cleanYear = String(admissionYear).trim() || '2026';

    // Validate duplicate emails before inserting any candidate
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const cleanName = String(c.name || '').trim();
      if (!cleanName) {
        return res
          .status(400)
          .json({ error: `Row #${i + 1}: Candidate name is required.` });
      }
      const cleanEmail = c.email
        ? String(c.email).trim().toLowerCase()
        : `${cleanName.toLowerCase().replace(/\s+/g, '')}@vtu.ac.in`;

      const existingStudent = await Student.findOne({ email: cleanEmail }).lean();
      const existingUser = await User.findOne({ email: cleanEmail }).lean();
      if (existingStudent || existingUser) {
        return res.status(400).json({
          error: `Student email "${cleanEmail}" already exists in the system.`,
        });
      }
    }

    await SystemConfig.findOneAndUpdate(
      {},
      { $addToSet: { activeBatches: cleanYear } },
      { upsert: true }
    );

    const created: any[] = [];
    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('password123', salt);

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const cleanName = String(c.name || '').trim();
      const cleanEmail = c.email
        ? String(c.email).trim().toLowerCase()
        : `${cleanName.toLowerCase().replace(/\s+/g, '')}@vtu.ac.in`;

      const rawMentor =
        c.mentorId !== undefined
          ? String(c.mentorId).trim()
          : String(defaultMentorId || '').trim();
      const candidateMentorId =
        rawMentor && rawMentor.toUpperCase() !== 'UNASSIGNED' ? rawMentor : '';

      let mentorName = 'No Mentor';
      if (candidateMentorId) {
        const specificMentor = await User.findOne({
          identifier: candidateMentorId,
        }).lean();
        mentorName =
          specificMentor?.name ||
          (candidateMentorId === '0001'
            ? 'Dr. Kumar P K'
            : `Faculty (${candidateMentorId})`);
      }

      const tempAdmissionNo = `ADM-${cleanYear}-${Math.floor(1000 + Math.random() * 9000)}`;

      const studentUser = await User.create({
        identifier: tempAdmissionNo,
        name: cleanName,
        email: cleanEmail,
        phone: c.phone || '',
        role: 'student',
        mentorId: candidateMentorId,
        designation: `Student (${cleanYear} Batch)`,
        password: defaultHashedPassword,
        passwordHash: defaultHashedPassword,
        isApproved: true,
      });

      const newStudent = await Student.create({
        user: studentUser._id,
        usn: tempAdmissionNo,
        tempAdmissionNo,
        name: cleanName,
        email: cleanEmail,
        phone: c.phone || '',
        mentorId: candidateMentorId,
        mentorName,
        admissionYear: cleanYear,
        status: 'active',
        isApproved: true,
        history: [],
        currentMarks: null,
        currentAttendance: null,
        dynamicTotal: null,
        riskLevel: 'Pending Evaluation',
      });

      // Dispatch activation email directly to the newly created student's email
      sendInstitutionalInvitation(
        cleanEmail,
        tempAdmissionNo,
        cleanName,
        mentorName,
        'Default temporary password: password123 (please change after first login).'
      ).catch((err) => {
        console.error('[Batch Email Error]:', err?.message || err);
      });

      created.push(newStudent);
    }

    return res.status(201).json({
      message: `Enrolled ${created.length} candidate(s) into Batch ${cleanYear}.`,
      enrolledCount: created.length,
      students: created,
    });
  } catch (error: any) {
    console.error('[Admin batchAdmitStudents Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Batch admission failed: ${error.message}` });
  }
};

// ============================================================================
// 6. ASSIGN OFFICIAL UNIVERSITY USN
// ============================================================================
export const assignOfficialUsn = async (req: Request, res: Response) => {
  try {
    const rawParamId = req.params.studentId;
    const rawStudentId =
      (Array.isArray(rawParamId) ? rawParamId[0] : rawParamId) ||
      req.body.studentId;
    const rawOfficialUsn = req.body.officialUsn;

    if (!rawStudentId) {
      return res
        .status(400)
        .json({ error: 'Student ID or Admission Reference is required.' });
    }
    if (!rawOfficialUsn || !String(rawOfficialUsn).trim()) {
      return res
        .status(400)
        .json({ error: 'Official University USN is required.' });
    }

    const cleanStudentId = String(rawStudentId).trim().toUpperCase();
    const cleanNewUsn = String(rawOfficialUsn).trim().toUpperCase();

    const duplicateCheck = await Student.findOne({ usn: cleanNewUsn });
    if (duplicateCheck && duplicateCheck.usn !== cleanStudentId) {
      return res.status(400).json({
        error: `USN ${cleanNewUsn} is already registered to another scholar.`,
      });
    }

    const student = await Student.findOne({
      $or: [{ usn: cleanStudentId }, { tempAdmissionNo: cleanStudentId }],
    });
    if (!student) {
      return res
        .status(404)
        .json({ error: 'Scholar admission record not found.' });
    }

    const oldId = student.usn;
    student.usn = cleanNewUsn;
    await student.save();

    await User.updateOne(
      { $or: [{ identifier: oldId }, { email: student.email }] },
      { $set: { identifier: cleanNewUsn } }
    );

    return res.status(200).json({
      message: `Official University USN (${cleanNewUsn}) assigned successfully.`,
      student,
    });
  } catch (error: any) {
    console.error('[Admin assignOfficialUsn Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Failed to assign official USN: ${error.message}` });
  }
};

// ============================================================================
// 7. APPROVE & REJECT USER REGISTRATION (Preserves Password + Sends Email)
// ============================================================================
export const approveUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { mentorId, admissionYear } = req.body;

    // Keep mentorId empty ('') if not explicitly assigned so student shows "No Mentor"
    const cleanMentorId =
      mentorId &&
      String(mentorId).trim() !== '' &&
      String(mentorId).trim().toUpperCase() !== 'UNASSIGNED'
        ? String(mentorId).trim()
        : '';

    let resolvedMentorName = 'No Mentor';
    if (cleanMentorId) {
      const mentorUser = await User.findOne({ identifier: cleanMentorId }).lean();
      resolvedMentorName =
        mentorUser?.name ||
        (cleanMentorId === '0001'
          ? 'Dr. Kumar P K'
          : `Faculty (${cleanMentorId})`);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isApproved: true,
          mentorId: cleanMentorId,
          ...(admissionYear
            ? { admissionYear: String(admissionYear).trim() }
            : {}),
        },
      },
      { returnDocument: 'after' }
    );

    if (!user) {
      return res
        .status(404)
        .json({ error: 'Pending registration user not found.' });
    }

    const usn = String(user.identifier || '').trim().toUpperCase();
    const resolvedYear = String(
      admissionYear || user.admissionYear || '2026'
    ).trim();

    const student = await Student.findOneAndUpdate(
      { usn },
      {
        $set: {
          name: user.name || 'Scholar',
          email: user.email || `${usn.toLowerCase()}@vtu.ac.in`,
          phone: (user as any).phone || '',
          mentorId: cleanMentorId,
          mentorName: resolvedMentorName,
          admissionYear: resolvedYear,
          status: 'active',
          isApproved: true,
        },
        $setOnInsert: {
          usn,
          history: [],
          currentMarks: null,
          currentAttendance: null,
          dynamicTotal: null,
          remarks: 'Self-registered scholar approved by Admin.',
          riskLevel: 'Pending Evaluation',
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Dispatch activation email to the newly approved student's personal email
    if (user.email) {
      sendInstitutionalInvitation(
        user.email,
        usn,
        user.name || 'Scholar',
        resolvedMentorName,
        'Use the password you created during self-registration.'
      ).catch((err) => {
        console.error('[Approval Email Error]:', err?.message || err);
      });
    }

    return res.status(200).json({
      message: `${user.name} approved successfully (${resolvedMentorName}).`,
      user,
      student,
    });
  } catch (error: any) {
    console.error('[Approval Error]:', error.message);
    return res.status(500).json({
      error: `Approval failed: ${error.message}`,
    });
  }
};

export const rejectUser = async (req: Request, res: Response) => {
  try {
    const rawParam = req.params.userId;
    const rawUserId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    if (!rawUserId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    const user = await User.findByIdAndDelete(String(rawUserId).trim());
    if (user) {
      await Student.deleteOne({
        $or: [
          { user: user._id },
          { usn: user.identifier },
          { email: user.email },
        ],
        isApproved: false,
      });
    }

    return res.status(200).json({ message: 'Registration rejected and purged.' });
  } catch (error: any) {
    console.error('[Admin rejectUser Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Rejection failed: ${error.message}` });
  }
};

// ============================================================================
// 8. REALLOCATE STUDENTS TO TARGET MENTOR (Strict ID & Name Sync)
// ============================================================================
export const assignStudents = async (req: Request, res: Response) => {
  try {
    const { mentorId, studentIds } = req.body;
    if (!mentorId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res
        .status(400)
        .json({ error: 'Target mentorId and studentIds array are required.' });
    }

    const cleanMentorId = String(mentorId).trim();
    const mentorUser = await User.findOne({ identifier: cleanMentorId });
    const mentorName =
      mentorUser?.name ||
      (cleanMentorId === '0001'
        ? 'Dr. Kumar P K'
        : cleanMentorId === '1'
        ? 'Prof. Maddy'
        : `Faculty (${cleanMentorId})`);

    await Student.updateMany(
      {
        $or: [
          { usn: { $in: studentIds } },
          { tempAdmissionNo: { $in: studentIds } },
        ],
      },
      {
        $set: {
          mentorId: cleanMentorId,
          mentorName: mentorName,
        },
      }
    );

    return res.status(200).json({
      message: `Transferred ${studentIds.length} scholar(s) to ${mentorName}.`,
    });
  } catch (error: any) {
    console.error('[Admin assignStudents Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Allocation failed: ${error.message}` });
  }
};

// ============================================================================
// 9. INSTITUTIONAL REPORT & MENTOR RANKINGS (Excludes Unevaluated Placeholder Scores)
// ============================================================================
export const getInstitutionalReport = async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? String(req.query.year).trim() : undefined;
    const filter: any = { isApproved: true };
    if (year && year !== 'ALL') {
      filter.admissionYear = year;
    }

    const students = await Student.find(filter).sort({ usn: 1 }).lean();
    const configDoc = await SystemConfig.findOne().lean();
    const mentors = await User.find(
      { role: 'mentor' },
      'identifier name email designation'
    ).lean();

    const mentorNameMap = new Map(
      mentors.map((m: any) => [
        String(m.identifier).toLowerCase().trim(),
        m.name,
      ])
    );

    const wM = configDoc?.wM ?? 0.6;
    const wA = configDoc?.wA ?? 0.4;

    const records = (students || []).map((s: any) => {
      const hasHistory = Array.isArray(s.history) && s.history.length > 0;
      let safeMarks: number | null = null;
      let safeAttend: number | null = null;
      let safeTotal: number | null = null;

      if (hasHistory) {
        const last = s.history[s.history.length - 1];
        safeMarks =
          last?.marks !== undefined && last?.marks !== null
            ? Number(last.marks)
            : s.currentMarks !== undefined && s.currentMarks !== null
            ? Number(s.currentMarks)
            : null;
        safeAttend =
          last?.attendance !== undefined && last?.attendance !== null
            ? Number(last.attendance)
            : s.currentAttendance !== undefined && s.currentAttendance !== null
            ? Number(s.currentAttendance)
            : null;

        if (safeMarks !== null && safeAttend !== null) {
          safeTotal = Number((wM * safeMarks + wA * safeAttend).toFixed(2));
        }
      }

      const rawMentorId = s.mentorId
        ? String(s.mentorId).toLowerCase().trim()
        : '';
      const dynamicMentorName = !rawMentorId
        ? 'No Mentor'
        : mentorNameMap.get(rawMentorId) || s.mentorName || 'No Mentor';

      return {
        studId: s.usn,
        studentName: s.name,
        mentorId: s.mentorId || '',
        mentorName: dynamicMentorName,
        admissionYear: s.admissionYear || '2026',
        marks: safeMarks !== null ? safeMarks : 'Not Uploaded',
        attendance: safeAttend !== null ? safeAttend : 'Not Uploaded',
        total: safeTotal !== null ? safeTotal : 'Not Uploaded',
        riskLevel: hasHistory ? s.riskLevel || 'Satisfactory' : 'Not Uploaded',
        hasEvaluations: safeTotal !== null,
      };
    });

    return res.status(200).json({
      department: 'Department of Computer Science & Engineering',
      institution: 'Visvesvaraya Technological University, Mysuru',
      admissionYear: year || 'All Batches',
      records,
    });
  } catch (error: any) {
    console.error('[Admin getInstitutionalReport Error]:', error.message);
    return res
      .status(500)
      .json({ error: `Report generation failed: ${error.message}` });
  }
};