import { create } from 'zustand';
import { Alert } from 'react-native';
import { apiClient } from '../api/client';
import {
  IStudentEntity,
  IActionTask,
  IGuidanceQuery,
  IPendingRegistration,
} from '../types/mentoring.types';
import { ISystemConfig } from '../types/diagnostic.types';
import { useAuthStore } from './useAuthStore';

export interface IMentorEntity {
  id: string;
  name: string;
  email: string;
  designation: string;
  menteeCount?: number;
}

export interface IStudentWithMentor extends IStudentEntity {
  tempAdmissionNo?: string;
  mentorName?: string;
  email?: string;
  phone?: string;
  admissionYear: string;
  isApproved: boolean;
  currentMarks?: number | null;
  currentAttendance?: number | null;
  dynamicTotal?: number | null;
  riskLevel?: string;
  dossier?: any;
}

export interface IEvaluationPayload {
  studentId: string;
  term: string;
  marksObtained: number;
  totalMarks: number;
  attendedClasses: number;
  totalClasses: number;
}

export interface ICandidateAdmitPayload {
  name: string;
  email: string;
  phone?: string;
  mentorId?: string;
}

export interface IPickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

interface DataState {
  config: ISystemConfig;
  batchYears: string[];
  mentors: IMentorEntity[];
  students: IStudentWithMentor[];
  documents: any[];
  tasks: IActionTask[];
  queries: IGuidanceQuery[];
  pendingRegistrations: (IPendingRegistration & {
    admissionYear?: string;
    mentorId?: string;
  })[];
  selectedBatchYear: string;
  isLoading: boolean;
  setSelectedBatchYear: (year: string) => void;
  addCustomBatchYear: (year: string) => Promise<void>;
  createMentor: (payload: {
    name: string;
    identifier: string;
    email?: string;
    designation?: string;
    password?: string;
  }) => Promise<void>;
  reallotStudents: (mentorId: string, studentIds: string[]) => Promise<void>;
  syncFromDatabase: (
    role: 'admin' | 'mentor' | 'student',
    yearFilter?: string
  ) => Promise<void>;
  recordStudentEvaluation: (payload: IEvaluationPayload) => Promise<void>;
  batchAdmitCandidates: (
    candidates: ICandidateAdmitPayload[],
    admissionYear: string,
    defaultMentorId?: string
  ) => Promise<void>;
  assignOfficialUsn: (studentId: string, officialUsn: string) => Promise<void>;
  updateConfig: (newConfig: Partial<ISystemConfig>) => Promise<void>;
  updateRemarks: (studentId: string, remarks: string) => Promise<void>;
  addDocument: (formData: FormData) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  toggleDocVerify: (docId: string) => Promise<void>;
  addTask: (task: {
    studentId: string;
    title: string;
    description?: string;
    priority: string;
    dueDate: string;
    file?: IPickedFile | null;
  }) => Promise<void>;
  submitTaskProof: (
    taskId: string,
    payload: { remarks?: string; file?: IPickedFile | null }
  ) => Promise<void>;
  toggleTaskStatus: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addQuery: (query: { subject: string; message: string }) => Promise<void>;
  replyQuery: (queryId: string, reply: string) => Promise<void>;
  deleteQuery: (queryId: string) => Promise<void>;
  approveRegistration: (
    userId: string,
    mentorId?: string,
    admissionYear?: string
  ) => Promise<void>;
  rejectRegistration: (userId: string) => Promise<void>;
}

const mapTaskRecord = (t: any): IActionTask => ({
  id: t._id || t.id,
  studentId: t.studentId,
  mentorId: t.mentorId || '',
  title: t.title,
  description: t.description || '',
  priority: t.priority || 'Medium',
  dueDate: t.dueDate || 'Next Session',
  status: t.status || 'Pending',
  referenceFile: t.referenceFile || null,
  submission: t.submission || null,
});

