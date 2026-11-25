import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polyline, Path } from 'react-native-svg';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

export const MenteeListScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const {
    students,
    batchYears,
    config,
    updateRemarks,
    addTask,
    syncFromDatabase,
  } = useDataContext();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [expandedStudentIds, setExpandedStudentIds] = useState<
    Record<string, boolean>
  >({});
  const [selectedTerms, setSelectedTerms] = useState<Record<string, string>>(
    {}
  );

  // Remark Modal State
  const [remarkStudent, setRemarkStudent] = useState<any | null>(null);
  const [remarkText, setRemarkText] = useState('');

  // Quick Action Plan Modal State
  const [taskStudent, setTaskStudent] = useState<any | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'High' | 'Medium'>('High');

  useFocusEffect(
    useCallback(() => {
      syncFromDatabase('mentor');
    }, [syncFromDatabase])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromDatabase('mentor');
    setRefreshing(false);
  };

  const toggleIaDropdown = (studentId: string) => {
    setExpandedStudentIds((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const setStudentTerm = (studentId: string, term: string) => {
    setSelectedTerms((prev) => ({
      ...prev,
      [studentId]: term,
    }));
  };

  const allBatches = useMemo(() => {
    const set = new Set<string>(['2026', ...batchYears]);
    students.forEach((s) => {
      if (s.admissionYear) set.add(String(s.admissionYear));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [batchYears, students]);

  const wM = config?.wM ?? 0.6;
  const wA = config?.wA ?? 0.4;

  const evaluatedMentees = useMemo(() => {
    return students
      .filter(
        (s) =>
          selectedBatch === 'ALL' ||
          (s.admissionYear || '2026') === selectedBatch
      )
      .map((s) => {
        const history = Array.isArray(s.history) ? s.history : [];
        const hasHistory = history.length > 0;
        const chosenTerm = selectedTerms[s.id] || 'LATEST';

        const activeEntry = hasHistory
          ? chosenTerm === 'LATEST'
            ? history[history.length - 1]
            : history.find((h: any) => h.term === chosenTerm) ||
              history[history.length - 1]
          : null;

        // Sort score always based on latest term so roster order stays stable
        const latestHist = hasHistory ? history[history.length - 1] : null;
        const latestM =
          latestHist?.marks !== undefined && latestHist?.marks !== null
            ? Number(latestHist.marks)
            : s.currentMarks !== null && s.currentMarks !== undefined
            ? Number(s.currentMarks)
            : null;
        const latestA =
          latestHist?.attendance !== undefined &&
          latestHist?.attendance !== null
            ? Number(latestHist.attendance)
            : s.currentAttendance !== null && s.currentAttendance !== undefined
            ? Number(s.currentAttendance)
            : null;
        const sortScore =
          latestM !== null && latestA !== null && !isNaN(latestM) && !isNaN(latestA)
            ? Number((wM * latestM + wA * latestA).toFixed(2))
            : null;

        // Displayed metrics reflect the selected IA term
        const m =
          activeEntry?.marks !== undefined && activeEntry?.marks !== null
            ? Number(activeEntry.marks)
            : latestM;
        const a =
          activeEntry?.attendance !== undefined &&
          activeEntry?.attendance !== null
            ? Number(activeEntry.attendance)
            : latestA;

        const hasEvaluations =
          m !== null && a !== null && !isNaN(m) && !isNaN(a);
        const score = hasEvaluations
          ? Number((wM * (m as number) + wA * (a as number)).toFixed(2))
          : null;
        const isRisk = score !== null && score < 6.0;

        return {
          ...s,
          history,
          activeEntry,
          chosenTerm,
          marks: m,
          attend: a,
          score,
          sortScore,
          isRisk,
          hasEvaluations,
        };
      })
      .sort((a, b) => {
        if (a.sortScore === null && b.sortScore === null) return 0;
        if (a.sortScore === null) return 1;
        if (b.sortScore === null) return -1;
        return a.sortScore - b.sortScore;
      });
  }, [students, selectedBatch, selectedTerms, wM, wA]);

  const handleSaveRemark = async () => {
    if (!remarkStudent) return;
    await updateRemarks(remarkStudent.id, remarkText.trim());
    setRemarkStudent(null);
    Alert.alert('Saved', `Counseling remark updated for ${remarkStudent.name}.`);
  };

  const handleSaveTask = async () => {
    if (!taskStudent || !taskTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a task title.');
      return;
    }
    await addTask({
      studentId: taskStudent.id,
      title: taskTitle.trim(),
      priority: taskPriority,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });
    setTaskTitle('');
    setTaskStudent(null);
    Alert.alert('Task Assigned', `Action plan dispatched to ${taskStudent.name}.`);
  };

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />
      {/* Midnight Indigo Mentor Topbar */}
      <View style={styles.appTopbar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topbarKicker}>FACULTY MENTORING WORKSPACE</Text>
          <Text style={styles.topbarTitle}>{user?.name || 'Dr. Kumar P K'}</Text>
          <Text style={styles.topbarSub}>
            Faculty ID: {user?.identifier || '0001'} • {students.length}{' '}
            Allocated Scholars
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
            colors={['#4f46e5']}
          />
        }
      >
        {/* Batch Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.batchPillsRow}
        >
          <TouchableOpacity
            style={[
              styles.yearPill,
              selectedBatch === 'ALL' && styles.yearPillActive,
            ]}
            onPress={() => setSelectedBatch('ALL')}
          >
            <Text
              style={[
                styles.yearPillText,
                selectedBatch === 'ALL' && styles.yearPillTextActive,
              ]}
            >
              All Batches
            </Text>
          </TouchableOpacity>
          {allBatches.map((yr) => (
            <TouchableOpacity
              key={yr}
              style={[
                styles.yearPill,
                selectedBatch === yr && styles.yearPillActive,
              ]}
              onPress={() => setSelectedBatch(yr)}
            >
              <Text
                style={[
                  styles.yearPillText,
                  selectedBatch === yr && styles.yearPillTextActive,
                ]}
              >
                {yr} Batch
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionHeadTitle}>
            Mentees Roster ({evaluatedMentees.length})
          </Text>
          <Text style={styles.sectionHeadSub}>Sorted by risk standing</Text>
        </View>

        {evaluatedMentees.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No scholars allocated in this batch filter.
            </Text>
          </View>
        ) : (
          evaluatedMentees.map((s) => {
            const isExpanded = Boolean(expandedStudentIds[s.id]);
            const latestTermLabel =
              s.history.length > 0
                ? s.history[s.history.length - 1]?.term
                : '';

            return (
              <View
                key={s.id}
                style={[
                  styles.menteeCard,
                  !s.hasEvaluations
                    ? styles.menteeCardPending
                    : s.isRisk && styles.menteeCardRisk,
                ]}
              >
                {/* Header */}
                <View style={styles.menteeHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menteeName}>{s.name}</Text>
                    <Text style={styles.menteeMeta}>
                      USN: {s.id} • Batch: {s.admissionYear || '2026'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {s.hasEvaluations && s.score !== null ? (
                      <Text
                        style={[
                          styles.menteeScore,
                          s.isRisk && { color: '#be123c' },
                        ]}
                      >
                        {s.score.toFixed(2)}
                      </Text>
                    ) : (
                      <Text style={styles.menteeScorePending}>Not Uploaded</Text>
                    )}
                    <Text style={styles.menteeScoreLabel}>
                      {s.activeEntry?.term
                        ? `${s.activeEntry.term} MASTERY`
                        : 'MASTERY TOTAL'}
                    </Text>
                  </View>
                </View>

                {/* Status Banner */}
                <View
                  style={[
                    styles.menteeStatusBar,
                    !s.hasEvaluations
                      ? styles.menteeStatusBarPending
                      : s.isRisk && styles.menteeStatusBarRisk,
                  ]}
                >
                  <Text
                    style={[
                      styles.menteeStatusText,
                      !s.hasEvaluations
                        ? { color: '#475569' }
                        : s.isRisk && { color: '#be123c' },
                    ]}
                  >
                    {!s.hasEvaluations
                      ? 'PENDING: Awaiting initial term marks & attendance upload'
                      : s.isRisk
                      ? 'RISK ALERT: Below threshold — Intervention required'
                      : 'SAFE: Performance meets VTU competency criteria'}
                  </Text>
                </View>

                {/* Interactive Term Selector Pills (Matches Student Dashboard) */}
                {s.history.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.termPillsRow}
                  >
                    <TouchableOpacity
                      style={[
                        styles.termPill,
                        s.chosenTerm === 'LATEST' && styles.termPillActive,
                      ]}
                      onPress={() => setStudentTerm(s.id, 'LATEST')}
                    >
                      <Text
                        style={[
                          styles.termPillText,
                          s.chosenTerm === 'LATEST' &&
                            styles.termPillTextActive,
                        ]}
                      >
                        Latest ({latestTermLabel})
                      </Text>
                    </TouchableOpacity>
                    {s.history.map((item: any, idx: number) => {
                      const active = s.chosenTerm === item.term;
                      return (
                        <TouchableOpacity
                          key={`${s.id}-pill-${item.term}-${idx}`}
                          style={[
                            styles.termPill,
                            active && styles.termPillActive,
                          ]}
                          onPress={() => setStudentTerm(s.id, item.term)}
                        >
                          <Text
                            style={[
                              styles.termPillText,
                              active && styles.termPillTextActive,
                            ]}
                          >
                            {item.term}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* 3-Column Stats Grid (Dynamic Standing instead of hardcoded 'Good') */}
                <View style={styles.menteeStatsGrid}>
                  <View style={styles.msItem}>
                    <Text style={styles.msLabel}>MARKS</Text>
                    <Text style={styles.msVal}>
                      {s.hasEvaluations && s.marks !== null
                        ? `${s.marks.toFixed(1)}/10`
                        : '--'}
                    </Text>
                    {s.activeEntry?.rawMarks && (
                      <Text style={styles.msSubVal}>
                        {s.activeEntry.rawMarks.obtained}/
                        {s.activeEntry.rawMarks.total}
                      </Text>
                    )}
                  </View>

                  <View style={styles.msDivider} />

                  <View style={styles.msItem}>
                    <Text style={styles.msLabel}>ATTEND</Text>
                    <Text style={styles.msVal}>
                      {s.hasEvaluations && s.attend !== null
                        ? `${s.attend.toFixed(1)}/10`
                        : '--'}
                    </Text>
                    {s.activeEntry?.rawAttendance && (
                      <Text style={styles.msSubVal}>
                        {s.activeEntry.rawAttendance.attended}/
                        {s.activeEntry.rawAttendance.total} cls
                      </Text>
                    )}
                  </View>

                  <View style={styles.msDivider} />

                  <View style={styles.msItem}>
                    <Text style={styles.msLabel}>STANDING</Text>
                    <Text
                      style={[
                        styles.msVal,
                        {
                          color: !s.hasEvaluations
                            ? '#64748b'
                            : s.isRisk
                            ? '#be123c'
                            : '#047857',
                        },
                      ]}
                    >
                      {!s.hasEvaluations
                        ? 'Pending'
                        : s.isRisk
                        ? 'At Risk'
                        : 'Competent'}
                    </Text>
                    <Text style={styles.msSubVal}>
                      {s.activeEntry?.term || 'No Term'}
                    </Text>
                  </View>
                </View>

                {/* Dedicated Mentor Counseling Remark Strip (Only shows actual remarks) */}
                {Boolean(s.remarks && s.remarks.trim()) && (
                  <View style={styles.remarkStrip}>
                    <Svg
                      width={13}
                      height={13}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </Svg>
                    <Text style={styles.remarkStripText} numberOfLines={2}>
                      <Text style={{ fontWeight: '800', color: '#1e1b4b' }}>
                        Mentor Remark:{' '}
                      </Text>
                      {s.remarks.trim()}
                    </Text>
                  </View>
                )}

                {/* Expandable All IA Marks & Attendance Dropdown */}
                {s.history.length > 0 && (
                  <View style={styles.iaDropdownWrap}>
                    <TouchableOpacity
                      style={styles.iaDropdownTrigger}
                      onPress={() => toggleIaDropdown(s.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.iaDropdownTriggerText}>
                        {isExpanded
                          ? `Hide IA History (${s.history.length})`
                          : `View All IA Marks & Attendance (${s.history.length})`}
                      </Text>
                      <Svg
                        width={15}
                        height={15}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transform: [
                            { rotate: isExpanded ? '180deg' : '0deg' },
                          ],
                        }}
                      >
                        <Polyline points="6 9 12 15 18 9" />
                      </Svg>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.iaDropdownBody}>
                        <View style={styles.iaHeaderRow}>
                          <Text style={[styles.iaHeaderCell, { flex: 1.1 }]}>
                            TERM
                          </Text>
                          <Text
                            style={[
                              styles.iaHeaderCell,
                              { flex: 1, textAlign: 'center' },
                            ]}
                          >
                            MARKS
                          </Text>
                          <Text
                            style={[
                              styles.iaHeaderCell,
                              { flex: 1, textAlign: 'center' },
                            ]}
                          >
                            ATTEND
                          </Text>
                          <Text
                            style={[
                              styles.iaHeaderCell,
                              { flex: 0.9, textAlign: 'right' },
                            ]}
                          >
                            TOTAL
                          </Text>
                        </View>
                        {s.history.map((h: any, idx: number) => {
                          const mVal = Number(h.marks);
                          const aVal = Number(h.attendance);
                          const tot = Number(
                            (wM * mVal + wA * aVal).toFixed(2)
                          );
                          const safe = tot >= 6.0;
                          const isSelected = s.activeEntry?.term === h.term;
                          return (
                            <TouchableOpacity
                              key={`${s.id}-${h.term}-${idx}`}
                              style={[
                                styles.iaDataRow,
                                isSelected && styles.iaDataRowSelected,
                                idx === s.history.length - 1 && {
                                  borderBottomWidth: 0,
                                },
                              ]}
                              onPress={() => setStudentTerm(s.id, h.term)}
                              activeOpacity={0.75}
                            >
                              <View style={{ flex: 1.1 }}>
                                <Text style={styles.iaTermText}>{h.term}</Text>
                                {h.rawMarks && (
                                  <Text style={styles.iaRawSub}>
                                    {h.rawMarks.obtained}/{h.rawMarks.total}
                                  </Text>
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.iaValCell,
                                  { flex: 1, textAlign: 'center' },
                                ]}
                              >
                                {mVal.toFixed(1)}/10
                              </Text>
                              <Text
                                style={[
                                  styles.iaValCell,
                                  { flex: 1, textAlign: 'center' },
                                ]}
                              >
                                {aVal.toFixed(1)}/10
                              </Text>
                              <Text
                                style={[
                                  styles.iaTotalCell,
                                  {
                                    flex: 0.9,
                                    textAlign: 'right',
                                    color: safe ? '#047857' : '#be123c',
                                  },
                                ]}
                              >
                                {tot.toFixed(2)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.btnSmOutline}
                    onPress={() => {
                      setRemarkStudent(s);
                      setRemarkText(s.remarks || '');
                    }}
                  >
                    <Text style={styles.btnSmOutlineText}>
                      {s.remarks ? 'Edit Remark' : '+ Add Remark'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnSmPrimary}
                    onPress={() => {
                      setTaskStudent(s);
                      setTaskTitle('');
                    }}
                  >
                    <Text style={styles.btnSmPrimaryText}>+ Action Plan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Counseling Remark Modal */}
      <Modal visible={Boolean(remarkStudent)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Update Remark — {remarkStudent?.name}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter counseling observation..."
              placeholderTextColor="#91a0b8"
              value={remarkText}
              onChangeText={setRemarkText}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.btnSmOutline, { flex: 1 }]}
                onPress={() => setRemarkStudent(null)}
              >
                <Text style={styles.btnSmOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSmPrimary, { flex: 1.5 }]}
                onPress={handleSaveRemark}
              >
                <Text style={styles.btnSmPrimaryText}>Save Remark</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Plan Modal */}
      <Modal visible={Boolean(taskStudent)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Assign Action Plan — {taskStudent?.name}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Complete Module 2 Lab Assignment"
              placeholderTextColor="#91a0b8"
              value={taskTitle}
              onChangeText={setTaskTitle}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {(['High', 'Medium'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.yearPill,
                    taskPriority === p && styles.yearPillActive,
                  ]}
                  onPress={() => setTaskPriority(p)}
                >
                  <Text
                    style={[
                      styles.yearPillText,
                      taskPriority === p && styles.yearPillTextActive,
                    ]}
                  >
                    {p} Priority
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.btnSmOutline, { flex: 1 }]}
                onPress={() => setTaskStudent(null)}
              >
                <Text style={styles.btnSmOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSmPrimary, { flex: 1.5 }]}
                onPress={handleSaveTask}
              >
                <Text style={styles.btnSmPrimaryText}>Assign Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MenteeListScreen;

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
  topbarSub: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 2,
  },
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
  batchPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 12,
  },
  yearPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#ffffff',
  },
  yearPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  yearPillText: { fontSize: 11, fontWeight: '700', color: '#5e6f8c' },
  yearPillTextActive: { color: '#ffffff', fontWeight: '800' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionHeadTitle: { color: '#172f55', fontSize: 15.5, fontWeight: '800' },
  sectionHeadSub: { color: '#5e6f8c', fontSize: 10.5, fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 12, color: '#5e6f8c' },
  menteeCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#047857',
    elevation: 2,
  },
  menteeCardRisk: {
    borderLeftColor: '#be123c',
  },
  menteeCardPending: {
    borderLeftColor: '#94a3b8',
  },
  menteeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  menteeName: { fontSize: 15, fontWeight: '800', color: '#172b4d' },
  menteeMeta: { fontSize: 11, color: '#5e6f8c', marginTop: 2 },
  menteeScore: { fontSize: 18.5, fontWeight: '800', color: '#4f46e5' },
  menteeScorePending: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#64748b',
    paddingVertical: 2,
  },
  menteeScoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#91a0b8',
    marginTop: 1,
  },
  menteeStatusBar: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  menteeStatusBarRisk: {
    backgroundColor: '#fff1f2',
  },
  menteeStatusBarPending: {
    backgroundColor: '#f1f5f9',
  },
  menteeStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  termPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 10,
  },
  termPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  termPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  termPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  termPillTextActive: { color: '#ffffff', fontWeight: '800' },
  menteeStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5fe',
    borderWidth: 1,
    borderColor: '#e2e8f8',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 11,
    marginBottom: 10,
  },
  msItem: { flex: 1, alignItems: 'center' },
  msDivider: { width: 1, height: 28, backgroundColor: '#dce5f3' },
  msLabel: { fontSize: 9.5, fontWeight: '800', color: '#5e6f8c', letterSpacing: 0.3 },
  msVal: { fontSize: 13, fontWeight: '800', color: '#172b4d', marginTop: 2 },
  msSubVal: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 1 },
  remarkStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  remarkStripText: {
    flex: 1,
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },
  iaDropdownWrap: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  iaDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#eef2ff',
  },
  iaDropdownTriggerText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#4f46e5',
  },
  iaDropdownBody: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  iaHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  iaHeaderCell: {
    fontSize: 9,
    fontWeight: '800',
    color: '#5e6f8c',
    letterSpacing: 0.4,
  },
  iaDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fb',
  },
  iaDataRowSelected: {
    backgroundColor: '#f5f7ff',
  },
  iaTermText: { fontSize: 12, fontWeight: '800', color: '#172b4d' },
  iaRawSub: { fontSize: 9.5, color: '#64748b', marginTop: 1 },
  iaValCell: { fontSize: 11.5, fontWeight: '700', color: '#334155' },
  iaTotalCell: { fontSize: 12, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8 },
  btnSmOutline: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  btnSmOutlineText: { fontSize: 11.5, fontWeight: '700', color: '#172b4d' },
  btnSmPrimary: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  btnSmPrimaryText: { fontSize: 11.5, fontWeight: '800', color: '#ffffff' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#172b4d',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#172b4d',
    backgroundColor: '#fbfdff',
  },
});