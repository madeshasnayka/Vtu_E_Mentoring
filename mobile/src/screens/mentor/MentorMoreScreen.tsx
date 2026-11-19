import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

export const MentorMoreScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const {
    students,
    queries,
    config,
    recordStudentEvaluation,
    replyQuery,
    deleteQuery,
    syncFromDatabase,
  } = useDataContext();

  // Separate Page View Switcher: 'evaluation' | 'inquiries'
  const [activePage, setActivePage] = useState<'evaluation' | 'inquiries'>('evaluation');
  const [refreshing, setRefreshing] = useState(false);

  // Evaluation State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [iaTerms, setIaTerms] = useState<string[]>(['IA-1', 'IA-2']);
  const [selectedTerm, setSelectedTerm] = useState<string>('IA-1');

  // Dual fields: Marks (Obtained & Total) + Attendance (Attended & Total)
  const [marksObtained, setMarksObtained] = useState<string>('42');
  const [totalMarks, setTotalMarks] = useState<string>('50');
  const [attendedClasses, setAttendedClasses] = useState<string>('36');
  const [totalClasses, setTotalClasses] = useState<string>('40');
  const [isSavingEval, setIsSavingEval] = useState(false);

  // Inquiries State
  const [inquirySearch, setInquirySearch] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);

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

  // Strictly mentor's allocated mentees filtered by Search Bar
  const filteredMentees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.id).toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  useEffect(() => {
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const selectedMentee = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  // Sequential IA Term Adder (IA-1, IA-2 -> + IA-3 -> + IA-4...)
  const handleAddNextIa = () => {
    const nextNumber = iaTerms.length + 1;
    const newTerm = `IA-${nextNumber}`;
    setIaTerms((prev) => [...prev, newTerm]);
    setSelectedTerm(newTerm);
  };

  // Live Scaled Preview Calculation (0 - 10)
  const scaledPreview = useMemo(() => {
    const mObt = parseFloat(marksObtained);
    const mTot = parseFloat(totalMarks);
    const aAtt = parseFloat(attendedClasses);
    const aTot = parseFloat(totalClasses);

    const validM = !isNaN(mObt) && !isNaN(mTot) && mTot > 0 && mObt >= 0 && mObt <= mTot;
    const validA = !isNaN(aAtt) && !isNaN(aTot) && aTot > 0 && aAtt >= 0 && aAtt <= aTot;

    const scaledM = validM ? Number(((mObt / mTot) * 10).toFixed(2)) : 0;
    const scaledA = validA ? Number(((aAtt / aTot) * 10).toFixed(2)) : 0;

    const wM = config?.wM ?? 0.6;
    const wA = config?.wA ?? 0.4;
    const mastery =
      validM && validA ? Number((wM * scaledM + wA * scaledA).toFixed(2)) : 0;

    return {
      validM,
      validA,
      scaledM,
      scaledA,
      mastery,
    };
  }, [marksObtained, totalMarks, attendedClasses, totalClasses, config]);

  const handleSaveEvaluation = async () => {
    if (!selectedStudentId) {
      Alert.alert('Select Mentee', 'Please choose a scholar to evaluate.');
      return;
    }

    const mObt = parseFloat(marksObtained);
    const mTot = parseFloat(totalMarks);
    const aAtt = parseFloat(attendedClasses);
    const aTot = parseFloat(totalClasses);

    if (isNaN(mObt) || isNaN(mTot) || mTot <= 0 || mObt < 0 || mObt > mTot) {
      Alert.alert(
        'Invalid Marks',
        'Please enter valid Obtained Marks and Total Marks (Obtained cannot exceed Total).'
      );
      return;
    }

    if (isNaN(aAtt) || isNaN(aTot) || aTot <= 0 || aAtt < 0 || aAtt > aTot) {
      Alert.alert(
        'Invalid Attendance',
        'Please enter valid Attended Classes and Total Classes (Attended cannot exceed Total).'
      );
      return;
    }

    try {
      setIsSavingEval(true);
      await recordStudentEvaluation({
        studentId: selectedStudentId,
        term: selectedTerm,
        marksObtained: mObt,
        totalMarks: mTot,
        attendedClasses: aAtt,
        totalClasses: aTot,
      });

      Alert.alert(
        'Diagnostics Updated',
        `${selectedMentee?.name || selectedStudentId} (${selectedTerm})\nScaled Marks: ${scaledPreview.scaledM.toFixed(
          2
        )}/10\nScaled Attendance: ${scaledPreview.scaledA.toFixed(
          2
        )}/10\nComposite Mastery: ${scaledPreview.mastery.toFixed(2)}/10`
      );
      await syncFromDatabase('mentor');
    } catch (error: any) {
      Alert.alert('Evaluation Error', error.message || 'Failed to save evaluation.');
    } finally {
      setIsSavingEval(false);
    }
  };

  const studentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(String(s.id).toUpperCase(), s.name));
    return map;
  }, [students]);

  const filteredQueries = useMemo(() => {
    const q = inquirySearch.trim().toLowerCase();
    if (!q) return queries;
    return queries.filter((item) => {
      const sName = (studentNameMap.get(String(item.studentId).toUpperCase()) || '').toLowerCase();
      return (
        sName.includes(q) ||
        String(item.studentId).toLowerCase().includes(q) ||
        String(item.subject || '').toLowerCase().includes(q) ||
        String(item.message || '').toLowerCase().includes(q)
      );
    });
  }, [queries, inquirySearch, studentNameMap]);

  const handleSendReply = async (queryId: string) => {
    const text = (replyDrafts[queryId] || '').trim();
    if (!text) {
      Alert.alert('Empty Response', 'Please write a faculty response before sending.');
      return;
    }
    try {
      setSendingReplyId(queryId);
      await replyQuery(queryId, text);
      setReplyDrafts((prev) => ({ ...prev, [queryId]: '' }));
      Alert.alert('Response Sent', 'Your faculty guidance has been shared with the scholar.');
    } finally {
      setSendingReplyId(null);
    }
  };

  const handleConfirmDeleteQuery = (queryId: string, subject: string) => {
    Alert.alert(
      'Remove Inquiry',
      `Are you sure you want to delete "${subject || 'this inquiry'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteQuery(queryId),
        },
      ]
    );
  };

  const pendingInquiriesCount = useMemo(
    () => queries.filter((q) => q.status !== 'Answered').length,
    [queries]
  );

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* Top Executive Header */}
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topbarKicker}>FACULTY MENTORING WORKSPACE</Text>
          <Text style={styles.topbarTitle}>{user?.name || 'Faculty Mentor'}</Text>
          <Text style={styles.topbarSub}>
            Faculty ID: {user?.identifier || '0001'} •{' '}
            {activePage === 'evaluation' ? 'Academic Evaluation' : 'Scholar Inquiries'}
          </Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Dedicated Top Page Switcher (Separates Evaluation & Inquiries cleanly) */}
      <View style={styles.pageSwitcherBar}>
        <TouchableOpacity
          style={[
            styles.pageSwitchBtn,
            activePage === 'evaluation' && styles.pageSwitchBtnActive,
          ]}
          onPress={() => setActivePage('evaluation')}
          activeOpacity={0.85}
        >
          <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke={activePage === 'evaluation' ? '#4f46e5' : '#64748b'}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Line x1="4" y1="21" x2="4" y2="14" />
            <Line x1="4" y1="10" x2="4" y2="3" />
            <Line x1="12" y1="21" x2="12" y2="12" />
            <Line x1="12" y1="8" x2="12" y2="3" />
            <Line x1="20" y1="21" x2="20" y2="16" />
            <Line x1="20" y1="12" x2="20" y2="3" />
            <Line x1="1" y1="14" x2="7" y2="14" />
            <Line x1="9" y1="8" x2="15" y2="8" />
            <Line x1="17" y1="16" x2="23" y2="16" />
          </Svg>
          <Text
            style={[
              styles.pageSwitchText,
              activePage === 'evaluation' && styles.pageSwitchTextActive,
            ]}
          >
            Evaluation Desk
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pageSwitchBtn,
            activePage === 'inquiries' && styles.pageSwitchBtnActive,
          ]}
          onPress={() => setActivePage('inquiries')}
          activeOpacity={0.85}
        >
          <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke={activePage === 'inquiries' ? '#4f46e5' : '#64748b'}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </Svg>
          <Text
            style={[
              styles.pageSwitchText,
              activePage === 'inquiries' && styles.pageSwitchTextActive,
            ]}
          >
            Inquiries ({queries.length})
          </Text>
          {pendingInquiriesCount > 0 && (
            <View style={styles.unreadDot}>
              <Text style={styles.unreadDotText}>{pendingInquiriesCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 96 },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
            colors={['#4f46e5']}
          />
        }
      >
        {activePage === 'evaluation' ? (
          // ====================================================================
          // PAGE 1: ACADEMIC EVALUATION WORKSPACE
          // ====================================================================
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconCircle}>
                <Svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M18 20V10" />
                  <Path d="M12 20V4" />
                  <Path d="M6 20v-6" />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Scholar Evaluation & Scaling</Text>
                <Text style={styles.cardSubtitle}>
                  Enter raw obtained & total scores to auto-compute 10-point VTU mastery.
                </Text>
              </View>
            </View>

            {/* Search Mentee Bar */}
            <Text style={styles.sectionLabel}>SEARCH & SELECT MENTEE</Text>
            <View style={styles.searchBox}>
              <Svg
                width={16}
                height={16}
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
                placeholder="Search scholar by name or USN..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Horizontal Mentee Pill Selector */}
            {filteredMentees.length === 0 ? (
              <Text style={styles.emptyNoticeText}>
                No allocated scholars match "{searchQuery}".
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.menteePillRow}
              >
                {filteredMentees.map((s) => {
                  const active = s.id === selectedStudentId;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.menteePill,
                        active && styles.menteePillActive,
                      ]}
                      onPress={() => setSelectedStudentId(s.id)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.menteePillName,
                          active && styles.menteePillNameActive,
                        ]}
                      >
                        {s.name}
                      </Text>
                      <Text
                        style={[
                          styles.menteePillUsn,
                          active && styles.menteePillUsnActive,
                        ]}
                      >
                        {s.id}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Assessment Term Selector: Default IA-1, IA-2 + Sequential Add Button */}
            <View style={styles.termHeaderRow}>
              <Text style={styles.sectionLabel}>ASSESSMENT TERM</Text>
              <TouchableOpacity
                style={styles.addIaBtn}
                onPress={handleAddNextIa}
                activeOpacity={0.8}
              >
                <Text style={styles.addIaBtnText}>
                  + Add IA-{iaTerms.length + 1}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.termPillRow}
            >
              {iaTerms.map((term) => {
                const active = selectedTerm === term;
                return (
                  <TouchableOpacity
                    key={term}
                    style={[styles.termPill, active && styles.termPillActive]}
                    onPress={() => setSelectedTerm(term)}
                  >
                    <Text
                      style={[
                        styles.termPillText,
                        active && styles.termPillTextActive,
                      ]}
                    >
                      {term}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Dual Fields: Marks (Obtained Score & Total Marks) */}
            <View style={styles.dualSectionCard}>
              <View style={styles.dualHeaderRow}>
                <Text style={styles.dualSectionTitle}>
                  1. Internal Assessment Marks ({selectedTerm})
                </Text>
                <View style={styles.scaledBadge}>
                  <Text style={styles.scaledBadgeText}>
                    Scaled: {scaledPreview.scaledM.toFixed(2)} / 10
                  </Text>
                </View>
              </View>

              <View style={styles.dualInputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>OBTAINED SCORE</Text>
                  <TextInput
                    style={styles.numInput}
                    keyboardType="decimal-pad"
                    value={marksObtained}
                    onChangeText={setMarksObtained}
                    placeholder="e.g. 42"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.dividerSlash}>
                  <Text style={styles.slashText}>/</Text>
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>TOTAL MARKS</Text>
                  <TextInput
                    style={styles.numInput}
                    keyboardType="decimal-pad"
                    value={totalMarks}
                    onChangeText={setTotalMarks}
                    placeholder="e.g. 50"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            </View>

            {/* Dual Fields: Attendance (Attended Classes & Total Classes) */}
            <View style={styles.dualSectionCard}>
              <View style={styles.dualHeaderRow}>
                <Text style={styles.dualSectionTitle}>
                  2. Class Attendance Record ({selectedTerm})
                </Text>
                <View style={styles.scaledBadge}>
                  <Text style={styles.scaledBadgeText}>
                    Scaled: {scaledPreview.scaledA.toFixed(2)} / 10
                  </Text>
                </View>
              </View>

              <View style={styles.dualInputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>ATTENDED CLASSES</Text>
                  <TextInput
                    style={styles.numInput}
                    keyboardType="decimal-pad"
                    value={attendedClasses}
                    onChangeText={setAttendedClasses}
                    placeholder="e.g. 36"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.dividerSlash}>
                  <Text style={styles.slashText}>/</Text>
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>TOTAL CLASSES</Text>
                  <TextInput
                    style={styles.numInput}
                    keyboardType="decimal-pad"
                    value={totalClasses}
                    onChangeText={setTotalClasses}
                    placeholder="e.g. 40"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            </View>

            {/* Live Composite Summary Strip */}
            <View style={styles.previewBanner}>
              <View>
                <Text style={styles.previewLabel}>AUTO-SCALED COMPOSITE SCORE</Text>
                <Text style={styles.previewFormula}>
                  (0.6 × {scaledPreview.scaledM.toFixed(1)}) + (0.4 ×{' '}
                  {scaledPreview.scaledA.toFixed(1)})
                </Text>
              </View>
              <Text style={styles.previewTotalValue}>
                {scaledPreview.mastery.toFixed(2)}{' '}
                <Text style={styles.previewOutTen}>/ 10</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, isSavingEval && { opacity: 0.65 }]}
              disabled={isSavingEval}
              onPress={handleSaveEvaluation}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {isSavingEval
                  ? 'Updating Diagnostics...'
                  : 'Update & Recompute Diagnostics'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // ====================================================================
          // PAGE 2: SCHOLAR GUIDANCE INQUIRIES WORKSPACE
          // ====================================================================
          <View>
            {/* Search Inquiries Bar */}
            <View style={[styles.searchBox, { backgroundColor: '#ffffff', marginBottom: 14 }]}>
              <Svg
                width={16}
                height={16}
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
                placeholder="Search inquiries by student name, USN, or topic..."
                placeholderTextColor="#94a3b8"
                value={inquirySearch}
                onChangeText={setInquirySearch}
              />
              {inquirySearch.length > 0 && (
                <TouchableOpacity onPress={() => setInquirySearch('')}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {filteredQueries.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>No Scholar Inquiries Found</Text>
                <Text style={styles.emptyStateSub}>
                  Questions submitted by your allocated mentees will appear here for guidance and response.
                </Text>
              </View>
            ) : (
              filteredQueries.map((q) => {
                const scholarName =
                  studentNameMap.get(String(q.studentId).toUpperCase()) || 'Scholar';
                const isAnswered = q.status === 'Answered' || Boolean(q.response);

                return (
                  <View key={q.id} style={styles.inquiryCard}>
                    <View style={styles.inquiryTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.inquiryAuthorRow}>
                          <Text style={styles.inquiryStudentName}>{scholarName}</Text>
                          <Text style={styles.inquiryStudentUsn}>({q.studentId})</Text>
                        </View>
                        <Text style={styles.inquirySubject}>{q.subject}</Text>
                      </View>

                      <View style={styles.inquiryRightActions}>
                        <View
                          style={[
                            styles.statusBadge,
                            isAnswered ? styles.badgeAnswered : styles.badgePending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isAnswered
                                ? styles.badgeAnsweredText
                                : styles.badgePendingText,
                            ]}
                          >
                            {isAnswered ? 'ANSWERED' : 'NEEDS REPLY'}
                          </Text>
                        </View>

                        {/* Delete / Remove Inquiry Button */}
                        <TouchableOpacity
                          style={styles.deleteIconBtn}
                          onPress={() => handleConfirmDeleteQuery(q.id, q.subject)}
                          activeOpacity={0.75}
                        >
                          <Svg
                            width={15}
                            height={15}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#e11d48"
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

                    {/* Student Question Box */}
                    <View style={styles.questionBubble}>
                      <Text style={styles.questionText}>{q.message}</Text>
                    </View>

                    {/* Existing Mentor Response (if answered) */}
                    {Boolean(q.response) && (
                      <View style={styles.existingReplyBox}>
                        <Text style={styles.existingReplyLabel}>
                          FACULTY GUIDANCE SENT:
                        </Text>
                        <Text style={styles.existingReplyText}>{q.response}</Text>
                      </View>
                    )}

                    {/* Spacious Multi-Line Faculty Response Composer */}
                    <Text style={styles.composerLabel}>
                      {isAnswered ? 'UPDATE FACULTY RESPONSE' : 'WRITE FACULTY RESPONSE'}
                    </Text>
                    <TextInput
                      style={styles.responseTextarea}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      placeholder="Write detailed academic guidance or action steps for this scholar..."
                      placeholderTextColor="#94a3b8"
                      value={replyDrafts[q.id] ?? ''}
                      onChangeText={(txt) =>
                        setReplyDrafts((prev) => ({ ...prev, [q.id]: txt }))
                      }
                    />

                    <View style={styles.inquiryFooterRow}>
                      <TouchableOpacity
                        style={styles.removeTextBtn}
                        onPress={() => handleConfirmDeleteQuery(q.id, q.subject)}
                      >
                        <Text style={styles.removeTextBtnLabel}>Remove Inquiry</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.sendReplyBtn,
                          sendingReplyId === q.id && { opacity: 0.65 },
                        ]}
                        disabled={sendingReplyId === q.id}
                        onPress={() => handleSendReply(q.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.sendReplyBtnText}>
                          {sendingReplyId === q.id
                            ? 'Sending...'
                            : isAnswered
                            ? 'Update Response'
                            : 'Send Response'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MentorMoreScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#1e1b4b' },
  topbar: {
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
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  topbarSub: {
    color: '#cbd5e1',
    fontSize: 11.5,
    marginTop: 2,
  },
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
  },
  signOutText: { color: '#ffffff', fontSize: 11.5, fontWeight: '700' },
  pageSwitcherBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pageSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageSwitchBtnActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  pageSwitchText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
  pageSwitchTextActive: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  unreadDot: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  unreadDotText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  container: { flex: 1, backgroundColor: '#f3f6fc' },
  scrollContent: { padding: 15 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15.5, fontWeight: '800', color: '#1e293b' },
  cardSubtitle: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    paddingVertical: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94a3b8',
    paddingHorizontal: 4,
  },
  emptyNoticeText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  menteePillRow: {
    gap: 8,
    paddingBottom: 14,
  },
  menteePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#f8fafc',
  },
  menteePillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  menteePillName: { fontSize: 12.5, fontWeight: '800', color: '#1e293b' },
  menteePillNameActive: { color: '#ffffff' },
  menteePillUsn: { fontSize: 10.5, color: '#64748b', marginTop: 1 },
  menteePillUsnActive: { color: '#e0e7ff' },
  termHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  addIaBtn: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addIaBtnText: { fontSize: 11, fontWeight: '800', color: '#4f46e5' },
  termPillRow: {
    gap: 8,
    paddingBottom: 16,
  },
  termPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  termPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  termPillText: { fontSize: 12.5, fontWeight: '700', color: '#475569' },
  termPillTextActive: { color: '#ffffff', fontWeight: '800' },
  dualSectionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  dualHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dualSectionTitle: { fontSize: 12.5, fontWeight: '800', color: '#1e293b' },
  scaledBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scaledBadgeText: { fontSize: 11, fontWeight: '800', color: '#4f46e5' },
  dualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputCol: { flex: 1 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  numInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dividerSlash: { paddingTop: 18, paddingHorizontal: 2 },
  slashText: { fontSize: 18, fontWeight: '800', color: '#94a3b8' },
  previewBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338ca',
    letterSpacing: 0.6,
  },
  previewFormula: { fontSize: 11.5, color: '#6366f1', marginTop: 2, fontWeight: '600' },
  previewTotalValue: { fontSize: 20, fontWeight: '800', color: '#4f46e5' },
  previewOutTen: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  primaryBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  emptyStateTitle: { fontSize: 14.5, fontWeight: '800', color: '#1e293b' },
  emptyStateSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
  inquiryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 2,
  },
  inquiryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  inquiryAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inquiryStudentName: { fontSize: 14.5, fontWeight: '800', color: '#1e293b' },
  inquiryStudentUsn: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  inquirySubject: { fontSize: 13, fontWeight: '700', color: '#4f46e5', marginTop: 3 },
  inquiryRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeAnswered: { backgroundColor: '#ecfdf5' },
  badgePending: { backgroundColor: '#fff1f2' },
  statusBadgeText: { fontSize: 9.5, fontWeight: '800' },
  badgeAnsweredText: { color: '#047857' },
  badgePendingText: { color: '#be123c' },
  deleteIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionBubble: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  questionText: { fontSize: 13, color: '#334155', lineHeight: 19 },
  existingReplyBox: {
    backgroundColor: '#eef2ff',
    borderLeftWidth: 3,
    borderLeftColor: '#4f46e5',
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
  },
  existingReplyLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4338ca',
    letterSpacing: 0.6,
  },
  existingReplyText: {
    fontSize: 12.5,
    color: '#1e1b4b',
    marginTop: 4,
    lineHeight: 18,
  },
  composerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  responseTextarea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 96,
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 19,
  },
  inquiryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  removeTextBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  removeTextBtnLabel: { color: '#be123c', fontSize: 12, fontWeight: '700' },
  sendReplyBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendReplyBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});