const mapStudentRecord = (
  s: any,
  mentorMap?: Map<string, string>
): IStudentWithMentor => {
  const rawMentorId = String(s.mentorId ?? '').trim();
  const isUnassigned =
    !rawMentorId ||
    rawMentorId.toUpperCase() === 'UNASSIGNED' ||
    rawMentorId.toUpperCase() === 'NONE';
  const mId = isUnassigned ? '' : rawMentorId;
  const history = Array.isArray(s.history) ? s.history : [];
  const hasEvaluations = history.length > 0;
  const lastHist = hasEvaluations ? history[history.length - 1] : null;

  const rawMarks =
    hasEvaluations && lastHist?.marks !== undefined && lastHist?.marks !== null
      ? Number(lastHist.marks)
      : hasEvaluations && s.currentMarks !== undefined && s.currentMarks !== null
      ? Number(s.currentMarks)
      : null;

  const rawAttend =
    hasEvaluations &&
    lastHist?.attendance !== undefined &&
    lastHist?.attendance !== null
      ? Number(lastHist.attendance)
      : hasEvaluations &&
        s.currentAttendance !== undefined &&
        s.currentAttendance !== null
      ? Number(s.currentAttendance)
      : null;

  const rawTotal =
    rawMarks !== null && rawAttend !== null
      ? Number((0.6 * rawMarks + 0.4 * rawAttend).toFixed(2))
      : null;

  const resolvedMentorName = isUnassigned
    ? 'No Mentor'
    : (mentorMap ? mentorMap.get(mId.toLowerCase()) : undefined) ||
      s.mentorName ||
      (mId === '0001'
        ? 'Dr. Kumar P K'
        : mId === '1'
        ? 'Maddy'
        : `Faculty (${mId})`);

  return {
    id: s.usn || s.id,
    tempAdmissionNo: s.tempAdmissionNo,
    name: s.name || 'Scholar',
    email: s.email || '',
    phone: s.phone || '',
    mentorId: mId,
    mentorName: resolvedMentorName,
    admissionYear: s.admissionYear || '2026',
    remarks: s.remarks || '',
    history,
    currentMarks: rawMarks !== null && !isNaN(rawMarks) ? rawMarks : null,
    currentAttendance:
      rawAttend !== null && !isNaN(rawAttend) ? rawAttend : null,
    dynamicTotal: rawTotal !== null && !isNaN(rawTotal) ? rawTotal : null,
    riskLevel: hasEvaluations ? s.riskLevel || 'Satisfactory' : 'Not Evaluated',
    isApproved: s.isApproved === true,
    dossier: s.dossier || null,
  };
};

