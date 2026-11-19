import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polyline } from 'react-native-svg';
import { useDataContext } from '../../context/useDataContext';

type SubTabKey = 'preadmit' | 'mentor' | 'approvals' | 'usn' | 'reallot';

export const BatchCreateScreen = () => {
  const insets = useSafeAreaInsets();
  const {
    mentors,
    students,
    pendingRegistrations,
    batchYears,
    addCustomBatchYear,
    batchAdmitCandidates,
    createMentor,
    approveRegistration,
    rejectRegistration,
    assignOfficialUsn,
    reallotStudents,
    syncFromDatabase,
  } = useDataContext();

  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('preadmit');
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. Pre-Admit & Custom Year State
  const [customYearInput, setCustomYearInput] = useState('');
  const [selectedAdmitYear, setSelectedAdmitYear] = useState('2026');
  const [selectedPreAdmitMentor, setSelectedPreAdmitMentor] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');

  // 2. Add Mentor State
  const [newMentorName, setNewMentorName] = useState('');
  const [newMentorId, setNewMentorId] = useState('');
  const [newMentorEmail, setNewMentorEmail] = useState('');
  const [newMentorDesignation, setNewMentorDesignation] = useState('Faculty Mentor');

  // 3. Approvals Mentor Dropdown State
  const [approvalMentorMap, setApprovalMentorMap] = useState<Record<string, string>>({});
  const [openApprovalDropdownId, setOpenApprovalDropdownId] = useState<string | null>(null);

  // 4. Issue USN State
  const [selectedUsnScholarId, setSelectedUsnScholarId] = useState('');
  const [officialUsnInput, setOfficialUsnInput] = useState('');

  // 5. Re-Allot State
  const [selectedReAllotMentor, setSelectedReAllotMentor] = useState('0001');
  const [selectedReAllotStudents, setSelectedReAllotStudents] = useState<string[]>([]);

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

  const availableMentors =
    mentors.length > 0
      ? mentors
      : [
          {
            id: '0001',
            name: 'Dr. Kumar P K',
            email: 'kumar@vtu.ac.in',
            designation: 'Faculty Mentor',
            menteeCount: 0,
          },
        ];

  const getMentorLabel = (mentorId: string) => {
    if (!mentorId) return 'No Mentor (Unassigned)';
    const found = availableMentors.find((m) => m.id === mentorId);
    return found ? `${found.name} (ID: ${found.id})` : `Faculty (${mentorId})`;
  };

  const handleAddCustomYear = async () => {
    const clean = customYearInput.trim();
    if (!/^\d{4}$/.test(clean)) {
      Alert.alert('Invalid Year', 'Please enter a valid 4-digit year (e.g. 2025 or 2027).');
      return;
    }
    await addCustomBatchYear(clean);
    setSelectedAdmitYear(clean);
    setCustomYearInput('');
    Alert.alert('Batch Year Created', `${clean} Academic Batch is now active.`);
  };

  const handleEnrollPreAdmit = async () => {
    if (!candidateName.trim()) {
      Alert.alert('Missing Name', 'Please enter the Candidate Full Name.');
      return;
    }
    const emailToUse = (
      candidateEmail.trim() ||
      `${candidateName.trim().toLowerCase().replace(/\s+/g, '')}@vtu.ac.in`
    ).toLowerCase();

    // Frontend check for duplicate student email
    const emailExists =
      students.some((s) => String(s.email || '').trim().toLowerCase() === emailToUse) ||
      pendingRegistrations.some(
        (p) => String(p.email || '').trim().toLowerCase() === emailToUse
      );

    if (emailExists) {
      Alert.alert(
        'Duplicate Student Email',
        `A student with email "${emailToUse}" already exists in the system.`
      );
      return;
    }

    try {
      setSubmitting(true);
      await batchAdmitCandidates(
        [
          {
            name: candidateName.trim(),
            email: emailToUse,
            phone: candidatePhone.trim(),
            mentorId: selectedPreAdmitMentor,
          },
        ],
        selectedAdmitYear,
        selectedPreAdmitMentor
      );
      setCandidateName('');
      setCandidateEmail('');
      setCandidatePhone('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMentor = async () => {
    if (!newMentorName.trim() || !newMentorId.trim()) {
      Alert.alert('Missing Fields', 'Please enter Faculty Full Name and Staff ID.');
      return;
    }
    try {
      setSubmitting(true);
      await createMentor({
        name: newMentorName.trim(),
        identifier: newMentorId.trim(),
        email: newMentorEmail.trim(),
        designation: newMentorDesignation.trim() || 'Faculty Mentor',
      });
      setNewMentorName('');
      setNewMentorId('');
      setNewMentorEmail('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveStudent = async (p: any) => {
    try {
      const chosenMentorId = approvalMentorMap[p.id] ?? '';
      const chosenMentorName = getMentorLabel(chosenMentorId);

      await approveRegistration(p.id, chosenMentorId, p.admissionYear || '2026');
      setOpenApprovalDropdownId(null);

      Alert.alert(
        'Scholar Approved',
        `${p.name} (${p.identifier}) approved into ${
          p.admissionYear || '2026'
        } Batch.\nMentor: ${chosenMentorName}`
      );
    } catch {
      // Handled in useDataContext
    }
  };

  const handleUpgradeUsn = async () => {
    const targetScholar = selectedUsnScholarId || students[0]?.id;
    if (!targetScholar || !officialUsnInput.trim()) {
      Alert.alert('Missing Fields', 'Select a scholar and enter the Official University USN.');
      return;
    }
    try {
      setSubmitting(true);
      await assignOfficialUsn(targetScholar, officialUsnInput.trim().toUpperCase());
      setOfficialUsnInput('');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReAllotScholar = (usn: string) => {
    setSelectedReAllotStudents((prev) =>
      prev.includes(usn) ? prev.filter((id) => id !== usn) : [...prev, usn]
    );
  };

  const handleConfirmReAllot = async () => {
    if (selectedReAllotStudents.length === 0) {
      Alert.alert('No Scholars Selected', 'Please select at least one scholar to transfer.');
      return;
    }
    try {
      setSubmitting(true);
      await reallotStudents(selectedReAllotMentor, selectedReAllotStudents);
      setSelectedReAllotStudents([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topbarKicker}>ADMISSION & ALLOCATION ENGINE</Text>
          <Text style={styles.topbarTitle}>Batch Operations & Allocation</Text>
        </View>
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
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.opNav}>
          {(
            [
              { key: 'preadmit', label: 'Pre-Admit' },
              { key: 'mentor', label: 'Add Mentor' },
              { key: 'approvals', label: 'Approvals' },
              { key: 'usn', label: 'Issue USN' },
              { key: 'reallot', label: 'Re-Allot' },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.opNavBtn,
                activeSubTab === tab.key && styles.opNavBtnActive,
              ]}
              onPress={() => setActiveSubTab(tab.key)}
            >
              <Text
                style={[
                  styles.opNavBtnText,
                  activeSubTab === tab.key && styles.opNavBtnTextActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SUB-TAB 1: PRE-ADMIT */}
        {activeSubTab === 'preadmit' && (
          <View>
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Create Custom Academic Year Batch</Text>
              <Text style={styles.panelSub}>
                By default, 2026 is active. Enter any custom 4-digit year below to add a new
                batch cohort.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter year (e.g. 2025 or 2027)"
                  placeholderTextColor="#91a0b8"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={customYearInput}
                  onChangeText={setCustomYearInput}
                />
                <TouchableOpacity
                  style={styles.addYearBtn}
                  onPress={handleAddCustomYear}
                >
                  <Text style={styles.addYearBtnText}>Add Year</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.batchPreviewRow}>
                {batchYears.map((yr) => (
                  <TouchableOpacity
                    key={yr}
                    style={[
                      styles.yearPill,
                      selectedAdmitYear === yr && styles.yearPillActive,
                    ]}
                    onPress={() => setSelectedAdmitYear(yr)}
                  >
                    <Text
                      style={[
                        styles.yearPillText,
                        selectedAdmitYear === yr && styles.yearPillTextActive,
                      ]}
                    >
                      {yr} Batch
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Pre-Admit Post-Graduate Scholar</Text>
              <Text style={styles.panelSub}>
                Enrolls candidate into the selected {selectedAdmitYear} Batch.
              </Text>
              <Text style={styles.fieldLabel}>SELECTED ADMISSION BATCH YEAR</Text>
              <View style={styles.batchPreviewRow}>
                {batchYears.map((yr) => (
                  <TouchableOpacity
                    key={yr}
                    style={[
                      styles.yearPill,
                      selectedAdmitYear === yr && styles.yearPillActive,
                    ]}
                    onPress={() => setSelectedAdmitYear(yr)}
                  >
                    <Text
                      style={[
                        styles.yearPillText,
                        selectedAdmitYear === yr && styles.yearPillTextActive,
                      ]}
                    >
                      {yr} Batch
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>ASSIGN FACULTY MENTOR (OPTIONAL)</Text>
              <TouchableOpacity
                style={[
                  styles.selectableItem,
                  selectedPreAdmitMentor === '' && styles.selectableItemActive,
                ]}
                onPress={() => setSelectedPreAdmitMentor('')}
              >
                <View>
                  <Text style={styles.selectableTitle}>No Mentor (Unassigned)</Text>
                  <Text style={styles.selectableSub}>
                    Allocate to a faculty mentor later
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioDot,
                    selectedPreAdmitMentor === '' && styles.radioDotActive,
                  ]}
                >
                  {selectedPreAdmitMentor === '' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>

              {availableMentors.map((m) => {
                const selected = selectedPreAdmitMentor === m.id;
                const count = students.filter(
                  (s) => s.mentorId === m.id && s.isApproved
                ).length;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.selectableItem,
                      selected && styles.selectableItemActive,
                    ]}
                    onPress={() => setSelectedPreAdmitMentor(m.id)}
                  >
                    <View>
                      <Text style={styles.selectableTitle}>{m.name}</Text>
                      <Text style={styles.selectableSub}>
                        ID: {m.id} • {count} Mentees
                      </Text>
                    </View>
                    <View style={[styles.radioDot, selected && styles.radioDotActive]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.fieldLabel}>CANDIDATE FULL NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. M Sebastian"
                placeholderTextColor="#91a0b8"
                value={candidateName}
                onChangeText={setCandidateName}
              />
              <Text style={styles.fieldLabel}>INSTITUTIONAL EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="student@vtu.ac.in"
                placeholderTextColor="#91a0b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={candidateEmail}
                onChangeText={setCandidateEmail}
              />
              <Text style={styles.fieldLabel}>PHONE NUMBER (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 9876543210"
                placeholderTextColor="#91a0b8"
                keyboardType="phone-pad"
                value={candidatePhone}
                onChangeText={setCandidatePhone}
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleEnrollPreAdmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    Enroll Candidate in {selectedAdmitYear} Batch
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SUB-TAB 2: ADD MENTOR */}
        {activeSubTab === 'mentor' && (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Provision Faculty Mentor Account</Text>
            <Text style={styles.panelSub}>
              Register a new teaching faculty member into the department mentoring roster.
            </Text>
            <Text style={styles.fieldLabel}>FACULTY FULL NAME & TITLE *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dr. Sandeep K"
              placeholderTextColor="#91a0b8"
              value={newMentorName}
              onChangeText={setNewMentorName}
            />
            <Text style={styles.fieldLabel}>FACULTY STAFF ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 0004"
              placeholderTextColor="#91a0b8"
              autoCapitalize="none"
              value={newMentorId}
              onChangeText={setNewMentorId}
            />
            <Text style={styles.fieldLabel}>DESIGNATION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Associate Professor"
              placeholderTextColor="#91a0b8"
              value={newMentorDesignation}
              onChangeText={setNewMentorDesignation}
            />
            <Text style={styles.fieldLabel}>DEPARTMENT EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="sandeep@vtu.ac.in"
              placeholderTextColor="#91a0b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newMentorEmail}
              onChangeText={setNewMentorEmail}
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCreateMentor}
              disabled={submitting}
            >
              <Text style={styles.primaryBtnText}>Create Mentor Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SUB-TAB 3: PENDING APPROVALS WITH MENTOR ALLOTMENT DROPDOWN */}
        {activeSubTab === 'approvals' && (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Pending Student Self-Registrations</Text>
            <Text style={styles.panelSub}>
              Select a mentor from the dropdown (or leave as No Mentor) and approve.
            </Text>
            {pendingRegistrations.length === 0 ? (
              <Text style={styles.emptySmall}>No pending student approvals.</Text>
            ) : (
              pendingRegistrations.map((p) => {
                const chosenMentor = approvalMentorMap[p.id] ?? '';
                const isDropdownOpen = openApprovalDropdownId === p.id;

                return (
                  <View key={p.id} style={styles.approvalCardBox}>
                    <View style={styles.approvalTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectableTitle}>
                          {p.name} ({p.identifier})
                        </Text>
                        <Text style={styles.selectableSub}>
                          Batch: {p.admissionYear || '2026'} • {p.email || 'VTU Scholar'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.rejectSmBtn}
                          onPress={() => rejectRegistration(p.id)}
                        >
                          <Text style={styles.rejectSmBtnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveSmBtn}
                          onPress={() => handleApproveStudent(p)}
                        >
                          <Text style={styles.approveSmBtnText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Clean Allot Mentor Dropdown */}
                    <View style={styles.allotDropdownWrap}>
                      <Text style={styles.allotCaption}>ALLOT MENTOR ON APPROVAL:</Text>
                      <TouchableOpacity
                        style={[
                          styles.dropdownBtn,
                          isDropdownOpen && styles.dropdownBtnActive,
                        ]}
                        onPress={() =>
                          setOpenApprovalDropdownId(isDropdownOpen ? null : p.id)
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={styles.dropdownBtnText}>
                          {getMentorLabel(chosenMentor)}
                        </Text>
                        <Svg
                          width={15}
                          height={15}
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
                        <View style={styles.dropdownList}>
                          <TouchableOpacity
                            style={[
                              styles.dropdownItem,
                              chosenMentor === '' && styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                              setApprovalMentorMap((prev) => ({
                                ...prev,
                                [p.id]: '',
                              }));
                              setOpenApprovalDropdownId(null);
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                chosenMentor === '' && styles.dropdownItemTextActive,
                              ]}
                            >
                              No Mentor (Unassigned)
                            </Text>
                          </TouchableOpacity>

                          {availableMentors.map((m) => {
                            const active = chosenMentor === m.id;
                            return (
                              <TouchableOpacity
                                key={m.id}
                                style={[
                                  styles.dropdownItem,
                                  active && styles.dropdownItemActive,
                                ]}
                                onPress={() => {
                                  setApprovalMentorMap((prev) => ({
                                    ...prev,
                                    [p.id]: m.id,
                                  }));
                                  setOpenApprovalDropdownId(null);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    active && styles.dropdownItemTextActive,
                                  ]}
                                >
                                  {m.name} (ID: {m.id})
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* SUB-TAB 4: ISSUE USN */}
        {activeSubTab === 'usn' && (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Issue Official University USN</Text>
            <Text style={styles.panelSub}>
              Upgrade a scholar's provisional admission ID to an official VTU USN.
            </Text>
            <Text style={styles.fieldLabel}>SELECT SCHOLAR TO UPGRADE</Text>
            {students.slice(0, 8).map((s) => {
              const currentSelection = selectedUsnScholarId || students[0]?.id;
              const selected = currentSelection === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.selectableItem,
                    selected && styles.selectableItemActive,
                  ]}
                  onPress={() => setSelectedUsnScholarId(s.id)}
                >
                  <View>
                    <Text style={styles.selectableTitle}>{s.name}</Text>
                    <Text style={styles.selectableSub}>
                      Current ID: {s.id} • Batch: {s.admissionYear}
                    </Text>
                  </View>
                  <View style={[styles.radioDot, selected && styles.radioDotActive]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.fieldLabel}>OFFICIAL UNIVERSITY USN *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 4VZ26MC055"
              placeholderTextColor="#91a0b8"
              autoCapitalize="characters"
              value={officialUsnInput}
              onChangeText={setOfficialUsnInput}
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleUpgradeUsn}
              disabled={submitting}
            >
              <Text style={styles.primaryBtnText}>Assign Official USN</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SUB-TAB 5: RE-ALLOT */}
        {activeSubTab === 'reallot' && (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Re-Allot Scholars to Mentor</Text>
            <Text style={styles.panelSub}>
              Choose a target mentor, select scholars below, and confirm transfer.
            </Text>
            <Text style={styles.fieldLabel}>1. TARGET FACULTY MENTOR</Text>
            {availableMentors.map((m) => {
              const selected = selectedReAllotMentor === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.selectableItem,
                    selected && styles.selectableItemActive,
                  ]}
                  onPress={() => setSelectedReAllotMentor(m.id)}
                >
                  <View>
                    <Text style={styles.selectableTitle}>{m.name}</Text>
                    <Text style={styles.selectableSub}>Staff ID: {m.id}</Text>
                  </View>
                  <View style={[styles.radioDot, selected && styles.radioDotActive]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.fieldLabel}>
              2. SELECT SCHOLARS ({selectedReAllotStudents.length} SELECTED)
            </Text>
            {students.map((s) => {
              const checked = selectedReAllotStudents.includes(s.id);
              const currentMentorDisplay =
                s.mentorName && s.mentorName !== '' ? s.mentorName : 'No Mentor';
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.selectableItem,
                    checked && styles.selectableItemActive,
                  ]}
                  onPress={() => toggleReAllotScholar(s.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectableTitle}>
                      {s.name} ({s.id})
                    </Text>
                    <Text style={styles.selectableSub}>
                      Current: {currentMentorDisplay} • Batch: {s.admissionYear}
                    </Text>
                  </View>
                  <View style={[styles.radioDot, checked && styles.radioDotActive]}>
                    {checked && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleConfirmReAllot}
              disabled={submitting}
            >
              <Text style={styles.primaryBtnText}>
                Confirm Scholar Re-Allotment ({selectedReAllotStudents.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export const BatchOperationsScreen = BatchCreateScreen;
export const AllocationScreen = BatchCreateScreen;
export default BatchCreateScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#14294e' },
  topbar: {
    backgroundColor: '#14294e',
    paddingHorizontal: 18,
    paddingVertical: 16,
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
  container: { flex: 1, backgroundColor: '#f3f6fc' },
  scrollContent: { padding: 15 },
  opNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce5f3',
    marginBottom: 14,
    gap: 4,
  },
  opNavBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opNavBtnActive: { backgroundColor: '#203f79' },
  opNavBtnText: { fontSize: 10.5, fontWeight: '700', color: '#5e6f8c' },
  opNavBtnTextActive: { color: '#ffffff', fontWeight: '800' },
  panelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 1,
  },
  panelTitle: { fontSize: 15, fontWeight: '800', color: '#172b4d' },
  panelSub: {
    fontSize: 11.5,
    color: '#5e6f8c',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#172b4d',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 13.5,
    backgroundColor: '#fbfdff',
    color: '#172b4d',
  },
  addYearBtn: {
    backgroundColor: '#315fc4',
    paddingHorizontal: 16,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addYearBtnText: { color: '#ffffff', fontSize: 12.5, fontWeight: '800' },
  batchPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginBottom: 4,
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
  selectableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#f8faff',
    marginBottom: 8,
  },
  selectableItemActive: {
    borderColor: '#8bb2fb',
    backgroundColor: '#e8efff',
  },
  selectableTitle: { fontSize: 13, fontWeight: '800', color: '#172b4d' },
  selectableSub: { fontSize: 11, color: '#5e6f8c', marginTop: 2 },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#91a0b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotActive: { borderColor: '#315fc4' },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#315fc4',
  },
  primaryBtn: {
    backgroundColor: '#315fc4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
  emptySmall: {
    fontSize: 12,
    color: '#5e6f8c',
    textAlign: 'center',
    paddingVertical: 14,
  },
  approvalCardBox: {
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#f8faff',
    marginBottom: 10,
  },
  approvalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allotDropdownWrap: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  allotCaption: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#5e6f8c',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  dropdownBtnActive: {
    borderColor: '#315fc4',
  },
  dropdownBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#172b4d',
  },
  dropdownList: {
    marginTop: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 9,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#e8efff',
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dropdownItemTextActive: {
    color: '#315fc4',
    fontWeight: '800',
  },
  rejectSmBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  rejectSmBtnText: { fontSize: 11, fontWeight: '700', color: '#be123c' },
  approveSmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#315fc4',
  },
  approveSmBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
});