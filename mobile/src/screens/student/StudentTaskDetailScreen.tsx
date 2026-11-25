import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Linking,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { useDataContext, IPickedFile } from '../../context/useDataContext';

const buildDownloadUrl = (url: string) => {
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ik-attachment=true`;
};

export const StudentTaskDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { taskId } = route.params || {};
  const { tasks, submitTaskProof } = useDataContext();

  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState<IPickedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
        <Text style={{ color: '#ffffff', fontWeight: '700' }}>Task not found.</Text>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#a5c4ff', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCompleted = String(task.status || '').toLowerCase() === 'completed';
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

  const handlePickProof = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setProofFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/pdf',
          size: asset.size,
        });
      }
    } catch {
      Alert.alert('File Picker Error', 'Unable to open file picker.');
    }
  };

  const handleSubmit = async () => {
    if (!proofFile && !remarks.trim()) {
      Alert.alert(
        'Add Proof or Remarks',
        'Please upload a proof document or enter submission remarks.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await submitTaskProof(task.id, { remarks, file: proofFile });
      Alert.alert('Submitted', 'Your work has been submitted and marked completed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />
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
          <Text style={styles.topbarKicker}>ACTION PLAN DETAILS</Text>
          <Text style={styles.topbarTitle}>Task & Proof Upload</Text>
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
              isCompleted ? styles.badgeDoneText : styles.badgePendingText,
            ]}
          >
            {isCompleted ? 'COMPLETED' : 'PENDING'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>{mainTitle}</Text>
          <Text style={styles.meta}>
            Priority: {task.priority || 'High'} • Due Date: {task.dueDate}
          </Text>
          {Boolean(resolvedDescription) && (
            <View style={styles.descBox}>
              <Text style={styles.descText}>{resolvedDescription}</Text>
            </View>
          )}

          {Boolean(task.referenceFile?.fileUrl) && (
            <View style={styles.refBar}>
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#315fc4"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <Polyline points="14 2 14 8 20 8" />
              </Svg>
              <View style={{ flex: 1 }}>
                <Text style={styles.refBarKicker}>MENTOR REFERENCE</Text>
                <Text style={styles.refBarName} numberOfLines={1}>
                  {task.referenceFile?.fileName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  handleViewDocument(
                    task.referenceFile?.fileUrl,
                    task.referenceFile?.mimeType
                  )
                }
              >
                <Text style={styles.refBarAction}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(buildDownloadUrl(task.referenceFile!.fileUrl))
                }
              >
                <Text style={styles.refBarAction}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!isCompleted ? (
          <View style={styles.card}>
            <Text style={styles.sectionKicker}>SUBMIT YOUR WORK</Text>
            <Text style={styles.label}>Submission Remarks (Optional)</Text>
            <TextInput
              style={styles.remarksInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Add notes about your completed work..."
              placeholderTextColor="#91a0b8"
              value={remarks}
              onChangeText={setRemarks}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Upload Proof Document</Text>
            {!proofFile ? (
              <TouchableOpacity
                style={styles.dropzone}
                onPress={handlePickProof}
                activeOpacity={0.8}
              >
                <View style={styles.dropIconCircle}>
                  <Svg
                    width={22}
                    height={22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#315fc4"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <Polyline points="17 8 12 3 7 8" />
                    <Line x1="12" y1="3" x2="12" y2="15" />
                  </Svg>
                </View>
                <Text style={styles.dropTitle}>Tap to Upload Proof Document</Text>
                <Text style={styles.dropSub}>PDF, JPG, or PNG • Max 15 MB</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.pickedFileBox}>
                <Svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#315fc4"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <Polyline points="14 2 14 8 20 8" />
                </Svg>
                <Text style={styles.pickedFileName} numberOfLines={1}>
                  {proofFile.name}
                </Text>
                <TouchableOpacity onPress={() => setProofFile(null)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit & Mark Complete</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' },
            ]}
          >
            <Text style={[styles.sectionKicker, { color: '#047857' }]}>
              SUBMISSION RECORDED
            </Text>
            {Boolean(task.submission?.remarks) && (
              <Text style={styles.descText}>{task.submission?.remarks}</Text>
            )}
            {Boolean(task.submission?.fileUrl) && (
              <View style={styles.refBar}>
                <Text style={styles.refBarName} numberOfLines={1}>
                  {task.submission?.fileName || 'Uploaded_Proof'}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    handleViewDocument(
                      task.submission?.fileUrl,
                      task.submission?.mimeType
                    )
                  }
                >
                  <Text style={styles.refBarAction}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(buildDownloadUrl(task.submission!.fileUrl!))
                  }
                >
                  <Text style={styles.refBarAction}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

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

export default StudentTaskDetailScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#14294e' },
  topbar: {
    backgroundColor: '#14294e',
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
  topbarKicker: { color: '#a5c4ff', fontSize: 9.5, fontWeight: '800', letterSpacing: 1 },
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
  title: { fontSize: 16.5, fontWeight: '800', color: '#172b4d' },
  meta: { fontSize: 12, color: '#5e6f8c', marginTop: 4, fontWeight: '600' },
  descBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  descText: { fontSize: 13, color: '#334155', lineHeight: 19 },
  refBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eef3ff',
    borderWidth: 1,
    borderColor: '#c7d8fb',
    borderRadius: 11,
    padding: 12,
    marginTop: 12,
  },
  refBarKicker: { fontSize: 9.5, fontWeight: '800', color: '#315fc4' },
  refBarName: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#172b4d' },
  refBarAction: { fontSize: 12, fontWeight: '800', color: '#315fc4', paddingHorizontal: 4 },
  sectionKicker: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#315fc4',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  remarksInput: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 11,
    padding: 11,
    backgroundColor: '#fbfdff',
    fontSize: 13,
    color: '#172b4d',
  },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93c5fd',
    backgroundColor: '#f8fbff',
    borderRadius: 14,
    paddingVertical: 22,
    alignItems: 'center',
  },
  dropIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8efff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dropTitle: { fontSize: 13.5, fontWeight: '800', color: '#172b4d' },
  dropSub: { fontSize: 11.5, color: '#64748b', marginTop: 3 },
  pickedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eef3ff',
    borderWidth: 1,
    borderColor: '#c7d8fb',
    borderRadius: 12,
    padding: 12,
  },
  pickedFileName: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#172b4d' },
  removeText: { fontSize: 11.5, fontWeight: '800', color: '#be123c' },
  submitBtn: {
    backgroundColor: '#315fc4',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
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