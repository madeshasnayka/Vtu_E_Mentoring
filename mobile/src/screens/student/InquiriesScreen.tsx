import React, { useState, useCallback } from 'react';
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
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

export const InquiriesScreen = () => {
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const { queries, addQuery, syncFromDatabase } = useDataContext();
  const [refreshing, setRefreshing] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

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

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing Fields', 'Please enter both subject and message.');
      return;
    }
    await addQuery({ subject: subject.trim(), message: message.trim() });
    setSubject('');
    setMessage('');
    Alert.alert('Dispatched', 'Your inquiry has been sent to your Faculty Mentor.');
  };

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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#315fc4"
          />
        }
      >
        <View style={styles.sectionHead}>
          <Text style={styles.sectionHeadTitle}>Direct Mentor Inquiries</Text>
          <Text style={styles.sectionHeadSub}>Academic guidance</Text>
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>Dispatch New Inquiry to Mentor</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>SUBJECT / TOPIC</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Module 1 Ethical Hacking Doubt"
              placeholderTextColor="#91a0b8"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>MESSAGE</Text>
            <TextInput
              style={[styles.formInput, { minHeight: 72, textAlignVertical: 'top' }]}
              multiline
              placeholder="Describe your academic question..."
              placeholderTextColor="#91a0b8"
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleSend}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Send Inquiry to Mentor</Text>
          </TouchableOpacity>
        </View>

        {queries.map((q) => (
          <View key={q.id} style={styles.inquiryCard}>
            <Text style={styles.inqSubject}>{q.subject}</Text>
            <Text style={styles.inqMsg}>{q.message}</Text>
            {!!q.response && (
              <View style={styles.replyBox}>
                <Text style={styles.replyText}>
                  <Text style={{ fontWeight: '800' }}>Mentor Response: </Text>
                  {q.response}
                </Text>
              </View>
            )}
            <Text
              style={[
                styles.inqStatus,
                q.status === 'Answered' && { color: '#047857' },
              ]}
            >
              Status: {q.status}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default InquiriesScreen;

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
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 13,
  },
  sectionHeadTitle: { color: '#172f55', fontSize: 15.5, fontWeight: '800' },
  sectionHeadSub: { color: '#5e6f8c', fontSize: 10.5, fontWeight: '600' },
  panelCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 18,
    padding: 16,
    marginBottom: 13,
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
  formGroup: { marginBottom: 13 },
  label: {
    color: '#5e6f8c',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  formInput: {
    minHeight: 45,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 11,
    backgroundColor: '#fbfdff',
    color: '#172b4d',
    fontSize: 13.5,
  },
  btnPrimary: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#315fc4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
  inquiryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    elevation: 1,
  },
  inqSubject: { fontSize: 13.5, fontWeight: '800', color: '#172b4d' },
  inqMsg: { fontSize: 12, color: '#5e6f8c', marginTop: 4, lineHeight: 17 },
  replyBox: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 3,
    borderLeftColor: '#047857',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  replyText: { fontSize: 11.5, color: '#047857' },
  inqStatus: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#b45309',
    marginTop: 8,
  },
});