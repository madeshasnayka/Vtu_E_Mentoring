import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polyline } from 'react-native-svg';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

export const StudentTasksScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { tasks, toggleTaskStatus, syncFromDatabase } = useDataContext();
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

  const handleSubmitTask = (taskId: string, mainTitle: string) => {
    Alert.alert(
      'Submit Action Task',
      `Confirm completion of "${mainTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Completed',
          onPress: async () => {
            await toggleTaskStatus(taskId);
          },
        },
      ]
    );
  };

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
        <TouchableOpacity style={styles.signOutBtn} onPress={logout} activeOpacity={0.8}>
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
          <Text style={styles.sectionSub}>Mentor-verified completion</Text>
        </View>

        {myTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Assigned Action Plans</Text>
            <Text style={styles.emptySub}>
              Remedial tasks and milestones assigned by your faculty mentor will appear here.
            </Text>
          </View>
        ) : (
          myTasks.map((t) => {
            const isCompleted =
              String(t.status || '').toLowerCase() === 'completed';
            const parts = String(t.title || '').split(' — ');
            const mainTitle = parts[0];
            const description = parts.slice(1).join(' — ');

            return (
              <View key={t.id} style={styles.taskCard}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{mainTitle}</Text>
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

                {Boolean(description) && (
                  <View style={styles.descBox}>
                    <Text style={styles.descText}>{description}</Text>
                  </View>
                )}

                {!isCompleted ? (
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => handleSubmitTask(t.id, mainTitle)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>
                      ✓ Submit & Mark Complete
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.completedBanner}>
                    <Svg
                      width={15}
                      height={15}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#315fc4"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <Polyline points="20 6 9 17 4 12" />
                    </Svg>
                    <Text style={styles.completedBannerText}>
                      Submitted & Completed
                    </Text>
                  </View>
                )}
              </View>
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
  sectionSub: { fontSize: 11, fontWeight: '600', color: '#5e6f8c' },
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
    borderLeftWidth: 4,
    borderLeftColor: '#315fc4',
    elevation: 1,
  },
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
  badgeDone: { backgroundColor: '#eef3ff' },
  statusBadgeText: { fontSize: 9.5, fontWeight: '800' },
  badgePendingText: { color: '#b45309' },
  badgeDoneText: { color: '#315fc4' },
  descBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  descText: { fontSize: 12, color: '#334155', lineHeight: 18 },
  submitBtn: {
    backgroundColor: '#315fc4',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eef3ff',
    borderWidth: 1,
    borderColor: '#c7d8fb',
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 12,
  },
  completedBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#315fc4',
  },
});