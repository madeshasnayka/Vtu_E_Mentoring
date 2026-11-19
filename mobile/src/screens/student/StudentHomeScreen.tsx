import React, { useState, useCallback, useMemo } from 'react';
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

export const StudentHomeScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { students, config, syncFromDatabase } = useDataContext();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      syncFromDatabase('student');
    }, [syncFromDatabase])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromDatabase('student');
    setRefreshing(false);
  };

  const me = useMemo(() => {
    const myId = String(user?.identifier || '').trim().toUpperCase();
    return (
      students.find(
        (s) => String(s.id || '').trim().toUpperCase() === myId
      ) || students[0]
    );
  }, [students, user]);

  const studentName = me?.name || user?.name || 'Scholar';
  const studentUsn = me?.id || user?.identifier || 'N/A';
  const batchYear = me?.admissionYear || '2026';
  const mentorName =
    me?.mentorName && me.mentorName.trim() !== ''
      ? me.mentorName
      : 'No Mentor';

  const history = Array.isArray(me?.history) ? me.history : [];
  const hasEvaluations =
    history.length > 0 &&
    me?.currentMarks !== null &&
    me?.currentMarks !== undefined;

  const marks = hasEvaluations ? Number(me!.currentMarks) : null;
  const attend =
    hasEvaluations && me?.currentAttendance !== null && me?.currentAttendance !== undefined
      ? Number(me.currentAttendance)
      : null;

  const mastery =
    marks !== null && attend !== null
      ? Number(((config.wM ?? 0.6) * marks + (config.wA ?? 0.4) * attend).toFixed(2))
      : null;

  const isCompetent = mastery !== null && mastery >= 6.0;

  const velocity = useMemo(() => {
    if (!hasEvaluations || history.length === 0) {
      return {
        marksText: 'Not Uploaded',
        marksColor: '#91a0b8',
        attendText: 'Not Uploaded',
        attendColor: '#91a0b8',
      };
    }
    if (history.length === 1) {
      return {
        marksText: '0.0 (Baseline Term)',
        marksColor: '#315fc4',
        attendText: '0.0 (Baseline Term)',
        attendColor: '#315fc4',
      };
    }
    const prev = history[history.length - 2];
    const curr = history[history.length - 1];
    const dM = Number((Number(curr.marks) - Number(prev.marks)).toFixed(1));
    const dA = Number((Number(curr.attendance) - Number(prev.attendance)).toFixed(1));

    return {
      marksText:
        dM > 0
          ? `+${dM.toFixed(1)} (Improving)`
          : dM < 0
          ? `${dM.toFixed(1)} (Declining)`
          : '0.0 (Consistent)',
      marksColor: dM > 0 ? '#047857' : dM < 0 ? '#be123c' : '#5e6f8c',
      attendText:
        dA > 0
          ? `+${dA.toFixed(1)} (Improving)`
          : dA < 0
          ? `${dA.toFixed(1)} (Declining)`
          : '0.0 (Consistent)',
      attendColor: dA > 0 ? '#047857' : dA < 0 ? '#be123c' : '#5e6f8c',
    };
  }, [hasEvaluations, history]);

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />
      <View style={styles.appTopbar}>
        <View>
          <Text style={styles.topbarKicker}>VTU PG CENTRE • MENTORING DESK</Text>
          <Text style={styles.topbarTitle}>Student Portal</Text>
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
            tintColor="#315fc4"
            colors={['#315fc4']}
          />
        }
      >
        {/* Royal Blue Hero Profile Card */}
        <View style={styles.studentProfileCard}>
          <Text style={styles.spName}>{studentName}</Text>
          <View style={styles.spMeta}>
            <Text style={styles.spMetaText}>USN: {studentUsn}</Text>
            <Text style={styles.spMetaText}>Batch: {batchYear}</Text>
          </View>
          <View style={styles.spBadge}>
            <Text style={styles.spBadgeText}>Assigned Mentor: {mentorName}</Text>
          </View>
        </View>

        {/* 2x2 Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>COMPOSITE MASTERY</Text>
            {mastery !== null ? (
              <Text style={[styles.metricValue, { color: '#315fc4' }]}>
                {mastery.toFixed(2)}
              </Text>
            ) : (
              <Text style={[styles.metricValue, { fontSize: 15, color: '#91a0b8', paddingVertical: 4 }]}>
                Not Uploaded
              </Text>
            )}
            <Text style={styles.metricSub}>Min Req: 6.00 / Max: 10</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>INTERNAL MARKS</Text>
            {marks !== null ? (
              <Text style={styles.metricValue}>
                {marks.toFixed(1)}{' '}
                <Text style={{ fontSize: 13, color: '#91a0b8' }}>/ 10</Text>
              </Text>
            ) : (
              <Text style={[styles.metricValue, { fontSize: 15, color: '#91a0b8', paddingVertical: 4 }]}>
                Not Uploaded
              </Text>
            )}
            <Text style={styles.metricSub}>Cutoff Threshold: {config.thetaM}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>CLASS ATTENDANCE</Text>
            {attend !== null ? (
              <Text style={styles.metricValue}>
                {attend.toFixed(1)}{' '}
                <Text style={{ fontSize: 13, color: '#91a0b8' }}>/ 10</Text>
              </Text>
            ) : (
              <Text style={[styles.metricValue, { fontSize: 15, color: '#91a0b8', paddingVertical: 4 }]}>
                Not Uploaded
              </Text>
            )}
            <Text style={styles.metricSub}>Cutoff Threshold: {config.thetaA}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>ACADEMIC STANDING</Text>
            <Text
              style={[
                styles.metricValue,
                {
                  fontSize: mastery !== null ? 18 : 15,
                  paddingVertical: mastery !== null ? 0 : 4,
                  color:
                    mastery === null
                      ? '#91a0b8'
                      : isCompetent
                      ? '#047857'
                      : '#be123c',
                },
              ]}
            >
              {mastery === null ? 'Not Uploaded' : isCompetent ? 'Competent' : 'At Risk'}
            </Text>
            <Text style={styles.metricSub}>Dynamic Weighted Total</Text>
          </View>
        </View>

        {/* Term Trajectory Velocity Card */}
        <View style={styles.panelCard}>
          <View style={styles.panelTitleRow}>
            <View style={styles.cardIconBadge}>
              <Text style={styles.cardIconText}>Δ</Text>
            </View>
            <Text style={styles.panelTitleText}>Term Trajectory Velocity (Δ)</Text>
          </View>
          <Text style={styles.panelSub}>
            Rate of change between consecutive internal assessment terms.
          </Text>
          <View style={styles.velocityRow}>
            <Text style={styles.velocityLabel}>Marks Velocity</Text>
            <Text style={[styles.velocityVal, { color: velocity.marksColor }]}>
              {velocity.marksText}
            </Text>
          </View>
          <View style={[styles.velocityRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.velocityLabel}>Attendance Velocity</Text>
            <Text style={[styles.velocityVal, { color: velocity.attendColor }]}>
              {velocity.attendText}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default StudentHomeScreen;

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
  btnGhostSmText: { color: '#ffffff', fontSize: 11.5, fontWeight: '600' },
  adminMain: { flex: 1, backgroundColor: '#f3f6fc' },
  scrollContent: { padding: 15 },
  studentProfileCard: {
    backgroundColor: '#203f79',
    borderRadius: 18,
    padding: 19,
    marginBottom: 16,
    elevation: 4,
  },
  spName: { fontSize: 18.5, fontWeight: '800', color: '#ffffff' },
  spMeta: { flexDirection: 'row', gap: 14, marginTop: 4 },
  spMetaText: { fontSize: 12, color: '#cbd5e1', fontWeight: '500' },
  spBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  spBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '48.3%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 16,
    padding: 15,
    elevation: 1,
  },
  metricTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5e6f8c',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#172b4d',
  },
  metricSub: {
    fontSize: 10.5,
    color: '#91a0b8',
    marginTop: 4,
  },
  panelCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 18,
    padding: 17,
    elevation: 1,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fb',
  },
  cardIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#e8efff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: { fontSize: 13, fontWeight: '800', color: '#315fc4' },
  panelTitleText: { fontSize: 14.5, fontWeight: '800', color: '#172b4d' },
  panelSub: { fontSize: 11.5, color: '#5e6f8c', marginBottom: 10 },
  velocityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fb',
  },
  velocityLabel: { fontSize: 12.5, fontWeight: '600', color: '#172b4d' },
  velocityVal: { fontSize: 12.5, fontWeight: '800' },
});