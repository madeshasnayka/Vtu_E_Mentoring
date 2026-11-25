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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext, IPickedFile } from '../../context/useDataContext';

const formatOffsetDate = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

export const TaskDeskScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
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
  const [submitting, setSubmitting] = useState(false);
  const [menteeSearch, setMenteeSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium'>('High');
  const [dueDate, setDueDate] = useState<string>(formatOffsetDate(7));
  const [attachedFile, setAttachedFile] = useState<IPickedFile | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'Pending' | 'Completed'
  >('ALL');

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

  const handlePickReference = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setAttachedFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/pdf',
          size: asset.size,
        });
      }
    } catch {
      Alert.alert('File Picker Error', 'Unable to open document picker.');
    }
  };

  const handleAssignTask = async () => {
    const targetUsn = selectedStudentId || students[0]?.id;
    if (!targetUsn || !taskTitle.trim()) {
      Alert.alert(
        'Missing Fields',
        'Please select a mentee and enter a task title.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await addTask({
        studentId: targetUsn,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        priority,
        dueDate: dueDate.trim() || formatOffsetDate(7),
        file: attachedFile,
      });
      setTaskTitle('');
      setTaskDescription('');
      setAttachedFile(null);
      Alert.alert('Assigned', 'Remedial action plan assigned to mentee.');
    } finally {
      setSubmitting(false);
    }
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
              const active = (selectedStudentId || students[0]?.id) === s.id;
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
                placeholder="2026-12-02"
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

          {/* Optional Reference Document Picker */}
          <Text style={[styles.label, { marginTop: 14 }]}>
            REFERENCE DOCUMENT (OPTIONAL — PDF OR IMAGE)
          </Text>
          {!attachedFile ? (
            <TouchableOpacity
              style={styles.uploadZone}
              onPress={handlePickReference}
              activeOpacity={0.8}
            >
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f46e5"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <Polyline points="17 8 12 3 7 8" />
                <Line x1="12" y1="3" x2="12" y2="15" />
              </Svg>
              <Text style={styles.uploadZoneText}>
                Attach Reference PDF or Image
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.attachedPill}>
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f46e5"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <Polyline points="14 2 14 8 20 8" />
              </Svg>
              <Text style={styles.attachedName} numberOfLines={1}>
                {attachedFile.name}
              </Text>
              <TouchableOpacity
                onPress={() => setAttachedFile(null)}
                style={styles.removeChipBtn}
              >
                <Text style={styles.removeChipText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, submitting && { opacity: 0.7 }]}
            onPress={handleAssignTask}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnPrimaryText}>+ Assign Task to Mentee</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Redesigned Assigned Tasks Section */}
        <Text style={[styles.sectionHeadTitle, { marginBottom: 10 }]}>
          Assigned Tasks ({filteredTasks.length})
        </Text>

        <View style={styles.segmentedBar}>
          {(['ALL', 'Pending', 'Completed'] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.segBtn, active && styles.segBtnActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Text
                  style={[styles.segBtnText, active && styles.segBtnTextActive]}
                >
                  {st === 'ALL' ? 'All' : st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: '#ffffff', marginBottom: 12 },
          ]}
        >
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
          const mainTitle = String(t.title || '').split(' — ')[0];
          const hasProof = Boolean(t.submission?.fileUrl);

          return (
            <View
              key={t.id}
              style={[
                styles.taskCard,
                isDone ? styles.taskCardDone : styles.taskCardPending,
              ]}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle} numberOfLines={2}>
                  {mainTitle}
                </Text>
                <View
                  style={[
                    styles.taskBadge,
                    isDone ? styles.badgeDone : styles.badgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.taskBadgeText,
                      isDone ? styles.badgeDoneText : styles.badgePendingText,
                    ]}
                  >
                    {isDone ? 'COMPLETED' : 'PENDING'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.taskMetaText}>
                  {stu?.name || 'Scholar'} ({t.studentId})
                </Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.taskMetaText}>Due {t.dueDate}</Text>
              </View>

              {(hasProof || Boolean(t.referenceFile?.fileUrl)) && (
                <View style={styles.tagRow}>
                  {hasProof && (
                    <View style={styles.proofTag}>
                      <Svg
                        width={12}
                        height={12}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <Path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </Svg>
                      <Text style={styles.proofTagText}>Proof Attached</Text>
                    </View>
                  )}
                  {Boolean(t.referenceFile?.fileUrl) && (
                    <View style={styles.refTag}>
                      <Text style={styles.refTagText}>Ref Attached</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.cardActionBar}>
                <TouchableOpacity
                  style={styles.btnViewPrimary}
                  onPress={() =>
                    navigation.navigate('MentorTaskDetail', {
                      taskId: t.id,
                      scholarName: stu?.name || 'Scholar',
                    })
                  }
                >
                  <Svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <Circle cx="12" cy="12" r="3" />
                  </Svg>
                  <Text style={styles.btnViewPrimaryText}>View Task</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btnToggle,
                    isDone ? styles.btnReopen : styles.btnComplete,
                  ]}
                  onPress={() => toggleTaskStatus(t.id)}
                >
                  <Text
                    style={[
                      styles.btnToggleText,
                      isDone ? styles.btnReopenText : styles.btnCompleteText,
                    ]}
                  >
                    {isDone ? 'Reopen' : 'Complete'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnTrashSquare}
                  onPress={() =>
                    Alert.alert(
                      'Delete Task',
                      'Permanently delete this task and its attachments?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteTask(t.id),
                        },
                      ]
                    )
                  }
                >
                  <Svg
                    width={15}
                    height={15}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#be123c"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Polyline points="3 6 5 6 21 6" />
                    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
    marginBottom: 12,
  },
  sectionHeadTitle: { color: '#172f55', fontSize: 15.5, fontWeight: '800' },
  sectionHeadSub: { color: '#5e6f8c', fontSize: 10.5, fontWeight: '600' },
  panelCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
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
  clearBtn: {
    fontSize: 13,
    fontWeight: '800',
    color: '#91a0b8',
    paddingHorizontal: 4,
  },
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
  uploadZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#a5b4fc',
    backgroundColor: '#f5f7ff',
    borderRadius: 12,
    paddingVertical: 13,
  },
  uploadZoneText: { fontSize: 12.5, fontWeight: '700', color: '#4f46e5' },
  attachedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attachedName: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#1e1b4b' },
  removeChipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fff1f2',
  },
  removeChipText: { fontSize: 11, fontWeight: '800', color: '#be123c' },
  btnPrimary: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  btnPrimaryText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  segBtnActive: { backgroundColor: '#ffffff', elevation: 1 },
  segBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  segBtnTextActive: { color: '#4f46e5', fontWeight: '800' },
  taskCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 15,
    padding: 14,
    marginBottom: 11,
    borderLeftWidth: 3.5,
    elevation: 1,
  },
  taskCardPending: { borderLeftColor: '#d97706' },
  taskCardDone: { borderLeftColor: '#059669' },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  taskTitle: { fontSize: 14, fontWeight: '800', color: '#172b4d', flex: 1 },
  taskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgePending: { backgroundColor: '#fffbeb' },
  badgeDone: { backgroundColor: '#ecfdf5' },
  taskBadgeText: { fontSize: 9.5, fontWeight: '800' },
  badgePendingText: { color: '#b45309' },
  badgeDoneText: { color: '#047857' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  taskMetaText: { fontSize: 11.5, color: '#5e6f8c', fontWeight: '600' },
  metaDot: { fontSize: 11, color: '#94a3b8' },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  proofTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  proofTagText: { fontSize: 10.5, fontWeight: '700', color: '#4f46e5' },
  refTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  refTagText: { fontSize: 10.5, fontWeight: '700', color: '#475569' },
  cardActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btnViewPrimary: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 10,
    paddingVertical: 9,
  },
  btnViewPrimaryText: { fontSize: 12, fontWeight: '800', color: '#4f46e5' },
  btnToggle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
  },
  btnReopen: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  btnComplete: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  btnToggleText: { fontSize: 12, fontWeight: '800' },
  btnReopenText: { color: '#b45309' },
  btnCompleteText: { color: '#047857' },
  btnTrashSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
    justifyContent: 'center',
  },
});