export const useDataContext = create<DataState>((set, get) => ({
  config: {
    thetaM: 5.0,
    thetaA: 7.5,
    wM: 0.6,
    wA: 0.4,
    dropDelta: -1.5,
  },
  batchYears: ['2026'],
  mentors: [],
  students: [],
  documents: [],
  tasks: [],
  queries: [],
  pendingRegistrations: [],
  selectedBatchYear: 'ALL',
  isLoading: false,

  setSelectedBatchYear: (year) => set({ selectedBatchYear: year }),

  addCustomBatchYear: async (year: string) => {
    const cleanYear = String(year || '').trim();
    if (!/^\d{4}$/.test(cleanYear)) {
      Alert.alert(
        'Invalid Year',
        'Please enter a valid 4-digit year (e.g. 2025 or 2027).'
      );
      return;
    }
    const existing = get().batchYears;
    if (!existing.includes(cleanYear)) {
      const nextYears = [...existing, cleanYear].sort(
        (a, b) => Number(b) - Number(a)
      );
      set({ batchYears: nextYears });
    }
    try {
      await apiClient.post('/admin/batches', { year: cleanYear });
    } catch {
      // Retained in local state if server route is offline
    }
  },

  createMentor: async ({ name, identifier, email, designation, password }) => {
    try {
      const res = await apiClient.post('/admin/mentors', {
        name,
        identifier,
        email,
        designation,
        password: password || 'password123',
      });
      Alert.alert(
        'Mentor Created',
        res.data?.message || `Faculty Mentor ${name} created.`
      );
      await get().syncFromDatabase('admin');
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        error.message ||
        'Failed to create mentor.';
      Alert.alert('Creation Error', msg);
      throw new Error(msg);
    }
  },

  reallotStudents: async (mentorId, studentIds) => {
    try {
      const cleanTargetId = String(mentorId).trim();
      const targetMentorObj = get().mentors.find(
        (m) => m.id.toLowerCase() === cleanTargetId.toLowerCase()
      );
      const resolvedMentorName =
        targetMentorObj?.name ||
        (cleanTargetId === '0001'
          ? 'Dr. Kumar P K'
          : cleanTargetId === '1'
          ? 'Maddy'
          : `Faculty (${cleanTargetId})`);

      const res = await apiClient.put('/admin/students/assign', {
        mentorId: cleanTargetId,
        studentIds,
      });

      const idSet = new Set(
        studentIds.map((id) => String(id).trim().toUpperCase())
      );
      set((state) => ({
        students: state.students.map((s) => {
          const matchUsn = idSet.has(String(s.id).trim().toUpperCase());
          const matchTemp =
            s.tempAdmissionNo &&
            idSet.has(String(s.tempAdmissionNo).trim().toUpperCase());
          if (!matchUsn && !matchTemp) return s;
          return {
            ...s,
            mentorId: cleanTargetId,
            mentorName: resolvedMentorName,
          };
        }),
      }));

      Alert.alert(
        'Scholars Re-Allotted',
        res.data?.message || 'Transfer completed.'
      );
      await get().syncFromDatabase('admin');
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        error.message ||
        'Failed to re-allot scholars.';
      Alert.alert('Transfer Error', msg);
      throw new Error(msg);
    }
  },

  syncFromDatabase: async (role, yearFilter) => {
    const targetYear = yearFilter || get().selectedBatchYear;
    set({ isLoading: true });
    try {
      const serverBase = (apiClient.defaults.baseURL || '').replace(
        '/api/v1',
        ''
      );
      const currentMentorId = String(
        useAuthStore.getState().user?.identifier || ''
      ).trim();

      if (role === 'admin') {
        const yearParam =
          targetYear && targetYear !== 'ALL'
            ? { params: { year: targetYear } }
            : {};
        const [mentorsRes, studentsRes, approvalsRes, configRes] =
          await Promise.all([
            apiClient.get('/admin/mentors').catch(() => ({ data: [] })),
            apiClient
              .get('/admin/students', yearParam)
              .catch(() => ({ data: [] })),
            apiClient.get('/admin/approvals').catch(() => ({ data: [] })),
            apiClient.get('/admin/config').catch(() => ({ data: null })),
          ]);

        const rawMentors = Array.isArray(mentorsRes.data)
          ? mentorsRes.data
          : mentorsRes.data?.mentors || [];
        const mentorsList: IMentorEntity[] = rawMentors.map((m: any) => ({
          id: String(m.id || m.identifier || '').trim(),
          name: m.name || 'Faculty Member',
          email: m.email || '',
          designation: m.designation || 'Faculty Mentor',
          menteeCount: m.menteeCount || 0,
        }));
        const mentorMap = new Map(
          mentorsList.map((m) => [m.id.toLowerCase(), m.name])
        );
        const rawStudents = Array.isArray(studentsRes.data)
          ? studentsRes.data
          : studentsRes.data?.students || [];
        const rawApprovals = Array.isArray(approvalsRes.data)
          ? approvalsRes.data
          : approvalsRes.data?.approvals || approvalsRes.data?.users || [];
        const resolvedConfig =
          configRes.data?.config || configRes.data || get().config;

        const discoveredYears = new Set<string>(['2026', ...get().batchYears]);
        if (Array.isArray(resolvedConfig?.activeBatches)) {
          resolvedConfig.activeBatches.forEach((yr: string) => {
            if (yr && /^\d{4}$/.test(String(yr)))
              discoveredYears.add(String(yr));
          });
        }
        rawStudents.forEach((s: any) => {
          if (s.admissionYear && /^\d{4}$/.test(String(s.admissionYear))) {
            discoveredYears.add(String(s.admissionYear));
          }
        });

        set({
          batchYears: Array.from(discoveredYears).sort(
            (a, b) => Number(b) - Number(a)
          ),
          mentors: mentorsList,
          students: rawStudents.map((s: any) => mapStudentRecord(s, mentorMap)),
          pendingRegistrations: rawApprovals.map((u: any) => ({
            id: u._id || u.id,
            name: u.name,
            identifier: u.identifier,
            role: u.role,
            submittedDate: u.createdAt
              ? new Date(u.createdAt).toLocaleDateString()
              : 'Recent',
            email: u.email || '',
            admissionYear: u.admissionYear || '2026',
            mentorId: u.mentorId || '',
          })),
          config: {
            thetaM: Number(resolvedConfig?.thetaM ?? 5.0),
            thetaA: Number(resolvedConfig?.thetaA ?? 7.5),
            wM: Number(resolvedConfig?.wM ?? 0.6),
            wA: Number(resolvedConfig?.wA ?? 0.4),
            dropDelta: Number(resolvedConfig?.dropDelta ?? -1.5),
          },
        });
      } else if (role === 'mentor') {
        const mentorParams: any = {};
        if (currentMentorId) mentorParams.mentorId = currentMentorId;
        if (targetYear && targetYear !== 'ALL') mentorParams.year = targetYear;

        const [menteesRes, docsRes, tasksRes, queriesRes] = await Promise.all([
          apiClient
            .get('/mentor/mentees', { params: mentorParams })
            .catch(() => ({ data: [] })),
          apiClient
            .get('/mentor/documents', { params: mentorParams })
            .catch(() => ({ data: [] })),
          apiClient
            .get('/mentor/tasks', { params: mentorParams })
            .catch(() => ({ data: [] })),
          apiClient
            .get('/mentor/inquiries', { params: mentorParams })
            .catch(() => ({ data: [] })),
        ]);

        const rawMentees = Array.isArray(menteesRes.data)
          ? menteesRes.data
          : menteesRes.data?.students || menteesRes.data?.mentees || [];
        const rawDocs = Array.isArray(docsRes.data)
          ? docsRes.data
          : docsRes.data?.documents || [];
        const rawTasks = Array.isArray(tasksRes.data)
          ? tasksRes.data
          : tasksRes.data?.tasks || [];
        const rawQueries = Array.isArray(queriesRes.data)
          ? queriesRes.data
          : queriesRes.data?.queries || queriesRes.data?.inquiries || [];

        const allMappedMentees: IStudentWithMentor[] = rawMentees.map(
          (s: any) => mapStudentRecord(s)
        );
        const myMentees: IStudentWithMentor[] = currentMentorId
          ? allMappedMentees.filter(
              (s: IStudentWithMentor) =>
                String(s.mentorId || '').trim().toLowerCase() ===
                currentMentorId.toLowerCase()
            )
          : allMappedMentees;
        const myMenteeUsnSet = new Set<string>(
          myMentees.map((s: IStudentWithMentor) =>
            String(s.id || '').trim().toUpperCase()
          )
        );

        const discoveredYears = new Set<string>(['2026', ...get().batchYears]);
        myMentees.forEach((s: IStudentWithMentor) => {
          if (s.admissionYear && /^\d{4}$/.test(String(s.admissionYear))) {
            discoveredYears.add(String(s.admissionYear));
          }
        });

        set({
          batchYears: Array.from(discoveredYears).sort(
            (a, b) => Number(b) - Number(a)
          ),
          students: myMentees,
          documents: rawDocs
            .filter((d: any) =>
              myMenteeUsnSet.has(
                String(d.studentId || '').trim().toUpperCase()
              )
            )
            .map((d: any) => {
              const rawUrl = d.fileUrl || '';
              return {
                id: d._id || d.id,
                _id: d._id || d.id,
                studentId: d.studentId,
                studentName: d.studentName || 'Scholar',
                category: d.category || 'Marks Card',
                title: d.title || 'Document',
                fileName: d.fileName || 'file.pdf',
                fileSize: d.fileSize || '1.2 MB',
                date:
                  d.date ||
                  (d.createdAt
                    ? new Date(d.createdAt).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]),
                verified: Boolean(d.verified),
                notes: d.notes || '',
                dossierSummary: d.dossierSummary || d.notes || '',
                dossierSnapshot: d.dossierSnapshot || null,
                mimeType: d.mimeType || 'application/pdf',
                fileUri: rawUrl
                  ? rawUrl.startsWith('http')
                    ? rawUrl
                    : `${serverBase}${rawUrl}`
                  : undefined,
              };
            }),
          tasks: rawTasks
            .filter((t: any) =>
              myMenteeUsnSet.has(
                String(t.studentId || '').trim().toUpperCase()
              )
            )
            .map(mapTaskRecord),
          queries: rawQueries
            .filter((q: any) =>
              myMenteeUsnSet.has(
                String(q.studentId || '').trim().toUpperCase()
              )
            )
            .map((q: any) => ({
              id: q._id || q.id,
              studentId: q.studentId,
              subject: q.subject,
              message: q.message,
              response: q.response || '',
              status: q.status || 'Pending',
            })),
        });
      } else if (role === 'student') {
        const [profileRes, docsRes, tasksRes, inquiriesRes] =
          await Promise.all([
            apiClient.get('/student/profile').catch(() => ({ data: null })),
            apiClient.get('/student/documents').catch(() => ({ data: [] })),
            apiClient.get('/student/tasks').catch(() => ({ data: [] })),
            apiClient.get('/student/inquiries').catch(() => ({ data: [] })),
          ]);

        const rawProfile = profileRes.data?.student || profileRes.data;
        const rawDocs = Array.isArray(docsRes.data)
          ? docsRes.data
          : docsRes.data?.documents || [];
        const rawTasks = Array.isArray(tasksRes.data)
          ? tasksRes.data
          : tasksRes.data?.tasks || [];
        const rawQueries = Array.isArray(inquiriesRes.data)
          ? inquiriesRes.data
          : inquiriesRes.data?.queries || inquiriesRes.data?.inquiries || [];

        if (rawProfile) {
          set({
            students: [mapStudentRecord({ ...rawProfile, isApproved: true })],
          });
        }

        set({
          documents: rawDocs.map((d: any) => {
            const rawUrl = d.fileUrl || '';
            return {
              id: d._id || d.id,
              _id: d._id || d.id,
              studentId: d.studentId,
              studentName: d.studentName || 'Scholar',
              category: d.category || 'Marks Card',
              title: d.title || 'Document',
              fileName: d.fileName || 'file.pdf',
              fileSize: d.fileSize || '1.2 MB',
              date:
                d.date ||
                (d.createdAt
                  ? new Date(d.createdAt).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0]),
              verified: Boolean(d.verified),
              notes: d.notes || '',
              dossierSummary: d.dossierSummary || d.notes || '',
              dossierSnapshot: d.dossierSnapshot || null,
              mimeType: d.mimeType || 'application/pdf',
              fileUri: rawUrl
                ? rawUrl.startsWith('http')
                  ? rawUrl
                  : `${serverBase}${rawUrl}`
                : undefined,
            };
          }),
          tasks: rawTasks.map(mapTaskRecord),
          queries: rawQueries.map((q: any) => ({
            id: q._id || q.id,
            studentId: q.studentId,
            subject: q.subject,
            message: q.message,
            response: q.response || '',
            status: q.status || 'Pending',
          })),
        });
      }
    } catch (error: any) {
      console.warn('[Sync Notice]:', error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  batchAdmitCandidates: async (
    candidates,
    admissionYear,
    defaultMentorId = '0001'
  ) => {
    try {
      const res = await apiClient.post('/admin/batch/admit', {
        candidates,
        admissionYear,
        defaultMentorId,
      });
      Alert.alert(
        'Admissions Enrolled',
        res.data?.message || 'Candidates enrolled.'
      );
      await get().syncFromDatabase('admin');
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      Alert.alert('Enrollment Error', msg);
      throw new Error(msg);
    }
  },

  assignOfficialUsn: async (studentId, officialUsn) => {
    try {
      const res = await apiClient.put(
        `/admin/students/${studentId}/assign-usn`,
        { officialUsn }
      );
      Alert.alert(
        'USN Assigned',
        res.data?.message || `Official USN assigned: ${officialUsn}`
      );
      await get().syncFromDatabase('admin');
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      Alert.alert('USN Update Failed', msg);
      throw new Error(msg);
    }
  },

  recordStudentEvaluation: async ({
    studentId,
    term,
    marksObtained,
    totalMarks,
    attendedClasses,
    totalClasses,
  }) => {
    const normalizedM = Number(((marksObtained / totalMarks) * 10).toFixed(2));
    const normalizedA = Number(
      ((attendedClasses / totalClasses) * 10).toFixed(2)
    );
    const computedTotal = Number(
      (0.6 * normalizedM + 0.4 * normalizedA).toFixed(2)
    );
    try {
      const res = await apiClient.post(
        `/mentor/mentees/${studentId}/evaluation`,
        {
          term,
          marks: normalizedM,
          attendance: normalizedA,
          rawMarks: { obtained: marksObtained, total: totalMarks },
          rawAttendance: { attended: attendedClasses, total: totalClasses },
        }
      );
      const serverStudent = res.data?.student;
      const serverHistory = serverStudent?.history;
      set((state) => ({
        students: state.students.map((s) => {
          if (s.id.toLowerCase() !== studentId.toLowerCase()) return s;
          return {
            ...s,
            currentMarks: normalizedM,
            currentAttendance: normalizedA,
            dynamicTotal: computedTotal,
            history: Array.isArray(serverHistory) ? serverHistory : s.history,
            isApproved: true,
          };
        }),
      }));
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      throw new Error(errorMsg);
    }
  },

  updateConfig: async (newConfig) => {
    try {
      const merged = { ...get().config, ...newConfig };
      const res = await apiClient.put('/admin/config', merged);
      set({ config: res.data?.config || res.data || merged });
    } catch (error: any) {
      Alert.alert(
        'DB Error',
        error.response?.data?.error || 'Failed to save config'
      );
    }
  },

  updateRemarks: async (studentId, remarks) => {
    try {
      await apiClient.put(`/mentor/mentees/${studentId}/remarks`, { remarks });
      set((state) => ({
        students: state.students.map((s) =>
          s.id === studentId ? { ...s, remarks } : s
        ),
      }));
    } catch (error: any) {
      Alert.alert(
        'DB Error',
        error.response?.data?.error || 'Failed to update remarks'
      );
    }
  },

  addDocument: async (formData: FormData) => {
    try {
      const res = await apiClient.post('/student/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = res.data?.document || res.data?.doc || res.data;
      const serverBase = (apiClient.defaults.baseURL || '').replace(
        '/api/v1',
        ''
      );
      const rawUrl = d.fileUrl || '';
      const newDoc: any = {
        id: d._id || d.id,
        _id: d._id || d.id,
        studentId: d.studentId,
        studentName: d.studentName || 'Scholar',
        category: d.category || 'Marks Card',
        title: d.title,
        fileName: d.fileName || 'file.pdf',
        fileSize: d.fileSize || '1.2 MB',
        date:
          d.date ||
          (d.createdAt
            ? new Date(d.createdAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]),
        verified: Boolean(d.verified),
        notes: d.notes || '',
        dossierSummary: d.dossierSummary || d.notes || '',
        dossierSnapshot: d.dossierSnapshot || null,
        mimeType: d.mimeType || 'application/pdf',
        fileUri: rawUrl
          ? rawUrl.startsWith('http')
            ? rawUrl
            : `${serverBase}${rawUrl}`
          : undefined,
      };
      set((state) => ({ documents: [newDoc, ...state.documents] }));
    } catch (error: any) {
      Alert.alert(
        'Upload Error',
        error.response?.data?.error || 'Failed to save document'
      );
    }
  },

  deleteDocument: async (docId) => {
    try {
      await apiClient.delete(`/student/documents/${docId}`);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== docId),
      }));
    } catch (error: any) {
      Alert.alert(
        'DB Error',
        error.response?.data?.error || 'Failed to delete document'
      );
    }
  },

  toggleDocVerify: async (docId) => {
    try {
      const res = await apiClient.put(`/mentor/documents/${docId}/verify`);
      const updatedVerified =
        res.data?.doc?.verified ?? res.data?.verified ?? true;
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === docId ? { ...d, verified: updatedVerified } : d
        ),
      }));
    } catch (error: any) {
      Alert.alert(
        'DB Error',
        error.response?.data?.error || 'Failed to update verification'
      );
    }
  },

  // addTask: async (taskPayload) => {
  //   try {
  //     const formData = new FormData();
  //     formData.append('studentId', taskPayload.studentId);
  //     formData.append('title', taskPayload.title.trim());
  //     formData.append('description', taskPayload.description?.trim() || '');
  //     formData.append('priority', taskPayload.priority || 'Medium');
  //     formData.append('dueDate', taskPayload.dueDate || 'Next Session');

  //     const mentorId = String(
  //       useAuthStore.getState().user?.identifier || ''
  //     ).trim();
  //     if (mentorId) formData.append('mentorId', mentorId);

  //     if (taskPayload.file) {
  //       formData.append('file', {
  //         uri: taskPayload.file.uri,
  //         name: taskPayload.file.name || `reference_${Date.now()}.pdf`,
  //         type: taskPayload.file.mimeType || 'application/pdf',
  //       } as any);
  //     }

  //     const res = await apiClient.post('/mentor/tasks', formData, {
  //       headers: { 'Content-Type': 'multipart/form-data' },
  //     });

  //     const data = res.data;
  //     if (Array.isArray(data?.tasks)) {
  //       const createdBatch = data.tasks.map(mapTaskRecord);
  //       set((state) => ({ tasks: [...createdBatch, ...state.tasks] }));
  //     } else {
  //       const t = data?.task || data;
  //       set((state) => ({ tasks: [mapTaskRecord(t), ...state.tasks] }));
  //     }
  //   } catch (error: any) {
  //     const errorMsg =
  //       error.response?.data?.error || error.message || 'Failed to dispatch task';
  //     Alert.alert('Task Error', errorMsg);
  //     throw new Error(errorMsg);
  //   }
  // },
