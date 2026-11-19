import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

export const InquiriesScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { queries, replyQuery, deleteQuery, syncFromDatabase, isLoading } = useDataContext();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    syncFromDatabase('mentor');
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromDatabase('mentor');
    setRefreshing(false);
  };

  const openReplyModal = (q: any) => {
    setSelectedQuery(q);
    setReplyText(q.response || '');
    setModalVisible(true);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedQuery) return;
    try {
      await replyQuery(selectedQuery.id, replyText.trim());
      Alert.alert('Response Dispatched', 'Guidance reply sent to the student portal.');
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Failed to send reply', error.message);
    }
  };

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />

      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerPortalTag}>COUNSELING &amp; TICKETS</Text>
          <Text style={styles.headerTitle}>Mentee Inquiries</Text>
          <Text style={styles.headerSub}>Respond to student guidance questions</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
       refreshControl={
  <RefreshControl
  refreshing={refreshing}
  onRefresh={onRefresh}
  tintColor="#059669"
  colors={['#059669']}
/>
}
      >
        {queries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Queue Cleared</Text>
            <Text style={styles.emptySub}>No active student inquiries pending review.</Text>
          </View>
        ) : (
          queries.map((q) => (
            <View key={q.id} style={styles.queryCard}>
              <View style={styles.queryCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.querySubject}>{q.subject}</Text>
                  <Text style={styles.queryMeta}>From USN: {q.studentId}</Text>
                </View>
                <View style={[styles.statusPill, q.status === 'Answered' ? styles.statusPillDone : styles.statusPillPending]}>
                  <Text style={[styles.statusPillText, q.status === 'Answered' ? styles.statusTextDone : styles.statusTextPending]}>
                    {q.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.queryBody}>{q.message}</Text>

              {q.response ? (
                <View style={styles.responseBox}>
                  <Text style={styles.responseLabel}>Your Guidance:</Text>
                  <Text style={styles.responseText}>“{q.response}”</Text>
                </View>
              ) : null}

              <View style={styles.queryCardBottom}>
                <TouchableOpacity onPress={() => deleteQuery(q.id)}>
                  <Text style={styles.dismissText}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.replyBtn} onPress={() => openReplyModal(q)}>
                  <Text style={styles.replyBtnText}>{q.response ? 'Update Reply' : 'Answer Question'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Reply Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reply to Mentee</Text>
            <Text style={styles.modalSub}>{selectedQuery?.subject} (USN: {selectedQuery?.studentId})</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter guidance response..."
              multiline
              numberOfLines={4}
              value={replyText}
              onChangeText={setReplyText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSend} onPress={handleSendReply}>
                <Text style={styles.modalSendText}>Send Response</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#064e3b' },
  topHeader: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerPortalTag: { fontSize: 9, fontWeight: '800', color: '#6ee7b7', letterSpacing: 0.8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  headerSub: { fontSize: 11, color: '#a7f3d0', marginTop: 2 },
  signOutBtn: { backgroundColor: '#047857', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#10b981' },
  signOutBtnText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 14 },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 40, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 11, color: '#64748b', marginTop: 4 },
  queryCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  queryCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  querySubject: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  queryMeta: { fontSize: 10, color: '#64748b', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillDone: { backgroundColor: '#f0fdf4' },
  statusPillPending: { backgroundColor: '#fefce8' },
  statusPillText: { fontSize: 9, fontWeight: '800' },
  statusTextDone: { color: '#059669' },
  statusTextPending: { color: '#b45309' },
  queryBody: { fontSize: 12, color: '#475569', lineHeight: 17 },
  responseBox: { marginTop: 10, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#059669' },
  responseLabel: { fontSize: 10, fontWeight: '800', color: '#059669', marginBottom: 2 },
  responseText: { fontSize: 11, color: '#334155', fontStyle: 'italic', lineHeight: 16 },
  queryCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  dismissText: { fontSize: 11, color: '#ef4444', fontWeight: '700' },
  replyBtn: { backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  replyBtnText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 18, elevation: 5 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  modalSub: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 12, backgroundColor: '#f8fafc', textAlignVertical: 'top', minHeight: 90, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalCancel: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  modalCancelText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  modalSend: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#059669', alignItems: 'center' },
  modalSendText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
});