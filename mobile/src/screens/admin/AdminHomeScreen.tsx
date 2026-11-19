import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

export const AdminHomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const {
    students,
    mentors,
    pendingRegistrations,
    batchYears,
    config,
    syncFromDatabase,
  } = useDataContext();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [drillYearFilter, setDrillYearFilter] = useState<string>('2026');

  useFocusEffect(
    useCallback(() => {
      syncFromDatabase('admin');
    }, [syncFromDatabase])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromDatabase('admin');
    setRefreshing(false);
  };

  const approvedStudents = useMemo(() => {
    return students.filter((s) => s.isApproved !== false);
  }, [students]);

  const evaluatedStudents = useMemo(() => {
    const wM = config?.wM ?? 0.6;
    const wA = config?.wA ?? 0.4;

    return approvedStudents.map((s) => {
      const lastHist =
        Array.isArray(s.history) && s.history.length > 0
          ? s.history[s.history.length - 1]
          : null;

      const rawM =
        s.currentMarks !== null && s.currentMarks !== undefined
          ? Number(s.currentMarks)
          : lastHist?.marks !== undefined && lastHist?.marks !== null
          ? Number(lastHist.marks)
          : null;

      const rawA =
        s.currentAttendance !== null && s.currentAttendance !== undefined
          ? Number(s.currentAttendance)
          : lastHist?.attendance !== undefined && lastHist?.attendance !== null
          ? Number(lastHist.attendance)
          : null;

      const hasEvaluation =
        rawM !== null && rawA !== null && !isNaN(rawM) && !isNaN(rawA);

      const marks = hasEvaluation ? rawM : null;
      const attend = hasEvaluation ? rawA : null;
      const total =
        hasEvaluation && marks !== null && attend !== null
          ? Number((wM * marks + wA * attend).toFixed(2))
          : null;

      return {
        ...s,
        hasEvaluation,
        marks,
        attend,
        total,
        isPass: total !== null && total >= 6.0,
      };
    });
  }, [approvedStudents, config]);

  // Build Faculty Mentor Directory cards with STRICT mentorId matching
  const facultyDirectory = useMemo(() => {
    const baseMentors =
      mentors.length > 0
        ? mentors
        : [
            {
              id: '0001',
              name: 'Dr. Kumar P K',
              email: 'kumar@vtu.ac.in',
              designation: 'Professor & PG Coordinator',
            },
          ];

    return baseMentors.map((m) => {
      const mIdLower = String(m.id || '').trim().toLowerCase();

      // STRICT MATCH ONLY: Never merge '0001' (Dr. Kumar) with '1' (Maddy)
      const allocated = evaluatedStudents.filter(
        (s) => String(s.mentorId || '').trim().toLowerCase() === mIdLower
      );

      const evaluatedOnly = allocated.filter(
        (s) => s.hasEvaluation && s.total !== null
      );

      const avgScore =
        evaluatedOnly.length > 0
          ? (
              evaluatedOnly.reduce((sum, curr) => sum + (curr.total as number), 0) /
              evaluatedOnly.length
            ).toFixed(2)
          : '—';

      const batchesList =
        Array.from(new Set(allocated.map((s) => s.admissionYear || '2026'))).join(
          ', '
        ) || '2026';

      const initials = m.name
        .replace(/^(Dr\.|Prof\.)\s*/i, '')
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return {
        ...m,
        initials: initials || 'FM',
        allocated,
        avgScore,
        batchesList,
      };
    });
  }, [mentors, evaluatedStudents]);

  const activeMentor = useMemo(() => {
    if (!selectedMentorId) return null;
    return facultyDirectory.find((m) => m.id === selectedMentorId) || null;
  }, [selectedMentorId, facultyDirectory]);

  const drillDownStudents = useMemo(() => {
    if (!activeMentor) return [];
    return activeMentor.allocated.filter(
      (s) =>
        drillYearFilter === 'ALL' ||
        (s.admissionYear || '2026') === drillYearFilter
    );
  }, [activeMentor, drillYearFilter]);

  const allAvailableYears = useMemo(() => {
    const set = new Set<string>(['2026', ...batchYears]);
    approvedStudents.forEach((s) => {
      if (s.admissionYear) set.add(String(s.admissionYear));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [batchYears, approvedStudents]);

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />
      {/* Top Royal Blue Executive Header */}
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topbarKicker}>VTU PG STUDIES • GOVERNANCE</Text>
          <Text style={styles.topbarTitle}>
            {user?.name || 'Dept Administrator'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 96 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#315fc4"
            colors={['#315fc4']}
          />
        }
      >
        {!activeMentor ? (
          // ====================================================================
          // MODE 1: TEACHING FACULTY MENTOR DIRECTORY
          // ====================================================================
          <View>
            <View style={styles.summaryStrip}>
              <View style={[styles.summaryCell, styles.summaryCellBlue]}>
                <Text style={[styles.summaryVal, { color: '#315fc4' }]}>
                  {facultyDirectory.length}
                </Text>
                <Text style={styles.summaryLbl}>FACULTY</Text>
              </View>
              <View style={[styles.summaryCell, styles.summaryCellIndigo]}>
                <Text style={[styles.summaryVal, { color: '#5269a5' }]}>
                  {approvedStudents.length}
                </Text>
                <Text style={styles.summaryLbl}>SCHOLARS</Text>
              </View>
              <TouchableOpacity
                style={[styles.summaryCell, styles.summaryCellTeal]}
                onPress={() => navigation.navigate('Approvals')}
                activeOpacity={0.75}
              >
                <Text style={[styles.summaryVal, { color: '#247b99' }]}>
                  {pendingRegistrations.length}
                </Text>
                <Text style={styles.summaryLbl}>APPROVALS</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Teaching Faculty Mentors</Text>
              <Text style={styles.sectionHint}>Tap card to view students</Text>
            </View>

            {facultyDirectory.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.mentorCard}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedMentorId(m.id);
                  setDrillYearFilter(allAvailableYears[0] || '2026');
                }}
              >
                <View style={styles.mentorCardTop}>
                  <View style={styles.avatarMonogram}>
                    <Text style={styles.avatarMonogramText}>{m.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mentorCardName}>{m.name}</Text>
                    <Text style={styles.mentorCardMeta}>
                      ID: {m.id} • {m.designation || 'Faculty Mentor'}
                    </Text>
                  </View>
                  <View style={styles.chevronBox}>
                    <Text style={styles.chevronText}>›</Text>
                  </View>
                </View>

                <View style={styles.mentorCardStats}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statMetaLabel}>Allocated</Text>
                    <Text style={styles.statMetaStrong}>
                      {m.allocated.length} Scholars
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statMetaLabel}>Batches</Text>
                    <Text style={styles.statMetaStrong}>{m.batchesList}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statMetaLabel}>Avg Score</Text>
                    <Text style={styles.statMetaStrong}>{m.avgScore}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          // ====================================================================
          // MODE 2: SELECTED MENTOR DRILL-DOWN + YEAR-WISE BATCH CHECK
          // ====================================================================
          <View>
            <View style={styles.drilldownHeader}>
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => setSelectedMentorId(null)}
              >
                <Text style={styles.backLinkText}>← Back to Faculty Mentors</Text>
              </TouchableOpacity>
              <View style={styles.drillTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mentorCardName}>{activeMentor.name}</Text>
                  <Text style={styles.mentorCardMeta}>
                    Staff ID: {activeMentor.id} • {activeMentor.email || 'VTU Faculty'}
                  </Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {drillDownStudents.length} Scholars
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.yearFilterRow}
              >
                <Text style={styles.batchYearCaption}>BATCH YEAR:</Text>
                {allAvailableYears.map((yr) => (
                  <TouchableOpacity
                    key={yr}
                    style={[
                      styles.yearPill,
                      drillYearFilter === yr && styles.yearPillActive,
                    ]}
                    onPress={() => setDrillYearFilter(yr)}
                  >
                    <Text
                      style={[
                        styles.yearPillText,
                        drillYearFilter === yr && styles.yearPillTextActive,
                      ]}
                    >
                      {yr} Batch
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.yearPill,
                    drillYearFilter === 'ALL' && styles.yearPillActive,
                  ]}
                  onPress={() => setDrillYearFilter('ALL')}
                >
                  <Text
                    style={[
                      styles.yearPillText,
                      drillYearFilter === 'ALL' && styles.yearPillTextActive,
                    ]}
                  >
                    All Years
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {drillDownStudents.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Scholars in This Batch</Text>
                <Text style={styles.emptySub}>
                  No scholars are allocated to {activeMentor.name} in the{' '}
                  {drillYearFilter === 'ALL' ? 'selected' : drillYearFilter} batch.
                </Text>
              </View>
            ) : (
              drillDownStudents.map((s) => (
                <View key={s.id} style={styles.studentRowCard}>
                  <View style={styles.studentRowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{s.name}</Text>
                      <Text style={styles.studentSub}>
                        USN: {s.id} • Batch: {s.admissionYear || '2026'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        !s.hasEvaluation
                          ? styles.tagPending
                          : s.isPass
                          ? styles.tagPass
                          : styles.tagRisk,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          !s.hasEvaluation
                            ? styles.tagPendingText
                            : s.isPass
                            ? styles.tagPassText
                            : styles.tagRiskText,
                        ]}
                      >
                        {!s.hasEvaluation
                          ? 'Not Uploaded'
                          : s.isPass
                          ? 'Competent'
                          : 'At Risk'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.studentMetricsBar}>
                    <Text style={styles.metricItem}>
                      Marks:{' '}
                      <Text style={styles.metricStrong}>
                        {s.hasEvaluation && s.marks !== null
                          ? `${s.marks.toFixed(1)}/10`
                          : '--'}
                      </Text>
                    </Text>
                    <Text style={styles.metricItem}>
                      Attend:{' '}
                      <Text style={styles.metricStrong}>
                        {s.hasEvaluation && s.attend !== null
                          ? `${s.attend.toFixed(1)}/10`
                          : '--'}
                      </Text>
                    </Text>
                    <Text style={[styles.metricItem, { textAlign: 'right' }]}>
                      Total:{' '}
                      <Text
                        style={[
                          styles.metricStrong,
                          {
                            color:
                              s.hasEvaluation && s.total !== null
                                ? '#315fc4'
                                : '#91a0b8',
                          },
                        ]}
                      >
                        {s.hasEvaluation && s.total !== null
                          ? s.total.toFixed(2)
                          : 'Not Uploaded'}
                      </Text>
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default AdminHomeScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#14294e' },
  topbar: {
    backgroundColor: '#14294e',
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topbarKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a5c4ff',
    letterSpacing: 1.1,
  },
  topbarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 3,
  },
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  signOutBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  container: { flex: 1, backgroundColor: '#f3f6fc' },
  scrollContent: { padding: 15 },
  summaryStrip: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 20,
  },
  summaryCell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryCellBlue: { backgroundColor: '#e9efff', borderColor: '#dce6ff' },
  summaryCellIndigo: { backgroundColor: '#eef0ff', borderColor: '#e1e5fb' },
  summaryCellTeal: { backgroundColor: '#e8f3fa', borderColor: '#d8eaf4' },
  summaryVal: { fontSize: 23, fontWeight: '800' },
  summaryLbl: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#5e6f8c',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#172f55' },
  sectionHint: { fontSize: 11, fontWeight: '600', color: '#5e6f8c' },
  mentorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 2,
  },
  mentorCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarMonogram: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8efff',
    borderWidth: 1,
    borderColor: '#d7e2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMonogramText: { fontSize: 13, fontWeight: '800', color: '#315fc4' },
  mentorCardName: { fontSize: 15, fontWeight: '800', color: '#1a3157' },
  mentorCardMeta: { fontSize: 11, color: '#7585a0', marginTop: 2 },
  chevronBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#edf2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: { fontSize: 18, fontWeight: '800', color: '#5d77b0' },
  mentorCardStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eaf0f8',
  },
  statMetaLabel: { fontSize: 10, color: '#7484a0' },
  statMetaStrong: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#294775',
    marginTop: 2,
  },
  drilldownHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  backLink: { marginBottom: 10 },
  backLinkText: { fontSize: 12, fontWeight: '800', color: '#315fc4' },
  drillTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  countBadgeText: { fontSize: 10, fontWeight: '800', color: '#047857' },
  yearFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eaf0f8',
  },
  batchYearCaption: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5e6f8c',
    marginRight: 4,
  },
  yearPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#f7f9fd',
  },
  yearPillActive: { backgroundColor: '#315fc4', borderColor: '#315fc4' },
  yearPillText: { fontSize: 11, fontWeight: '700', color: '#5e6f8c' },
  yearPillTextActive: { color: '#ffffff', fontWeight: '800' },
  studentRowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  studentRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentName: { fontSize: 14, fontWeight: '800', color: '#172b4d' },
  studentSub: { fontSize: 11, color: '#5e6f8c', marginTop: 2 },
  statusTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  tagPass: { backgroundColor: '#ecfdf5' },
  tagRisk: { backgroundColor: '#fff1f2' },
  tagPending: { backgroundColor: '#f1f5f9' },
  statusTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  tagPassText: { color: '#047857' },
  tagRiskText: { color: '#be123c' },
  tagPendingText: { color: '#475569' },
  studentMetricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#eaf0f8',
  },
  metricItem: { fontSize: 11.5, color: '#5e6f8c', flex: 1 },
  metricStrong: { fontWeight: '800', color: '#172b4d' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#172b4d' },
  emptySub: {
    fontSize: 11.5,
    color: '#5e6f8c',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 17,
  },
});