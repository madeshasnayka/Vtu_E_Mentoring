import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useDataContext } from '../../context/useDataContext';

export const ApprovalsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    pendingRegistrations,
    mentors,
    approveRegistration,
    rejectRegistration,
    syncFromDatabase,
  } = useDataContext();

  const [refreshing, setRefreshing] = useState(false);
  // Per-card selected mentorId ('' means "No Mentor")
  const [selectedMentorByCard, setSelectedMentorByCard] = useState<Record<string, string>>({});
  // Per-card dropdown open/close state
  const [openDropdownCardId, setOpenDropdownCardId] = useState<string | null>(null);

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

  const getMentorLabel = (mentorId: string) => {
    if (!mentorId) return 'No Mentor (Unassigned)';
    const found = mentors.find((m) => m.id === mentorId);
    return found ? `${found.name} (ID: ${found.id})` : `Faculty (${mentorId})`;
  };

  const handleApprove = async (item: any) => {
    try {
      const chosenMentorId = selectedMentorByCard[item.id] ?? '';
      const chosenMentorLabel = getMentorLabel(chosenMentorId);

      await approveRegistration(
        item.id,
        chosenMentorId,
        item.admissionYear || '2026'
      );

      Alert.alert(
        'Scholar Verified & Approved',
        `${item.name} (${item.identifier}) has been approved into the ${
          item.admissionYear || '2026'
        } Batch.\nAllocated Mentor: ${chosenMentorLabel}`
      );
      setOpenDropdownCardId(null);
      await syncFromDatabase('admin');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Approval failed.');
    }
  };

  const handleReject = (userId: string, name: string) => {
    Alert.alert(
      'Reject Registration',
      `Are you sure you want to reject and remove ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectRegistration(userId);
              await syncFromDatabase('admin');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Rejection failed.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />
      <View style={styles.appTopbar}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity
            style={styles.btnGhostSm}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('AdminRoot');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.btnGhostSmText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.topbarKicker}>
              VTU PG STUDIES • ADMIN GATEKEEPER
            </Text>
            <Text style={styles.topbarTitle}>Pending Approvals</Text>
          </View>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>
            {pendingRegistrations.length} Pending
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.adminMain}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 48 },
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
            Self-Registered Student Queue
          </Text>
          <Text style={styles.sectionHeadSub}>
            Allot mentor (optional) & approve access
          </Text>
        </View>

        {pendingRegistrations.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyBadgeCircle}>
              <Text style={styles.emptyBadgeCheck}>✓</Text>
            </View>
            <Text style={styles.emptyTitle}>No Pending Registrations</Text>
            <Text style={styles.emptySub}>
              All self-registered scholars have been reviewed. New student
              applications awaiting department approval will appear here.
            </Text>
          </View>
        ) : (
          pendingRegistrations.map((item) => {
            const currentMentorId = selectedMentorByCard[item.id] ?? '';
            const isDropdownOpen = openDropdownCardId === item.id;

            return (
              <View key={item.id} style={styles.approvalCard}>
                <View style={styles.cardTop}>
                  <View style={styles.avatarMonogram}>
                    <Text style={styles.avatarMonogramText}>
                      {(item.name || 'S').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      USN / ID: {item.identifier} • Batch:{' '}
                      {item.admissionYear || '2026'}
                    </Text>
                    <Text style={styles.itemEmail}>
                      Email: {item.email || 'scholar@vtu.ac.in'}
                    </Text>
                  </View>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateText}>
                      {item.submittedDate || 'New'}
                    </Text>
                  </View>
                </View>

                {/* Allot Mentor Dropdown Selector */}
                <View style={styles.allotSection}>
                  <Text style={styles.allotLabel}>ALLOT FACULTY MENTOR</Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      isDropdownOpen && styles.dropdownTriggerActive,
                    ]}
                    onPress={() =>
                      setOpenDropdownCardId(isDropdownOpen ? null : item.id)
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownSelectedText}>
                      {getMentorLabel(currentMentorId)}
                    </Text>
                    <Svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#315fc4"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <Polyline
                        points={
                          isDropdownOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'
                        }
                      />
                    </Svg>
                  </TouchableOpacity>

                  {isDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      <TouchableOpacity
                        style={[
                          styles.dropdownOption,
                          currentMentorId === '' && styles.dropdownOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedMentorByCard((prev) => ({
                            ...prev,
                            [item.id]: '',
                          }));
                          setOpenDropdownCardId(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            currentMentorId === '' &&
                              styles.dropdownOptionTextActive,
                          ]}
                        >
                          No Mentor (Unassigned)
                        </Text>
                      </TouchableOpacity>

                      {mentors.map((m) => {
                        const isSelected = currentMentorId === m.id;
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[
                              styles.dropdownOption,
                              isSelected && styles.dropdownOptionActive,
                            ]}
                            onPress={() => {
                              setSelectedMentorByCard((prev) => ({
                                ...prev,
                                [item.id]: m.id,
                              }));
                              setOpenDropdownCardId(null);
                            }}
                          >
                            <View>
                              <Text
                                style={[
                                  styles.dropdownOptionText,
                                  isSelected && styles.dropdownOptionTextActive,
                                ]}
                              >
                                {m.name} (ID: {m.id})
                              </Text>
                              <Text style={styles.dropdownOptionSub}>
                                {m.designation || 'Faculty Mentor'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(item.id, item.name)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.approveBtnText}>
                      ✓ Approve {currentMentorId ? '& Allot' : '(No Mentor)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default ApprovalsScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#14294e' },
  appTopbar: {
    backgroundColor: '#14294e',
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  btnGhostSm: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  btnGhostSmText: { color: '#ffffff', fontSize: 11.5, fontWeight: '700' },
  topbarKicker: {
    color: '#a5c4ff',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  topbarTitle: {
    marginTop: 2,
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  countPill: {
    backgroundColor: 'rgba(49, 95, 196, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(165, 196, 255, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  countPillText: { fontSize: 10.5, fontWeight: '800', color: '#ffffff' },
  adminMain: { flex: 1, backgroundColor: '#f3f6fc' },
  scrollContent: { padding: 15 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 13,
  },
  sectionHeadTitle: { color: '#172f55', fontSize: 15, fontWeight: '800' },
  sectionHeadSub: { color: '#5e6f8c', fontSize: 11, fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 2,
  },
  emptyBadgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8efff',
    borderWidth: 1,
    borderColor: '#d7e2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyBadgeCheck: { fontSize: 20, fontWeight: '800', color: '#315fc4' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#172b4d' },
  emptySub: {
    fontSize: 12,
    color: '#5e6f8c',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  approvalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarMonogram: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e8efff',
    borderWidth: 1,
    borderColor: '#d7e2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMonogramText: { fontSize: 13, fontWeight: '800', color: '#315fc4' },
  itemName: { fontSize: 14.5, fontWeight: '800', color: '#172b4d' },
  itemMeta: { fontSize: 11.5, color: '#5e6f8c', marginTop: 2, fontWeight: '600' },
  itemEmail: { fontSize: 11, color: '#91a0b8', marginTop: 2 },
  dateBadge: {
    backgroundColor: '#edf2fb',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: { fontSize: 9.5, fontWeight: '700', color: '#5e6f8c' },
  allotSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#edf2fb',
  },
  allotLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#5e6f8c',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownTriggerActive: {
    borderColor: '#315fc4',
    backgroundColor: '#eef3ff',
  },
  dropdownSelectedText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#172b4d',
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 11,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownOptionActive: {
    backgroundColor: '#e8efff',
  },
  dropdownOptionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  dropdownOptionTextActive: {
    color: '#315fc4',
    fontWeight: '800',
  },
  dropdownOptionSub: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
  },
  rejectBtnText: { color: '#be123c', fontSize: 12, fontWeight: '700' },
  approveBtn: {
    flex: 1.8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#315fc4',
    alignItems: 'center',
  },
  approveBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
});