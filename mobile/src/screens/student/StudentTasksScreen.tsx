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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Polyline } from 'react-native-svg';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

export const StudentTasksScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { tasks, syncFromDatabase } = useDataContext();
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

  const myTasks = useMemo(() => {
    const myId = String(user?.identifier || '').trim().toUpperCase();
    if (!myId) return tasks;
    return tasks.filter(
      (t) => String(t.studentId || '').trim().toUpperCase() === myId
    );
  }, [tasks, user]);

  const pendingCount = myTasks.filter(
    (t) => String(t.status || '').toLowerCase() !== 'completed'
  ).length;

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />
      <View style={styles.topbar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topbarKicker}>MENTOR ACTION DIRECTIVES</Text>
          <Text style={styles.topbarTitle}>Assigned Action Plans</Text>
          <Text style={styles.topbarSub}>
            USN: {user?.identifier || 'Scholar'} • {pendingCount} Pending
          </Text>
        </View>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
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
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            My Action Checklist ({myTasks.length})
          </Text>
          <Text style={styles.sectionSub}>Tap a task to view or upload proof</Text>
        </View>

        {myTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Assigned Action Plans</Text>
            <Text style={styles.emptySub}>
              Remedial tasks and milestones assigned by your faculty mentor will
              appear here.
            </Text>
          </View>
        ) : (
          myTasks.map((t) => {
            const isCompleted =
              String(t.status || '').toLowerCase() === 'completed';
            const mainTitle = String(t.title || '').split(' — ')[0];

            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.taskCard, isCompleted && styles.taskCardDone]}
                activeOpacity={0.82}
                onPress={() =>
                  navigation.navigate('StudentTaskDetail', { taskId: t.id })
                }
              >
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {mainTitle}
                    </Text>
                    <Text style={styles.taskMeta}>
                      Priority: {t.priority || 'High'} • Due Date: {t.dueDate}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isCompleted ? styles.badgeDone : styles.badgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isCompleted
                          ? styles.badgeDoneText
                          : styles.badgePendingText,
                      ]}
                    >
                      {isCompleted ? 'COMPLETED' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBottomRow}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {Boolean(t.referenceFile?.fileUrl) && (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>Mentor Ref</Text>
                      </View>
                    )}
                    {Boolean(t.submission?.fileUrl) && (
                      <View
                        style={[
                          styles.metaChip,
                          { backgroundColor: '#ecfdf5' },
                        ]}
                      >
                        <Text
                          style={[styles.metaChipText, { color: '#047857' }]}
                        >
                          Proof Uploaded
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.openLinkRow}>
                    <Text style={styles.openLinkText}>
                      {isCompleted ? 'View Submission' : 'Open & Upload'}
                    </Text>
                    <Svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#315fc4"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <Polyline points="9 18 15 12 9 6" />
                    </Svg>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default StudentTasksScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#14294e' },
  topbar: {
    backgroundColor: '#14294e',
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topbarKicker: {
    color: '#a5c4ff',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  topbarTitle: {
    color: '#ffffff',
    fontSize: 17.5,
    fontWeight: '800',
    marginTop: 2,
  },
  topbarSub: { color: '#cbd5e1', fontSize: 11.5, marginTop: 2 },
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  signOutText: { color: '#ffffff', fontSize: 11.5, fontWeight: '700' },
  container: { flex: 1, backgroundColor: '#f3f6fc' },
  scrollContent: { padding: 15 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15.5, fontWeight: '800', color: '#172f55' },
  sectionSub: { fontSize: 10.5, fontWeight: '600', color: '#5e6f8c' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  emptyTitle: { fontSize: 14.5, fontWeight: '800', color: '#172b4d' },
  emptySub: {
    fontSize: 12,
    color: '#5e6f8c',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderLeftWidth: 3.5,
    borderLeftColor: '#315fc4',
    elevation: 1,
  },
  taskCardDone: { borderLeftColor: '#059669' },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  taskTitle: { fontSize: 14.5, fontWeight: '800', color: '#172b4d' },
  taskMeta: { fontSize: 11.5, color: '#5e6f8c', marginTop: 3 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  badgePending: { backgroundColor: '#fffbeb' },
  badgeDone: { backgroundColor: '#ecfdf5' },
  statusBadgeText: { fontSize: 9.5, fontWeight: '800' },
  badgePendingText: { color: '#b45309' },
  badgeDoneText: { color: '#047857' },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metaChip: {
    backgroundColor: '#eef3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: { fontSize: 10.5, fontWeight: '700', color: '#315fc4' },
  openLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  openLinkText: { fontSize: 12, fontWeight: '800', color: '#315fc4' },
});