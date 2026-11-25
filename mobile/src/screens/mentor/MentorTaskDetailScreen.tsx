import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path, Polyline, Line, Circle } from 'react-native-svg';
import { useDataContext } from '../../context/useDataContext';

const buildDownloadUrl = (url: string) => {
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ik-attachment=true`;
};

export const MentorTaskDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { taskId, scholarName } = route.params || {};
  const { tasks, toggleTaskStatus, deleteTask } = useDataContext();

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return (
      <View
        style={[
          styles.mainWrapper,
          { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
          Task not found.
        </Text>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#a5b4fc', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDone = String(task.status || '').toLowerCase() === 'completed';
  const titleParts = String(task.title || '').split(' — ');
  const mainTitle = titleParts[0];
  const resolvedDescription =
    task.description?.trim() || titleParts.slice(1).join(' — ');

  const handleViewDocument = async (url?: string, mimeType?: string) => {
    if (!url) return;
    const isImg =
      String(mimeType || '').startsWith('image/') ||
      /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url);
    if (isImg) {
      setPreviewImageUrl(url);
    } else {
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert('Unable to Open', 'Could not open this document.');
      }
    }
  };

  const handleDownloadDocument = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(buildDownloadUrl(url));
    } catch {
      Alert.alert('Download Failed', 'Could not start file download.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Permanently delete this task and its uploaded documents?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(task.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Line x1="19" y1="12" x2="5" y2="12" />
            <Polyline points="12 19 5 12 12 5" />
          </Svg>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topbarKicker}>MENTOR REVIEW</Text>
          <Text style={styles.topbarTitle}>Task Details</Text>
        </View>
        <View style={[styles.statusBadge, isDone ? styles.badgeDone : styles.badgePending]}>
          <Text
            style={[
              styles.statusBadgeText,
              isDone ? styles.badgeDoneText : styles.badgePendingText,
            ]}
          >
            {isDone ? 'COMPLETED' : 'PENDING'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      >
        <View style={styles.card}>
          <Text style={styles.cardKicker}>ASSIGNED ACTION PLAN</Text>
          <Text style={styles.title}>{mainTitle}</Text>
          <Text style={styles.meta}>
            Scholar: {scholarName || 'Scholar'} ({task.studentId}) • Priority:{' '}
            {task.priority || 'High'} • Due: {task.dueDate}
          </Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>
              {resolvedDescription ||
                'Complete the assigned academic action item and upload proof before the deadline.'}
            </Text>
          </View>
        </View>

        {Boolean(task.referenceFile?.fileUrl) && (
          <View style={styles.card}>
            <Text style={styles.cardKicker}>YOUR ATTACHED REFERENCE</Text>
            <Text style={styles.fileName}>{task.referenceFile?.fileName}</Text>
            <Text style={styles.fileMeta}>
              {task.referenceFile?.fileSize || 'Reference Document'}
            </Text>
            <View style={styles.docBtnRow}>
              <TouchableOpacity
                style={styles.btnViewDoc}
                onPress={() =>
                  handleViewDocument(
                    task.referenceFile?.fileUrl,
                    task.referenceFile?.mimeType
                  )
                }
              >
                <Svg
                  width={15}
                  height={15}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <Circle cx="12" cy="12" r="3" />
                </Svg>
                <Text style={styles.btnViewDocText}>View Document</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDownloadDoc}
                onPress={() => handleDownloadDocument(task.referenceFile?.fileUrl)}
              >
                <Svg
                  width={15}
                  height={15}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <Polyline points="7 10 12 15 17 10" />
                  <Line x1="12" y1="15" x2="12" y2="3" />
                </Svg>
                <Text style={styles.btnDownloadDocText}>Download File</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardKicker}>STUDENT SUBMISSION & PROOF</Text>
          {task.submission ? (
            <>
              {Boolean(task.submission.submittedAt) && (
                <Text style={styles.submittedAt}>
                  Submitted on {new Date(task.submission.submittedAt!).toLocaleString()}
                </Text>
              )}
              {Boolean(task.submission.remarks) && (
                <View style={styles.descBox}>
                  <Text style={styles.descText}>{task.submission.remarks}</Text>
                </View>
              )}
              {task.submission.fileUrl ? (
                <View style={styles.proofFileBox}>
                  <Text style={styles.fileName}>
                    {task.submission.fileName || 'Submitted_Proof'}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {task.submission.fileSize || 'Uploaded Proof'}
                  </Text>
                  <View style={styles.docBtnRow}>
                    <TouchableOpacity
                      style={styles.btnViewDoc}
                      onPress={() =>
                        handleViewDocument(
                          task.submission?.fileUrl,
                          task.submission?.mimeType
                        )
                      }
                    >
                      <Svg
                        width={15}
                        height={15}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <Circle cx="12" cy="12" r="3" />
                      </Svg>
                      <Text style={styles.btnViewDocText}>View Document</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnDownloadDoc}
                      onPress={() => handleDownloadDocument(task.submission?.fileUrl)}
                    >
                      <Svg
                        width={15}
                        height={15}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <Polyline points="7 10 12 15 17 10" />
                        <Line x1="12" y1="15" x2="12" y2="3" />
                      </Svg>
                      <Text style={styles.btnDownloadDocText}>Download File</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  Student marked complete without attaching a file.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No proof uploaded by the student yet.</Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity
          style={[styles.footerBtnPrimary, isDone && styles.footerBtnReopen]}
          onPress={() => toggleTaskStatus(task.id)}
        >
          <Text
            style={[
              styles.footerBtnPrimaryText,
              isDone && styles.footerBtnReopenText,
            ]}
          >
            {isDone ? 'Reopen Pending' : 'Mark Completed'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtnDelete} onPress={handleDelete}>
          <Text style={styles.footerBtnDeleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={Boolean(previewImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={[styles.closePreviewBtn, { top: insets.top + 14 }]}
            onPress={() => setPreviewImageUrl(null)}
          >
            <Text style={styles.closePreviewText}>Close Preview</Text>
          </TouchableOpacity>
          {previewImageUrl && (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.previewImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

export default MentorTaskDetailScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#1e1b4b' },
  topbar: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarKicker: { color: '#a5b4fc', fontSize: 9.5, fontWeight: '800', letterSpacing: 1 },
  topbarTitle: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginTop: 1 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  badgePending: { backgroundColor: '#fffbeb' },
  badgeDone: { backgroundColor: '#ecfdf5' },
  statusBadgeText: { fontSize: 9.5, fontWeight: '800' },
  badgePendingText: { color: '#b45309' },
  badgeDoneText: { color: '#047857' },
  body: { flex: 1, backgroundColor: '#f3f6fc' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  cardKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4f46e5',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  title: { fontSize: 16.5, fontWeight: '800', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 5, fontWeight: '600' },
  descBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  descText: { fontSize: 13, color: '#334155', lineHeight: 19 },
  submittedAt: { fontSize: 11.5, fontWeight: '700', color: '#047857', marginBottom: 6 },
  proofFileBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#edf2fb',
  },
  fileName: { fontSize: 13.5, fontWeight: '800', color: '#172b4d' },
  fileMeta: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  docBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnViewDoc: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 10,
    paddingVertical: 11,
  },
  btnViewDocText: { fontSize: 12.5, fontWeight: '800', color: '#4f46e5' },
  btnDownloadDoc: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 11,
  },
  btnDownloadDocText: { fontSize: 12.5, fontWeight: '800', color: '#1e293b' },
  emptyText: { fontSize: 12.5, color: '#64748b', fontStyle: 'italic' },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dce5f3',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  footerBtnPrimary: {
    flex: 1.6,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  footerBtnReopen: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  footerBtnPrimaryText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
  footerBtnReopenText: { color: '#b45309' },
  footerBtnDelete: {
    flex: 0.9,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  footerBtnDeleteText: { color: '#be123c', fontSize: 13.5, fontWeight: '800' },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  closePreviewText: { color: '#ffffff', fontWeight: '800', fontSize: 12.5 },
  previewImg: { width: '94%', height: '78%' },
});