import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

const formatOffsetDate = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

export const TaskDeskScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const {
    students,
    tasks,
    addTask,
    toggleTaskStatus,
    deleteTask,
    syncFromDatabase,
  } = useDataContext();

  const [refreshing, setRefreshing] = useState(false);
  const [menteeSearch, setMenteeSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium'>('High');
  const [dueDate, setDueDate] = useState<string>(formatOffsetDate(7));

  const [taskSearch, setTaskSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Completed'>('ALL');
  const [viewingTask, setViewingTask] = useState<any | null>(null);

  useFocusEffect(
    useCallback(() => {
      syncFromDatabase('mentor');
    }, [syncFromDatabase])
  );

  useEffect(() => {
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromDatabase('mentor');
    setRefreshing(false);
  };

  const filteredMentees = useMemo(() => {
    const q = menteeSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.id).toLowerCase().includes(q)
    );
  }, [students, menteeSearch]);

  const studentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(String(s.id).toUpperCase(), s.name));
    return map;
  }, [students]);

  const datePresets = useMemo(
    () => [
      { label: '+3 Days', value: formatOffsetDate(3) },
      { label: '+7 Days', value: formatOffsetDate(7) },
      { label: '+14 Days', value: formatOffsetDate(14) },
    ],
    []
  );

  const handleAssignTask = async () => {
    const targetUsn = selectedStudentId || students[0]?.id;
    if (!targetUsn || !taskTitle.trim()) {
      Alert.alert('Missing Fields', 'Please select a mentee and enter a task title.');
      return;
    }

    await addTask({
      studentId: targetUsn,
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      priority,
      dueDate: dueDate.trim() || formatOffsetDate(7),
    });

    setTaskTitle('');
    setTaskDescription('');
    Alert.alert('Assigned', 'Remedial action plan assigned to mentee.');
  };

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return tasks.filter((t) => {
      const isDone = String(t.status || '').toLowerCase() === 'completed';
      if (statusFilter === 'Pending' && isDone) return false;
      if (statusFilter === 'Completed' && !isDone) return false;

      if (!q) return true;
      const sName = (
        studentNameMap.get(String(t.studentId).toUpperCase()) || ''
      ).toLowerCase();
      return (
        sName.includes(q) ||
        String(t.studentId).toLowerCase().includes(q) ||
        String(t.title).toLowerCase().includes(q)
      );
    });
  }, [tasks, taskSearch, statusFilter, studentNameMap]);

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />
      <View style={styles.appTopbar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topbarKicker}>FACULTY MENTORING WORKSPACE</Text>
          <Text style={styles.topbarTitle}>{user?.name || 'Dr. Kumar P K'}</Text>
          <Text style={styles.topbarSub}>
            Faculty ID: {user?.identifier || '0001'} • Remedial Action Desk
          </Text>
        </View>
        <TouchableOpacity style={styles.btnGhostSm} onPress={logout}>
          <Text style={styles.btnGhostSmText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.adminMain}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 104 },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
          />
        }
      >
        <View style={styles.sectionHead}>
          <Text style={styles.sectionHeadTitle}>Remedial Action Plans</Text>
          <Text style={styles.sectionHeadSub}>Assign & track scholar tasks</Text>
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>Assign New Action Task</Text>

          <Text style={styles.label}>SEARCH & SELECT MENTEE</Text>
          <View style={styles.searchBox}>
            <Svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Circle cx="11" cy="11" r="8" />
              <Line x1="21" y1="21" x2="16.65" y2="16.65" />
            </Svg>
            <TextInput
              style={styles.searchInput}
              placeholder="Search mentee by name or USN..."
              placeholderTextColor="#91a0b8"
              value={menteeSearch}
              onChangeText={setMenteeSearch}
            />
            {menteeSearch.length > 0 && (
              <TouchableOpacity onPress={() => setMenteeSearch('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.menteeChipsRow}
          >
            {filteredMentees.map((s) => {
              const currentId = selectedStudentId || students[0]?.id;
              const active = currentId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.yearPill, active && styles.yearPillActive]}
                  onPress={() => setSelectedStudentId(s.id)}
                >
                  <Text
                    style={[
                      styles.yearPillText,
                      active && styles.yearPillTextActive,
                    ]}
                  >
                    {s.name} ({s.id})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.label, { marginTop: 12 }]}>TASK TITLE *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Complete Module 2 Lab Assignment"
            placeholderTextColor="#91a0b8"
            value={taskTitle}
            onChangeText={setTaskTitle}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>
            TASK DESCRIPTION & DELIVERABLES
          </Text>
          <TextInput
            style={[styles.formInput, { minHeight: 72 }]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholder="Describe specific instructions or deliverables expected from the scholar..."
            placeholderTextColor="#91a0b8"
            value={taskDescription}
            onChangeText={setTaskDescription}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>PRIORITY</Text>
              <View style={styles.priorityToggle}>
                {(['High', 'Medium'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityBtn,
                      priority === p && styles.priorityBtnActive,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityBtnText,
                        priority === p && styles.priorityBtnTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flex: 1.15 }}>
              <Text style={styles.label}>DEADLINE DATE (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="2026-11-25"
                placeholderTextColor="#91a0b8"
              />
            </View>
          </View>

          <View style={styles.datePresetRow}>
            <Text style={styles.datePresetLabel}>Quick Deadline:</Text>
            {datePresets.map((d) => {
              const active = dueDate === d.value;
              return (
                <TouchableOpacity
                  key={d.label}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  onPress={() => setDueDate(d.value)}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      active && styles.dateChipTextActive,
                    ]}
                  >
                    {d.label} ({d.value.slice(5)})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleAssignTask}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>+ Assign Task to Mentee</Text>
          </TouchableOpacity>
        </View>

        {/* Assigned Tasks Filter Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionHeadTitle}>
            Assigned Tasks ({filteredTasks.length})
          </Text>
          <View style={styles.statusFilterRow}>
            {(['ALL', 'Pending', 'Completed'] as const).map((st) => {
              const active = statusFilter === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setStatusFilter(st)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: '#ffffff', marginBottom: 12 }]}>
          <Svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748b"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Circle cx="11" cy="11" r="8" />
            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="Filter tasks by student name, USN, or title..."
            placeholderTextColor="#91a0b8"
            value={taskSearch}
            onChangeText={setTaskSearch}
          />
        </View>

        {filteredTasks.map((t) => {
          const isDone = String(t.status || '').toLowerCase() === 'completed';
          const stu = students.find((s) => s.id === t.studentId);
          const parts = String(t.title || '').split(' — ');
          const mainTitle = parts[0];
          const subDesc = parts.slice(1).join(' — ');

          return (
            <View
              key={t.id}
              style={[
                styles.taskCard,
                isDone ? styles.taskCardDone : styles.taskCardHigh,
              ]}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{mainTitle}</Text>
                <View
                  style={[
                    styles.taskBadge,
                    isDone ? styles.badgeDone : styles.badgeHigh,
                  ]}
                >
                  <Text
                    style={[
                      styles.taskBadgeText,
                      isDone ? styles.badgeDoneText : styles.badgeHighText,
                    ]}
                  >
                    {isDone ? 'COMPLETED' : 'PENDING'}
                  </Text>
                </View>
              </View>

              <Text style={styles.taskMetaText}>
                Scholar: {stu?.name || 'Scholar'} ({t.studentId}) • Due: {t.dueDate}
              </Text>

              {Boolean(subDesc) && (
                <Text style={styles.taskDescBox} numberOfLines={2}>
                  {subDesc}
                </Text>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.btnSm,
                    isDone ? styles.btnSmOutline : styles.btnSmSuccess,
                  ]}
                  onPress={() => toggleTaskStatus(t.id)}
                >
                  <Text
                    style={[
                      styles.btnSmText,
                      isDone ? styles.btnSmOutlineText : styles.btnSmSuccessText,
                    ]}
                  >
                    {isDone ? '↺ Reopen Pending' : '✓ Complete'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnSm, styles.btnSmView]}
                  onPress={() =>
                    setViewingTask({
                      ...t,
                      scholarName: stu?.name || 'Scholar',
                      mainTitle,
                      subDesc,
                      isDone,
                    })
                  }
                >
                  <Text style={[styles.btnSmText, styles.btnSmViewText]}>
                    View Task
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnSm, styles.btnSmDanger]}
                  onPress={() => deleteTask(t.id)}
                >
                  <Text style={[styles.btnSmText, styles.btnSmDangerText]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* View Submitted / Assigned Task Details Modal */}
      <Modal
        visible={Boolean(viewingTask)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingTask(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalKicker}>ACTION PLAN DETAILS</Text>
              <View
                style={[
                  styles.taskBadge,
                  viewingTask?.isDone ? styles.badgeDone : styles.badgeHigh,
                ]}
              >
                <Text
                  style={[
                    styles.taskBadgeText,
                    viewingTask?.isDone
                      ? styles.badgeDoneText
                      : styles.badgeHighText,
                  ]}
                >
                  {viewingTask?.isDone ? 'COMPLETED' : 'PENDING'}
                </Text>
              </View>
            </View>

            <Text style={styles.modalTitle}>{viewingTask?.mainTitle}</Text>
            <Text style={styles.modalSubMeta}>
              Scholar: {viewingTask?.scholarName} ({viewingTask?.studentId})
            </Text>
            <Text style={styles.modalSubMeta}>
              Priority: {viewingTask?.priority || 'High'} • Deadline:{' '}
              {viewingTask?.dueDate}
            </Text>

            <View style={styles.modalDescContainer}>
              <Text style={styles.modalDescLabel}>INSTRUCTIONS & SUBMISSION NOTES</Text>
              <Text style={styles.modalDescText}>
                {viewingTask?.subDesc ||
                  'Complete the assigned academic action item and report progress during the upcoming counseling review.'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setViewingTask(null)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => {
                  if (viewingTask) {
                    toggleTaskStatus(viewingTask.id);
                    setViewingTask(null);
                  }
                }}
              >
                <Text style={styles.modalActionText}>
                  {viewingTask?.isDone ? 'Reopen as Pending' : '✓ Mark Completed'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TaskDeskScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#1e1b4b' },
  appTopbar: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topbarKicker: {
    color: '#a5b4fc',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  topbarTitle: {
    marginTop: 3,
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '800',
  },
  topbarSub: { fontSize: 11, color: '#cbd5e1', marginTop: 2 },
  btnGhostSm: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  btnGhostSmText: { color: '#ffffff', fontSize: 11.5, fontWeight: '600' },
  adminMain: { flex: 1, backgroundColor: '#f3f6fc' },
  scrollContent: { padding: 15 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 13,
  },
  sectionHeadTitle: { color: '#172f55', fontSize: 15.5, fontWeight: '800' },
  sectionHeadSub: { color: '#5e6f8c', fontSize: 10.5, fontWeight: '600' },
  panelCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  panelTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#172b4d',
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fb',
  },
  label: {
    color: '#5e6f8c',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbfdff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 11,
    paddingHorizontal: 12,
    minHeight: 40,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 12.5, color: '#172b4d', paddingVertical: 6 },
  clearBtn: { fontSize: 13, fontWeight: '800', color: '#91a0b8', paddingHorizontal: 4 },
  menteeChipsRow: { flexDirection: 'row', gap: 6 },
  yearPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#f7f9fd',
  },
  yearPillActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  yearPillText: { fontSize: 11, fontWeight: '700', color: '#5e6f8c' },
  yearPillTextActive: { color: '#ffffff', fontWeight: '800' },
  formInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 11,
    backgroundColor: '#fbfdff',
    color: '#172b4d',
    fontSize: 13,
  },
  priorityToggle: {
    flexDirection: 'row',
    backgroundColor: '#edf2fb',
    padding: 3,
    borderRadius: 10,
    minHeight: 44,
  },
  priorityBtn: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBtnActive: { backgroundColor: '#ffffff', elevation: 1 },
  priorityBtnText: { fontSize: 11, fontWeight: '700', color: '#5e6f8c' },
  priorityBtnTextActive: { color: '#4f46e5', fontWeight: '800' },
  datePresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  datePresetLabel: { fontSize: 10.5, fontWeight: '700', color: '#5e6f8c' },
  dateChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  dateChipActive: { backgroundColor: '#eef2ff', borderColor: '#a5b4fc' },
  dateChipText: { fontSize: 10.5, fontWeight: '700', color: '#475569' },
  dateChipTextActive: { color: '#4f46e5', fontWeight: '800' },
  btnPrimary: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  btnPrimaryText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusFilterRow: { flexDirection: 'row', gap: 6 },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  filterPillActive: { backgroundColor: '#4f46e5' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterPillTextActive: { color: '#ffffff', fontWeight: '800' },
  taskCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 15,
    padding: 15,
    marginBottom: 11,
    borderLeftWidth: 4,
    elevation: 1,
  },
  taskCardHigh: { borderLeftColor: '#be123c' },
  taskCardDone: { borderLeftColor: '#047857' },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  taskTitle: { fontSize: 14, fontWeight: '800', color: '#172b4d', flex: 1 },
  taskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeHigh: { backgroundColor: '#fff1f2' },
  badgeDone: { backgroundColor: '#ecfdf5' },
  taskBadgeText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  badgeHighText: { color: '#be123c' },
  badgeDoneText: { color: '#047857' },
  taskMetaText: { fontSize: 11.5, color: '#5e6f8c' },
  taskDescBox: {
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#f8fafc',
    padding: 9,
    borderRadius: 8,
    marginTop: 8,
  },
  btnSm: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  btnSmSuccess: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  btnSmOutline: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  btnSmView: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  btnSmDanger: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  btnSmText: { fontSize: 11.5, fontWeight: '700' },
  btnSmSuccessText: { color: '#047857' },
  btnSmOutlineText: { color: '#b45309' },
  btnSmViewText: { color: '#4f46e5' },
  btnSmDangerText: { color: '#be123c' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalKicker: { fontSize: 10, fontWeight: '800', color: '#4f46e5', letterSpacing: 0.8 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  modalSubMeta: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
  modalDescContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
    marginBottom: 16,
  },
  modalDescLabel: { fontSize: 9.5, fontWeight: '800', color: '#64748b', marginBottom: 5 },
  modalDescText: { fontSize: 13, color: '#1e293b', lineHeight: 19 },
  modalCloseBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  modalActionBtn: {
    flex: 1.5,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  modalActionText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
});