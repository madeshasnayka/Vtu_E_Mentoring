import { apiClient } from './client';

// ==========================================
// 1. ADMIN DESK ENDPOINTS
// ==========================================

export const apiGetAvailableMentors = async () => {
  const res = await apiClient.get('/admin/mentors');
  return res.data;
};

export const apiAssignStudentsToMentor = async (mentorId: string, studentIds: string[]) => {
  const res = await apiClient.put('/admin/students/assign', { mentorId, studentIds });
  return res.data;
};

export const apiGetPendingApprovals = async () => {
  const res = await apiClient.get('/admin/approvals');
  return res.data;
};

export const apiApproveUser = async (userId: string) => {
  const res = await apiClient.put(`/admin/approvals/${userId}/approve`);
  return res.data;
};

export const apiRejectUser = async (userId: string) => {
  const res = await apiClient.delete(`/admin/approvals/${userId}/reject`);
  return res.data;
};

export const apiScanBatchRange = async (prefix: string) => {
  const res = await apiClient.get('/admin/batch/scan', { params: { prefix } });
  return res.data;
};

export const apiCreateBatchStudents = async (rollNumbers: string[], mentorId: string) => {
  const res = await apiClient.post('/admin/batch/create', { rollNumbers, mentorId });
  return res.data;
};

export const apiUpdateSystemConfig = async (config: any) => {
  const res = await apiClient.put('/admin/config', config);
  return res.data;
};

// ==========================================
// 2. MENTOR DESK ENDPOINTS
// ==========================================

export const apiGetAssignedMentees = async () => {
  const res = await apiClient.get('/mentor/mentees');
  return res.data;
};

export const apiUpdateRemarks = async (studentId: string, remarks: string) => {
  const res = await apiClient.put(`/mentor/mentees/${studentId}/remarks`, { remarks });
  return res.data;
};

export const apiGetMenteeDocuments = async () => {
  const res = await apiClient.get('/mentor/documents');
  return res.data;
};

export const apiToggleDocVerify = async (docId: string) => {
  const res = await apiClient.put(`/mentor/documents/${docId}/verify`);
  return res.data;
};

export const apiCreateTask = async (task: { studentId: string; title: string; priority: string; dueDate: string }) => {
  const res = await apiClient.post('/mentor/tasks', task);
  return res.data;
};

export const apiDeleteTask = async (taskId: string) => {
  const res = await apiClient.delete(`/mentor/tasks/${taskId}`);
  return res.data;
};

export const apiGetMentorInquiries = async () => {
  const res = await apiClient.get('/mentor/inquiries');
  return res.data;
};

export const apiReplyInquiry = async (queryId: string, response: string) => {
  const res = await apiClient.put(`/mentor/inquiries/${queryId}/reply`, { response });
  return res.data;
};

export const apiDeleteInquiry = async (queryId: string) => {
  const res = await apiClient.delete(`/mentor/inquiries/${queryId}`);
  return res.data;
};

// ==========================================
// 3. STUDENT PORTAL ENDPOINTS
// ==========================================

export const apiGetStudentProfile = async () => {
  const res = await apiClient.get('/student/profile');
  return res.data;
};

export const apiGetStudentTasks = async () => {
  const res = await apiClient.get('/student/tasks');
  return res.data;
};

export const apiToggleTaskStatus = async (taskId: string) => {
  const res = await apiClient.put(`/student/tasks/${taskId}/toggle`);
  return res.data;
};

export const apiCreateInquiry = async (subject: string, message: string) => {
  const res = await apiClient.post('/student/inquiries', { subject, message });
  return res.data;
};

export const apiGetStudentInquiries = async () => {
  const res = await apiClient.get('/student/inquiries');
  return res.data;
};