addTask: async (taskPayload) => {
    try {
      const mentorId = String(
        useAuthStore.getState().user?.identifier || ''
      ).trim();

      let res;
      if (taskPayload.file) {
        const formData = new FormData();
        formData.append('studentId', taskPayload.studentId);
        formData.append('title', taskPayload.title.trim());
        formData.append('description', taskPayload.description?.trim() || '');
        formData.append('priority', taskPayload.priority || 'Medium');
        formData.append('dueDate', taskPayload.dueDate || 'Next Session');
        if (mentorId) formData.append('mentorId', mentorId);

        formData.append('file', {
          uri: taskPayload.file.uri,
          name: taskPayload.file.name || `reference_${Date.now()}.pdf`,
          type: taskPayload.file.mimeType || 'application/pdf',
        } as any);

        res = await apiClient.post('/mentor/tasks', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await apiClient.post('/mentor/tasks', {
          studentId: taskPayload.studentId,
          title: taskPayload.title.trim(),
          description: taskPayload.description?.trim() || '',
          priority: taskPayload.priority || 'Medium',
          dueDate: taskPayload.dueDate || 'Next Session',
          mentorId,
        });
      }

      const data = res.data;
      if (Array.isArray(data?.tasks)) {
        const createdBatch = data.tasks.map(mapTaskRecord);
        set((state) => ({ tasks: [...createdBatch, ...state.tasks] }));
      } else {
        const t = data?.task || data;
        set((state) => ({ tasks: [mapTaskRecord(t), ...state.tasks] }));
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || error.message || 'Failed to dispatch task';
      Alert.alert('Task Error', errorMsg);
    }
  },
  submitTaskProof: async (taskId, { remarks, file }) => {
    try {
      const formData = new FormData();
      formData.append('remarks', remarks?.trim() || '');
      if (file) {
        formData.append('file', {
          uri: file.uri,
          name: file.name || `proof_${Date.now()}.pdf`,
          type: file.mimeType || 'application/pdf',
        } as any);
      }

      const res = await apiClient.post(
        `/student/tasks/${taskId}/submit`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      const updated = res.data?.task ? mapTaskRecord(res.data.task) : null;
      if (updated) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        }));
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        error.message ||
        'Failed to submit proof';
      Alert.alert('Submission Error', msg);
      throw new Error(msg);
    }
  },

  toggleTaskStatus: async (taskId) => {
    const currentTask = get().tasks.find((t) => t.id === taskId);
    const isCurrentlyCompleted =
      String(currentTask?.status || '').toLowerCase() === 'completed';
    const nextStatus = isCurrentlyCompleted ? 'Pending' : 'Completed';

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: nextStatus } : t
      ),
    }));

    try {
      const res = await apiClient.put(`/student/tasks/${taskId}/toggle`, {
        status: nextStatus,
      });
      const updatedStatus = res.data?.task?.status || res.data?.status;
      if (updatedStatus) {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: updatedStatus } : t
          ),
        }));
      }
    } catch {
      try {
        await apiClient.put(`/mentor/tasks/${taskId}`, { status: nextStatus });
      } catch {
        // Optimistic status retained
      }
    }
  },

  deleteTask: async (taskId) => {
    try {
      await apiClient.delete(`/mentor/tasks/${taskId}`);
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
    } catch (error: any) {
      Alert.alert(
        'DB Error',
        error.response?.data?.error || 'Failed to delete task'
      );
    }
  },

  addQuery: async ({ subject, message }) => {
    try {
      const res = await apiClient.post('/student/inquiries', {
        subject,
        message,
      });
      const q = res.data?.query || res.data;
      const newQuery: IGuidanceQuery = {
        id: q._id || q.id,
        studentId: q.studentId,
        subject: q.subject,
        message: q.message,
        response: q.response || '',
        status: q.status || 'Pending',
      };
      set((state) => ({ queries: [newQuery, ...state.queries] }));
    } catch (error: any) {
      Alert.alert(
        'DB Error',
        error.response?.data?.error || 'Failed to dispatch inquiry'
      );
    }
  },

  replyQuery: async (queryId, reply) => {
    try {
      await apiClient.put(`/mentor/inquiries/${queryId}/reply`, {
        response: reply,
      });
      set((state) => ({
        queries: state.queries.map((q) =>
          q.id === queryId ? { ...q, response: reply, status: 'Answered' } : q
        ),
      }));
    } catch (error: any) {
      Alert.alert(
        'DB Error',
        error.response?.data?.error || 'Failed to save response'
      );
    }
  },

  deleteQuery: async (queryId) => {
    try {
      await apiClient.delete(`/mentor/inquiries/${queryId}`);
      set((state) => ({
        queries: state.queries.filter((q) => q.id !== queryId),
      }));
    } catch (error: any) {
      Alert.alert(
        'DB Error',
        error.response?.data?.error || 'Failed to dismiss inquiry'
      );
    }
  },

  approveRegistration: async (userId, mentorId = '', admissionYear) => {
    try {
      await apiClient.put(`/admin/approvals/${userId}/approve`, {
        mentorId: mentorId || '',
        admissionYear,
      });
      await get().syncFromDatabase('admin');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to approve user';
      Alert.alert('DB Error', msg);
      throw new Error(msg);
    }
  },

  rejectRegistration: async (userId) => {
    try {
      await apiClient.delete(`/admin/approvals/${userId}/reject`);
      set((state) => ({
        pendingRegistrations: state.pendingRegistrations.filter(
          (r) => r.id !== userId
        ),
      }));
    } catch (error: any) {
      Alert.alert(
        'DB Error',
        error.response?.data?.error || 'Failed to reject registration'
      );
    }
  },
}));