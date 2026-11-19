import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';
import { apiClient } from '../../api/client';

export const ReportScreen = () => {
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const { students, mentors, config, syncFromDatabase } = useDataContext();
  const [refreshing, setRefreshing] = useState(false);
  const [reportRecords, setReportRecords] = useState<any[]>([]);
  const [openMentorIds, setOpenMentorIds] = useState<Record<string, boolean>>({
    '0001': true,
    '1': true,
  });

  const loadRankingsData = useCallback(async () => {
    await syncFromDatabase('admin');
    try {
      const res = await apiClient.get('/admin/report');
      if (Array.isArray(res.data?.records)) {
        setReportRecords(res.data.records);
      }
    } catch {
      // Uses local data fallback
    }
  }, [syncFromDatabase]);

  useFocusEffect(
    useCallback(() => {
      loadRankingsData();
    }, [loadRankingsData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRankingsData();
    setRefreshing(false);
  };

  const toggleMentorDrawer = (mentorId: string) => {
    setOpenMentorIds((prev) => ({
      ...prev,
      [mentorId]: !prev[mentorId],
    }));
  };

  const rankedMentors = useMemo(() => {
    const wM = config?.wM ?? 0.6;
    const wA = config?.wA ?? 0.4;

    const reportMap = new Map<string, any>();
    reportRecords.forEach((r) => {
      if (r.studId) reportMap.set(String(r.studId).toUpperCase().trim(), r);
    });

    const allScholars = students
      .filter((s) => s.isApproved !== false)
      .map((s) => {
        const rep = reportMap.get(String(s.id).toUpperCase().trim());
        const history = Array.isArray(s.history) ? s.history : [];
        const hasHistory = history.length > 0;
        const lastHist = hasHistory ? history[history.length - 1] : null;

        const rawM =
          s.currentMarks !== null && s.currentMarks !== undefined
            ? Number(s.currentMarks)
            : lastHist?.marks !== undefined && lastHist?.marks !== null
            ? Number(lastHist.marks)
            : rep &&
              rep.marks !== '--' &&
              rep.marks !== 'Not Uploaded' &&
              !isNaN(Number(rep.marks))
            ? Number(rep.marks)
            : null;

        const rawA =
          s.currentAttendance !== null && s.currentAttendance !== undefined
            ? Number(s.currentAttendance)
            : lastHist?.attendance !== undefined && lastHist?.attendance !== null
            ? Number(lastHist.attendance)
            : rep &&
              rep.attendance !== '--' &&
              rep.attendance !== 'Not Uploaded' &&
              !isNaN(Number(rep.attendance))
            ? Number(rep.attendance)
            : null;

        const m = rawM !== null && !isNaN(rawM) ? rawM : null;
        const a = rawA !== null && !isNaN(rawA) ? rawA : null;
        const hasEvaluations = m !== null && a !== null;
        const total = hasEvaluations
          ? Number((wM * m + wA * a).toFixed(2))
          : null;

        const rawMentorId = String(s.mentorId ?? '').trim();
        const isUnassigned =
          !rawMentorId ||
          rawMentorId.toUpperCase() === 'UNASSIGNED' ||
          rawMentorId.toUpperCase() === 'NONE';
        const resolvedMentorId = isUnassigned ? '' : rawMentorId;

        const resolvedMentorName = isUnassigned
          ? 'No Mentor'
          : rep?.mentorName && rep.mentorName !== 'No Mentor'
          ? rep.mentorName
          : s.mentorName && s.mentorName !== 'No Mentor'
          ? s.mentorName
          : resolvedMentorId === '1'
          ? 'Maddy'
          : resolvedMentorId === '0001'
          ? 'Dr. Kumar P K'
          : `Faculty (${resolvedMentorId})`;

        return {
          usn: s.id,
          name: s.name,
          batch: s.admissionYear || '2026',
          mentorId: resolvedMentorId,
          mentorName: resolvedMentorName,
          marks: m,
          attend: a,
          total,
          hasEvaluations,
        };
      });

    const mentorDict = new Map<
      string,
      { id: string; name: string; role: string; email: string }
    >();

    mentors.forEach((m) => {
      const cleanId = String(m.id || '').trim();
      if (cleanId) {
        mentorDict.set(cleanId.toLowerCase(), {
          id: cleanId,
          name: m.name,
          role: m.designation || 'Faculty Mentor',
          email: m.email || '',
        });
      }
    });

    allScholars.forEach((s) => {
      if (!s.mentorId) return; // Do not treat "No Mentor" as a faculty mentor card
      const key = s.mentorId.toLowerCase();
      if (!mentorDict.has(key)) {
        mentorDict.set(key, {
          id: s.mentorId,
          name: s.mentorName || `Faculty (${s.mentorId})`,
          role: 'Faculty Mentor',
          email: '',
        });
      }
    });

    if (mentorDict.size === 0) {
      mentorDict.set('0001', {
        id: '0001',
        name: 'Dr. Kumar P K',
        role: 'Professor & PG Coordinator',
        email: 'kumar@vtu.ac.in',
      });
    }

    const mentorArray = Array.from(mentorDict.values());

    return mentorArray
      .map((m) => {
        const mKey = m.id.toLowerCase();
        const list = allScholars.filter(
          (s) => s.mentorId && s.mentorId.toLowerCase() === mKey
        );
        const evaluatedList = list.filter(
          (s) => s.hasEvaluations && s.total !== null
        );
        const pass = evaluatedList.filter((s) => (s.total as number) >= 6.0).length;
        const rate =
          evaluatedList.length > 0
            ? Math.round((pass / evaluatedList.length) * 100)
            : null;
        const avg =
          evaluatedList.length > 0
            ? Number(
                (
                  evaluatedList.reduce(
                    (sum, item) => sum + (item.total as number),
                    0
                  ) / evaluatedList.length
                ).toFixed(2)
              )
            : null;

        return {
          ...m,
          list,
          evaluatedCount: evaluatedList.length,
          pass,
          rate,
          avg,
        };
      })
      .sort((a, b) => {
        if (a.avg === null && b.avg === null) {
          return b.list.length - a.list.length;
        }
        if (a.avg === null) return 1;
        if (b.avg === null) return -1;
        return b.avg - a.avg || (b.rate || 0) - (a.rate || 0);
      });
  }, [mentors, students, reportRecords, config]);

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />
      <View style={styles.appTopbar}>
        <View>
          <Text style={styles.topbarKicker}>VTU PG STUDIES • GOVERNANCE</Text>
          <Text style={styles.topbarTitle}>Department Administrator</Text>
        </View>
        <TouchableOpacity
          style={styles.btnGhostSm}
          onPress={logout}
          activeOpacity={0.8}
        >
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
            tintColor="#315fc4"
            colors={['#315fc4']}
          />
        }
      >
        <View style={styles.sectionHead}>
          <Text style={styles.sectionHeadTitle}>
            Faculty Performance Rankings
          </Text>
          <Text style={styles.sectionHeadSub}>
            Sorted by Mastery & Pass Rate
          </Text>
        </View>

        {rankedMentors.map((m, i) => {
          const isFirst = i === 0 && m.avg !== null;
          const isOpen = Boolean(openMentorIds[m.id]);
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.rankItem, isFirst && styles.rankItemFirst]}
              activeOpacity={0.85}
              onPress={() => toggleMentorDrawer(m.id)}
            >
              <View style={styles.rankRowTop}>
                <View
                  style={[styles.rankBadge, isFirst && styles.rankBadgeFirst]}
                >
                  <Text
                    style={[
                      styles.rankBadgeText,
                      isFirst && styles.rankBadgeTextFirst,
                    ]}
                  >
                    #{i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankMentorName}>{m.name}</Text>
                  <Text style={styles.rankMentorMeta}>
                    {m.list.length} Scholars •{' '}
                    {m.evaluatedCount > 0
                      ? `Pass Rate: ${m.rate}% (${m.pass}/${m.evaluatedCount})`
                      : 'Awaiting Evaluations'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {m.avg !== null ? (
                    <Text style={styles.rankAvgValue}>{m.avg.toFixed(2)}</Text>
                  ) : (
                    <Text style={styles.rankNotUploaded}>Not Uploaded</Text>
                  )}
                  <Text style={styles.rankAvgLabel}>AVG SCORE</Text>
                </View>
              </View>

              {isOpen && (
                <View style={styles.rankDrawer}>
                  {m.list.length === 0 ? (
                    <Text style={styles.emptyDrawerText}>
                      No scholars assigned.
                    </Text>
                  ) : (
                    m.list.map((s) => (
                      <View key={s.usn} style={styles.drawerRow}>
                        <Text style={styles.drawerStudentText} numberOfLines={1}>
                          <Text style={styles.drawerStudentBold}>{s.name}</Text>{' '}
                          ({s.usn} • {s.batch})
                        </Text>
                        {s.hasEvaluations &&
                        s.marks !== null &&
                        s.attend !== null &&
                        s.total !== null ? (
                          <Text style={styles.drawerScoreText}>
                            M: {s.marks.toFixed(1)} | A: {s.attend.toFixed(1)} →{' '}
                            <Text style={styles.drawerScoreBold}>
                              {s.total.toFixed(2)}
                            </Text>
                          </Text>
                        ) : (
                          <Text style={styles.drawerPendingText}>
                            Not Uploaded
                          </Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export { ReportScreen as RankingsScreen };
export default ReportScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#14294e' },
  appTopbar: {
    backgroundColor: '#14294e',
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topbarKicker: {
    color: '#a5c4ff',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  topbarTitle: {
    marginTop: 3,
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  btnGhostSm: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  btnGhostSmText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '600',
  },
  adminMain: {
    flex: 1,
    backgroundColor: '#f3f6fc',
  },
  scrollContent: {
    padding: 15,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 13,
    paddingHorizontal: 1,
  },
  sectionHeadTitle: {
    color: '#172f55',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  sectionHeadSub: {
    color: '#5e6f8c',
    fontSize: 10.5,
    fontWeight: '600',
  },
  rankItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    elevation: 2,
  },
  rankItemFirst: {
    borderColor: '#f0d9b1',
    backgroundColor: '#fffdf7',
  },
  rankRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: '#edf2fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeFirst: {
    backgroundColor: '#dc9740',
  },
  rankBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#172b4d',
  },
  rankBadgeTextFirst: {
    color: '#ffffff',
  },
  rankMentorName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#172b4d',
  },
  rankMentorMeta: {
    fontSize: 11.5,
    color: '#5e6f8c',
    marginTop: 2,
  },
  rankAvgValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#315fc4',
  },
  rankNotUploaded: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    paddingVertical: 2,
  },
  rankAvgLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#91a0b8',
    textTransform: 'uppercase',
  },
  rankDrawer: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#eaf0f8',
  },
  emptyDrawerText: {
    fontSize: 12,
    color: '#5e6f8c',
    fontStyle: 'italic',
  },
  drawerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  drawerStudentText: {
    fontSize: 12,
    color: '#5e6f8c',
    flex: 1,
    marginRight: 8,
  },
  drawerStudentBold: {
    fontWeight: '700',
    color: '#172b4d',
  },
  drawerScoreText: {
    fontSize: 12,
    color: '#5e6f8c',
  },
  drawerScoreBold: {
    fontWeight: '800',
    color: '#172b4d',
  },
  drawerPendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#91a0b8',
    fontStyle: 'italic',
  },
});