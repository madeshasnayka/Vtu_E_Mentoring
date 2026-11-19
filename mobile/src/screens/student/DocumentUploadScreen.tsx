import React, { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';
import apiClient from '../../api/client';
import { printOrExportDossierPdf } from '../../utils/dossierPdfPrint';

export type DossierCategory =
  | 'Marks Card'
  | 'Degree Certificate'
  | 'Project Draft'
  | 'Achievement Proof';

const CATEGORIES: DossierCategory[] = [
  'Marks Card',
  'Degree Certificate',
  'Project Draft',
  'Achievement Proof',
];

interface PickedFileAsset {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}

const inferMimeType = (fileName: string, providedMime?: string) => {
  if (providedMime && providedMime !== 'application/octet-stream') {
    return providedMime;
  }
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/pdf';
};

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '1.2 MB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const createDefaultDossier = (user: any) => ({
  personal: {
    dob: '2005-01-15',
    contactNo: '9632039934',
    email: user?.email || 'madeshnayak7712@gmail.com',
    bloodGroup: 'O+ve',
    permanentAddress:
      'S.R.S Road 14th Ward, Gundlupet Taluk, Chamarajanagar district, Karnataka',
    cityPincode: 'Gundlupet - 571111',
    fatherNameOccupation: 'Sreedhar (Garment)',
    motherNameOccupation: 'Rajeshwari (House wife)',
  },
  academics: {
    qualifications: [
      { degree: 'SSLC', spec: '-', boardUniv: 'KSEEB', year: '2020', cgpaPercent: '82.5%' },
      { degree: 'PUC', spec: 'EBACS', boardUniv: 'KPUC', year: '2022', cgpaPercent: '92.5%' },
      { degree: 'Degree', spec: 'BCA', boardUniv: 'Mysore University', year: '2025', cgpaPercent: '9.12 CGPA' },
    ],
    pgcetRank: 'PGCET Rank 412',
    semesters: {
      sem1: [{ code: '24MCA11', ia: '45', final: '48', total: '93' }],
      sem2: [{ code: '', ia: '', final: '', total: '' }],
      sem3: [{ code: '', ia: '', final: '', total: '' }],
      sem4: [{ code: '', ia: '', final: '', total: '' }],
    },
  },
  projects: {
    internship: {
      addressContact: 'VTU Regional Centre, Mysuru',
      fromDate: '2026-01-10',
      toDate: '2026-04-10',
      guideName: 'Dr. Kumar P K',
    },
    project: {
      title: 'Proactive Early-Warning E-Mentoring System',
      guide: 'Dr. Kumar P K',
      address: 'VTU Centre for PG Studies, Mysuru',
      duration: '6 Months',
      elective: 'Cybersecurity & AI',
    },
    achievements: [
      {
        title: 'ICSEM 2026 Paper Presentation',
        description: 'Accepted for Full Paper Presentation at VTU Mysuru',
      },
    ],
  },
  swot: {
    strengths: 'Disciplined guy with self improvement',
    weaknesses: 'Impulsiveness',
    opportunities: 'Upcoming projects in college',
    threats: 'High competition in job market',
    careerPlans: 'Aiming to build soft skills.',
    areaOfInterest: 'MERN Stack and ML in python.',
    extraCurricular: 'Singing',
    coCurricular: 'Hackathons & Coding',
    trainingUndergone: 'MERN Stack',
    digitalSignature: user?.name || 'Madesha S',
    isSigned: true,
  },
  meetings: [
    {
      date: '2025-12-01',
      time: '3:00-4:00',
      topics: 'Guidelines & principles of joining',
      observation: 'Good academic start',
      recommendation: 'Clear about perspective of joining',
    },
  ],
});

export const DocumentUploadScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuthStore();
  const { documents, deleteDocument, syncFromDatabase } = useDataContext();

  const [screenMode, setScreenMode] = useState<'archive' | 'upload'>('archive');
  const [activeTab, setActiveTab] = useState<
    'personal' | 'academics' | 'projects' | 'swot' | 'meetings'
  >('personal');
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const studentUsn = user?.identifier || '4VZ25MC055';
  const [studentName, setStudentName] = useState(user?.name || 'MADESHA.S');
  const [dossier, setDossier] = useState(() => createDefaultDossier(user));
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DossierCategory>('Marks Card');
  const [selectedFileName, setSelectedFileName] = useState('No file chosen');
  const [selectedAsset, setSelectedAsset] = useState<PickedFileAsset | null>(null);

  const loadStudentDossier = useCallback(async () => {
    try {
      const res = await apiClient.get(`/student/dossier/${studentUsn}`);
      if (res.data?.dossier) {
        setDossier((prev) => ({ ...prev, ...res.data.dossier }));
      }
      if (res.data?.student?.name) {
        setStudentName(res.data.student.name);
      }
    } catch {
      // Uses initial dossier state if offline
    }
  }, [studentUsn]);

  useFocusEffect(
    useCallback(() => {
      syncFromDatabase('student');
      loadStudentDossier();
    }, [syncFromDatabase, loadStudentDossier])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromDatabase('student');
    await loadStudentDossier();
    setRefreshing(false);
  };

  const handleOpenCloudFile = (doc: any) => {
    const url = doc?.fileUri;
    if (!url) {
      Alert.alert(
        'No Cloud File URL',
        'This record does not have an ImageKit file link attached.'
      );
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Cannot Open File', 'Unable to open the uploaded file URL.')
    );
  };

  const openUploadPage = (prefillTitle = '', prefillCat?: string) => {
    setDocTitle(prefillTitle);
    if (prefillCat && CATEGORIES.includes(prefillCat as DossierCategory)) {
      setDocCategory(prefillCat as DossierCategory);
    } else {
      setDocCategory('Marks Card');
    }
    setSelectedAsset(null);
    setSelectedFileName(
      prefillTitle ? `${prefillTitle.replace(/\s+/g, '_')}.pdf` : 'No file chosen'
    );
    setScreenMode('upload');
  };

const handlePickPdfOrDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: false, // Prevents Android Expo Go DocumentPicker cache lock
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const safeName =
        file.name || `VTU_${docCategory.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const safeMime = inferMimeType(safeName, file.mimeType);

      // Copy content:// URI into our own writable cacheDirectory so uploadAsync always has read permission
      let readableUri = file.uri;
      if (readableUri.startsWith('content://') && FileSystem.cacheDirectory) {
        const destUri = `${FileSystem.cacheDirectory}${Date.now()}_${safeName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        await FileSystem.copyAsync({
          from: readableUri,
          to: destUri,
        });
        readableUri = destUri;
      }

      setSelectedAsset({
        uri: readableUri,
        name: safeName,
        mimeType: safeMime,
        sizeBytes: file.size,
      });
      setSelectedFileName(safeName);

      if (!docTitle.trim()) {
        const cleanTitle = safeName
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]+/g, ' ');
        setDocTitle(cleanTitle);
      }
    } catch (err: any) {
      Alert.alert(
        'File Picker Error',
        err?.message || 'Could not read the selected PDF document on this device.'
      );
    }
  };

  const handlePickGalleryImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to select certificate or marks card images.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      const img = result.assets[0];
      const derivedName =
        img.fileName ||
        img.uri.split('/').pop() ||
        `IMG_${Date.now()}.jpg`;
      const safeMime = inferMimeType(derivedName, img.mimeType || 'image/jpeg');
      setSelectedAsset({
        uri: img.uri,
        name: derivedName,
        mimeType: safeMime,
        sizeBytes: img.fileSize,
      });
      setSelectedFileName(derivedName);
      if (!docTitle.trim()) {
        const cleanTitle = derivedName
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]+/g, ' ');
        setDocTitle(cleanTitle);
      }
    } catch (err: any) {
      Alert.alert('Image Picker Error', err?.message || 'Could not select image.');
    }
  };

  const handleChooseFile = () => {
    Alert.alert(
      'Attach Certificate / Verification Proof',
      'Select attachment source from your device:',
      [
        {
          text: 'Browse PDF / Document',
          onPress: handlePickPdfOrDocument,
        },
        {
          text: 'Choose Image from Gallery',
          onPress: handlePickGalleryImage,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleUploadDocument = async () => {
    const finalTitle = docTitle.trim() || `${docCategory} Submission`;
    const finalFile =
      selectedAsset?.name ||
      (selectedFileName === 'No file chosen'
        ? `VTU_Proof_${Date.now()}.pdf`
        : selectedFileName);
    const cgpa =
      dossier.academics.qualifications[2]?.cgpaPercent || '9.12 CGPA';
    const summaryText = `${studentName} (${studentUsn}) • ${cgpa} • Project: ${dossier.projects.project.title}`;

    try {
      setIsSubmitting(true);
      const baseUrl =
        apiClient.defaults.baseURL || 'http://localhost:5000/api/v1';

      if (selectedAsset) {
        const uploadResult = await FileSystem.uploadAsync(
          `${baseUrl}/student/documents`,
          selectedAsset.uri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType: selectedAsset.mimeType,
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            parameters: {
              title: finalTitle,
              category: docCategory,
              studentId: studentUsn,
              studentName: studentName,
              fileName: selectedAsset.name,
              fileSize: formatFileSize(selectedAsset.sizeBytes),
              mimeType: selectedAsset.mimeType,
              notes: summaryText,
              dossierSummary: summaryText,
            },
          }
        );

        let uploadJson: any = {};
        try {
          uploadJson = JSON.parse(uploadResult.body || '{}');
        } catch {
          uploadJson = {};
        }

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error(
            uploadJson?.error ||
              uploadJson?.message ||
              `Cloud upload failed (HTTP ${uploadResult.status})`
          );
        }
      }

      try {
        await apiClient.post(`/student/dossier/${studentUsn}/upload`, {
          name: studentName,
          dossier,
          documentTitle: finalTitle,
          category: docCategory,
          fileName: finalFile,
          notes: summaryText,
          skipDocCreate: Boolean(selectedAsset),
        });
      } catch {
        // Non-blocking if dossier route is optional
      }

      setDocTitle('');
      setSelectedAsset(null);
      setSelectedFileName('No file chosen');
      setScreenMode('archive');
      await syncFromDatabase('student');

      Alert.alert(
        'Saved & Uploaded',
        selectedAsset
          ? `"${finalFile}" has been uploaded to ImageKit Cloud and saved with your 5-Tab VTU Mentorship Dossier.`
          : 'Your 5-Tab VTU Mentorship Dossier has been saved to the archive.'
      );
    } catch (error: any) {
      Alert.alert(
        'Upload Error',
        error.message || 'Could not save dossier and document.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (docId: string, title: string, isVerified?: boolean) => {
    if (isVerified) {
      Alert.alert(
        'Verified Record Notice',
        `"${title}" is verified by your Faculty Mentor. Clearing it here only hides it from your personal list — the official verified copy remains in the Mentor Archive.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear from My View',
            style: 'destructive',
            onPress: () => deleteDocument(docId),
          },
        ]
      );
      return;
    }
    Alert.alert('Delete Document', `Are you sure you want to remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteDocument(docId),
      },
    ]);
  };

  const addSemesterRow = (semKey: 'sem1' | 'sem2' | 'sem3' | 'sem4') => {
    setDossier((prev) => ({
      ...prev,
      academics: {
        ...prev.academics,
        semesters: {
          ...prev.academics.semesters,
          [semKey]: [
            ...prev.academics.semesters[semKey],
            { code: '', ia: '', final: '', total: '' },
          ],
        },
      },
    }));
  };

  const updateSemesterRow = (
    semKey: 'sem1' | 'sem2' | 'sem3' | 'sem4',
    index: number,
    field: 'code' | 'ia' | 'final' | 'total',
    value: string
  ) => {
    const rows = [...dossier.academics.semesters[semKey]];
    rows[index] = { ...rows[index], [field]: value };
    setDossier((prev) => ({
      ...prev,
      academics: {
        ...prev.academics,
        semesters: { ...prev.academics.semesters, [semKey]: rows },
      },
    }));
  };

  const removeSemesterRow = (
    semKey: 'sem1' | 'sem2' | 'sem3' | 'sem4',
    index: number
  ) => {
    const filtered = dossier.academics.semesters[semKey].filter(
      (_, i) => i !== index
    );
    setDossier((prev) => ({
      ...prev,
      academics: {
        ...prev.academics,
        semesters: {
          ...prev.academics.semesters,
          [semKey]: filtered.length
            ? filtered
            : [{ code: '', ia: '', final: '', total: '' }],
        },
      },
    }));
  };

  // ============================================================================
  // SCREEN 1: VERIFIED DOCUMENTS ARCHIVE VIEW (WITH VIEW FILE & PRINT PDF BUTTONS)
  // ============================================================================
  if (screenMode === 'archive') {
    return (
      <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#14294e" />
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.portalTag}>VTU PG CENTRE • ACADEMIC ARCHIVE</Text>
            <Text style={styles.portalTitle}>Verified Documents</Text>
            <Text style={styles.portalSub}>{documents.length} Records Uploaded</Text>
          </View>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => openUploadPage()}
            activeOpacity={0.85}
          >
            <Text style={styles.uploadBtnText}>+ Upload Dossier</Text>
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
          {documents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Documents Uploaded</Text>
              <Text style={styles.emptySub}>
                Tap "+ Upload Dossier" to fill out your 5-tab VTU Mentorship Dossier and
                submit marksheets or proofs for mentor verification.
              </Text>
            </View>
          ) : (
            documents.map((d: any) => {
              const docKey = d.id || d._id;
              const summary = d.dossierSummary || d.notes;
              return (
                <View key={docKey} style={styles.execDocCard}>
                  <View style={styles.docTop}>
                    <View style={styles.docIconBadge}>
                      <Text style={styles.docIconBadgeText}>DOC</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docTitle}>{d.title}</Text>
                      <Text style={styles.docMeta}>
                        {d.category} • Uploaded {d.date || '2026-11-17'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.verifyBadge,
                        d.verified
                          ? styles.verifyBadgeDone
                          : styles.verifyBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.verifyBadgeText,
                          d.verified
                            ? styles.verifyTextDone
                            : styles.verifyTextPending,
                        ]}
                      >
                        {d.verified ? 'Verified' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {!!summary && (
                    <View style={styles.dossierSummaryBanner}>
                      <Text style={styles.dossierSummaryText}>
                        <Text style={{ fontWeight: '800', color: '#14294e' }}>
                          Dossier Snapshot:{' '}
                        </Text>
                        {summary}
                      </Text>
                    </View>
                  )}

                  <View style={styles.docBottom}>
                    <TouchableOpacity
                      style={styles.filePill}
                      onPress={() => handleOpenCloudFile(d)}
                    >
                      <Text style={styles.filePillText} numberOfLines={1}>
                        {d.fileName || 'document.pdf'}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.docActionsRow}>
                      {Boolean(d.fileUri) && (
                        <TouchableOpacity
                          style={styles.viewCloudBtn}
                          onPress={() => handleOpenCloudFile(d)}
                        >
                          <Text style={styles.viewCloudBtnText}>View File</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.pdfBtn}
                        onPress={() =>
                          printOrExportDossierPdf(
                            d,
                            d.dossierSnapshot || dossier,
                            studentName,
                            studentUsn
                          )
                        }
                      >
                        <Text style={styles.pdfBtnText}>Print / PDF</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => openUploadPage(d.title, d.category)}
                      >
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleDelete(docKey, d.title, d.verified)}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  // ============================================================================
  // SCREEN 2: REFINED EXECUTIVE 5-TAB DOSSIER & PROOF UPLOAD PAGE
  // ============================================================================
  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />
      <View style={styles.topHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setScreenMode('archive')}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.portalTag}>VTU PG MENTORSHIP DOSSIER</Text>
            <Text style={styles.portalTitle}>Upload Proof & Credentials</Text>
          </View>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {studentName.slice(0, 2).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.tabsWrapper}>
        <View style={styles.tabsTrack}>
          {(
            [
              { key: 'personal', label: '1. Personal' },
              { key: 'academics', label: '2. Academics' },
              { key: 'projects', label: '3. Projects' },
              { key: 'swot', label: '4. SWOT' },
              { key: 'meetings', label: '5. Meetings' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[styles.tabPillText, active && styles.tabPillTextActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 104 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.execUploadCard}>
          <Text style={styles.proofHeader}>
            Digital Certificate & Verification Proof
          </Text>
          <Text style={styles.proofSub}>
            Select verification category and attach official scan (PDF or Image)
          </Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => {
              const active = docCategory === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => setDocCategory(c)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      active && styles.catChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>DOCUMENT RECORD TITLE *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#ffffff' }]}
            placeholder="e.g., Sem I Marks Card / BCA Degree Certificate"
            placeholderTextColor="#91a0b8"
            value={docTitle}
            onChangeText={setDocTitle}
          />

          <Text style={styles.fieldLabel}>CERTIFICATE SCAN / PROOF FILE</Text>
          <TouchableOpacity
            style={styles.dropzone}
            onPress={handleChooseFile}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.dropzoneTitle} numberOfLines={1}>
                {selectedFileName === 'No file chosen'
                  ? 'Tap to attach PDF or Image'
                  : selectedFileName}
              </Text>
              <Text style={styles.dropzoneSub}>
                {selectedAsset
                  ? `${selectedAsset.mimeType} • ${formatFileSize(selectedAsset.sizeBytes)}`
                  : 'Supports PDF, JPG, PNG up to 15 MB'}
              </Text>
            </View>
            <View style={styles.browseBadge}>
              <Text style={styles.browseBadgeText}>Browse</Text>
            </View>
          </TouchableOpacity>
        </View>

        {activeTab === 'personal' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Basic Scholar Information</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>USN</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: '#edf2fb', fontWeight: '700' }]}
                    value={studentUsn}
                    editable={false}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>BLOOD GROUP</Text>
                  <TextInput
                    style={styles.input}
                    value={dossier.personal.bloodGroup}
                    onChangeText={(v) =>
                      setDossier({
                        ...dossier,
                        personal: { ...dossier.personal, bloodGroup: v },
                      })
                    }
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={studentName}
                onChangeText={setStudentName}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
                  <TextInput
                    style={styles.input}
                    value={dossier.personal.dob}
                    onChangeText={(v) =>
                      setDossier({
                        ...dossier,
                        personal: { ...dossier.personal, dob: v },
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>CONTACT NUMBER</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    value={dossier.personal.contactNo}
                    onChangeText={(v) =>
                      setDossier({
                        ...dossier,
                        personal: { ...dossier.personal, contactNo: v },
                      })
                    }
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={dossier.personal.email}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    personal: { ...dossier.personal, email: v },
                  })
                }
              />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Permanent Address & Family</Text>
              <Text style={styles.fieldLabel}>PERMANENT ADDRESS</Text>
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
                multiline
                value={dossier.personal.permanentAddress}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    personal: { ...dossier.personal, permanentAddress: v },
                  })
                }
              />
              <Text style={styles.fieldLabel}>CITY & PINCODE</Text>
              <TextInput
                style={styles.input}
                value={dossier.personal.cityPincode}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    personal: { ...dossier.personal, cityPincode: v },
                  })
                }
              />
              <Text style={styles.fieldLabel}>FATHER'S NAME & OCCUPATION</Text>
              <TextInput
                style={styles.input}
                value={dossier.personal.fatherNameOccupation}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    personal: { ...dossier.personal, fatherNameOccupation: v },
                  })
                }
              />
              <Text style={styles.fieldLabel}>MOTHER'S NAME & OCCUPATION</Text>
              <TextInput
                style={styles.input}
                value={dossier.personal.motherNameOccupation}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    personal: { ...dossier.personal, motherNameOccupation: v },
                  })
                }
              />
            </View>
          </View>
        )}

        {activeTab === 'academics' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Educational Qualification</Text>
              {dossier.academics.qualifications.map((q, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <TextInput
                    style={[styles.cellInput, { flex: 0.9 }]}
                    placeholder="Deg"
                    value={q.degree}
                    onChangeText={(v) => {
                      const updated = [...dossier.academics.qualifications];
                      updated[idx].degree = v;
                      setDossier({
                        ...dossier,
                        academics: { ...dossier.academics, qualifications: updated },
                      });
                    }}
                  />
                  <TextInput
                    style={[styles.cellInput, { flex: 0.8 }]}
                    placeholder="Spec"
                    value={q.spec}
                    onChangeText={(v) => {
                      const updated = [...dossier.academics.qualifications];
                      updated[idx].spec = v;
                      setDossier({
                        ...dossier,
                        academics: { ...dossier.academics, qualifications: updated },
                      });
                    }}
                  />
                  <TextInput
                    style={[styles.cellInput, { flex: 1.3 }]}
                    placeholder="Board/Univ"
                    value={q.boardUniv}
                    onChangeText={(v) => {
                      const updated = [...dossier.academics.qualifications];
                      updated[idx].boardUniv = v;
                      setDossier({
                        ...dossier,
                        academics: { ...dossier.academics, qualifications: updated },
                      });
                    }}
                  />
                  <TextInput
                    style={[styles.cellInput, { flex: 0.75 }]}
                    placeholder="Year"
                    value={q.year}
                    onChangeText={(v) => {
                      const updated = [...dossier.academics.qualifications];
                      updated[idx].year = v;
                      setDossier({
                        ...dossier,
                        academics: { ...dossier.academics, qualifications: updated },
                      });
                    }}
                  />
                  <TextInput
                    style={[styles.cellInput, { flex: 1 }]}
                    placeholder="CGPA/%"
                    value={q.cgpaPercent}
                    onChangeText={(v) => {
                      const updated = [...dossier.academics.qualifications];
                      updated[idx].cgpaPercent = v;
                      setDossier({
                        ...dossier,
                        academics: { ...dossier.academics, qualifications: updated },
                      });
                    }}
                  />
                </View>
              ))}
              <Text style={styles.fieldLabel}>PGCET / MAT / CAT ENTRANCE RANKING</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Rank (e.g. PGCET Rank 412)"
                placeholderTextColor="#91a0b8"
                value={dossier.academics.pgcetRank}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    academics: { ...dossier.academics, pgcetRank: v },
                  })
                }
              />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Semester I – IV Subject Marks</Text>
              {(['sem1', 'sem2', 'sem3', 'sem4'] as const).map((semKey, sIdx) => (
                <View key={semKey} style={styles.semBlock}>
                  <View style={styles.semPill}>
                    <Text style={styles.semPillText}>
                      {['I', 'II', 'III', 'IV'][sIdx]} Semester
                    </Text>
                  </View>
                  {dossier.academics.semesters[semKey].map((row, rIdx) => (
                    <View key={rIdx} style={styles.tableRow}>
                      <TextInput
                        style={[styles.cellInput, { flex: 1.5 }]}
                        placeholder="Code"
                        placeholderTextColor="#91a0b8"
                        value={row.code}
                        onChangeText={(v) =>
                          updateSemesterRow(semKey, rIdx, 'code', v)
                        }
                      />
                      <TextInput
                        style={[styles.cellInput, { flex: 1 }]}
                        placeholder="IA"
                        placeholderTextColor="#91a0b8"
                        value={row.ia}
                        onChangeText={(v) =>
                          updateSemesterRow(semKey, rIdx, 'ia', v)
                        }
                      />
                      <TextInput
                        style={[styles.cellInput, { flex: 1 }]}
                        placeholder="Final"
                        placeholderTextColor="#91a0b8"
                        value={row.final}
                        onChangeText={(v) =>
                          updateSemesterRow(semKey, rIdx, 'final', v)
                        }
                      />
                      <TextInput
                        style={[styles.cellInput, { flex: 1 }]}
                        placeholder="Total"
                        placeholderTextColor="#91a0b8"
                        value={row.total}
                        onChangeText={(v) =>
                          updateSemesterRow(semKey, rIdx, 'total', v)
                        }
                      />
                      <TouchableOpacity
                        style={styles.removeInlineBtn}
                        onPress={() => removeSemesterRow(semKey, rIdx)}
                      >
                        <Text style={styles.removeInlineBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.dashedBtn}
                    onPress={() => addSemesterRow(semKey)}
                  >
                    <Text style={styles.dashedBtnText}>
                      + Add {['I', 'II', 'III', 'IV'][sIdx]} Sem Subject
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'projects' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Internship Details</Text>
              <Text style={styles.fieldLabel}>COMPANY ADDRESS WITH CONTACT NO.</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter organization details"
                placeholderTextColor="#91a0b8"
                value={dossier.projects.internship.addressContact}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    projects: {
                      ...dossier.projects,
                      internship: {
                        ...dossier.projects.internship,
                        addressContact: v,
                      },
                    },
                  })
                }
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>FROM DATE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2026-01-10"
                    placeholderTextColor="#91a0b8"
                    value={dossier.projects.internship.fromDate}
                    onChangeText={(v) =>
                      setDossier({
                        ...dossier,
                        projects: {
                          ...dossier.projects,
                          internship: { ...dossier.projects.internship, fromDate: v },
                        },
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>TO DATE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2026-04-10"
                    placeholderTextColor="#91a0b8"
                    value={dossier.projects.internship.toDate}
                    onChangeText={(v) =>
                      setDossier({
                        ...dossier,
                        projects: {
                          ...dossier.projects,
                          internship: { ...dossier.projects.internship, toDate: v },
                        },
                      })
                    }
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>INTERNSHIP GUIDE NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Guide Name"
                placeholderTextColor="#91a0b8"
                value={dossier.projects.internship.guideName}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    projects: {
                      ...dossier.projects,
                      internship: { ...dossier.projects.internship, guideName: v },
                    },
                  })
                }
              />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Academic Project Details</Text>
              <Text style={styles.fieldLabel}>PROJECT TITLE</Text>
              <TextInput
                style={styles.input}
                value={dossier.projects.project.title}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    projects: {
                      ...dossier.projects,
                      project: { ...dossier.projects.project, title: v },
                    },
                  })
                }
              />
              <Text style={styles.fieldLabel}>PROJECT GUIDE</Text>
              <TextInput
                style={styles.input}
                value={dossier.projects.project.guide}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    projects: {
                      ...dossier.projects,
                      project: { ...dossier.projects.project, guide: v },
                    },
                  })
                }
              />
              <Text style={styles.fieldLabel}>PROJECT CARRIED OUT AT (ADDRESS)</Text>
              <TextInput
                style={styles.input}
                value={dossier.projects.project.address}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    projects: {
                      ...dossier.projects,
                      project: { ...dossier.projects.project, address: v },
                    },
                  })
                }
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>DURATION</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 6 Months"
                    placeholderTextColor="#91a0b8"
                    value={dossier.projects.project.duration}
                    onChangeText={(v) =>
                      setDossier({
                        ...dossier,
                        projects: {
                          ...dossier.projects,
                          project: { ...dossier.projects.project, duration: v },
                        },
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>ELECTIVE CHOSEN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Elective"
                    placeholderTextColor="#91a0b8"
                    value={dossier.projects.project.elective}
                    onChangeText={(v) =>
                      setDossier({
                        ...dossier,
                        projects: {
                          ...dossier.projects,
                          project: { ...dossier.projects.project, elective: v },
                        },
                      })
                    }
                  />
                </View>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Achievements & Awards</Text>
              {dossier.projects.achievements.map((ach, idx) => (
                <View key={idx} style={styles.subItemBox}>
                  <Text style={styles.fieldLabel}>AWARD TITLE</Text>
                  <TextInput
                    style={styles.input}
                    value={ach.title}
                    onChangeText={(v) => {
                      const updated = [...dossier.projects.achievements];
                      updated[idx].title = v;
                      setDossier({
                        ...dossier,
                        projects: { ...dossier.projects, achievements: updated },
                      });
                    }}
                  />
                  <Text style={styles.fieldLabel}>ACTIVITY / DESCRIPTION</Text>
                  <TextInput
                    style={styles.input}
                    value={ach.description}
                    onChangeText={(v) => {
                      const updated = [...dossier.projects.achievements];
                      updated[idx].description = v;
                      setDossier({
                        ...dossier,
                        projects: { ...dossier.projects, achievements: updated },
                      });
                    }}
                  />
                </View>
              ))}
              <TouchableOpacity
                style={styles.dashedBtn}
                onPress={() =>
                  setDossier({
                    ...dossier,
                    projects: {
                      ...dossier.projects,
                      achievements: [
                        ...dossier.projects.achievements,
                        { title: '', description: '' },
                      ],
                    },
                  })
                }
              >
                <Text style={styles.dashedBtnText}>+ Add Another Award</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'swot' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>SWOT Self-Assessment</Text>
              <Text style={styles.fieldLabel}>STRENGTHS</Text>
              <TextInput
                style={styles.input}
                value={dossier.swot.strengths}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    swot: { ...dossier.swot, strengths: v },
                  })
                }
              />
              <Text style={styles.fieldLabel}>WEAKNESSES</Text>
              <TextInput
                style={styles.input}
                value={dossier.swot.weaknesses}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    swot: { ...dossier.swot, weaknesses: v },
                  })
                }
              />
              <Text style={styles.fieldLabel}>OPPORTUNITIES</Text>
              <TextInput
                style={styles.input}
                value={dossier.swot.opportunities}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    swot: { ...dossier.swot, opportunities: v },
                  })
                }
              />
              <Text style={styles.fieldLabel}>THREATS</Text>
              <TextInput
                style={styles.input}
                value={dossier.swot.threats}
                onChangeText={(v) =>
                  setDossier({ ...dossier, swot: { ...dossier.swot, threats: v } })
                }
              />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Career Plans & Co-Curriculars</Text>
              <Text style={styles.fieldLabel}>CAREER PLANS</Text>
              <TextInput
                style={styles.input}
                value={dossier.swot.careerPlans}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    swot: { ...dossier.swot, careerPlans: v },
                  })
                }
              />
              <Text style={styles.fieldLabel}>AREA OF INTEREST</Text>
              <TextInput
                style={styles.input}
                value={dossier.swot.areaOfInterest}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    swot: { ...dossier.swot, areaOfInterest: v },
                  })
                }
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>EXTRA-CURRICULAR</Text>
                  <TextInput
                    style={styles.input}
                    value={dossier.swot.extraCurricular}
                    onChangeText={(v) =>
                      setDossier({
                        ...dossier,
                        swot: { ...dossier.swot, extraCurricular: v },
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>CO-CURRICULAR</Text>
                  <TextInput
                    style={styles.input}
                    value={dossier.swot.coCurricular}
                    onChangeText={(v) =>
                      setDossier({
                        ...dossier,
                        swot: { ...dossier.swot, coCurricular: v },
                      })
                    }
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>TRAINING UNDERGONE</Text>
              <TextInput
                style={styles.input}
                value={dossier.swot.trainingUndergone}
                onChangeText={(v) =>
                  setDossier({
                    ...dossier,
                    swot: { ...dossier.swot, trainingUndergone: v },
                  })
                }
              />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardSectionTitle}>Mentee Digital Signature</Text>
              <TouchableOpacity
                style={[
                  styles.sigBox,
                  dossier.swot.isSigned && styles.sigBoxSigned,
                ]}
                onPress={() =>
                  setDossier({
                    ...dossier,
                    swot: {
                      ...dossier.swot,
                      isSigned: !dossier.swot.isSigned,
                      digitalSignature: studentName,
                    },
                  })
                }
              >
                <Text
                  style={[
                    styles.sigText,
                    dossier.swot.isSigned && styles.sigTextSigned,
                  ]}
                >
                  {dossier.swot.isSigned
                    ? studentName
                    : 'Tap to Sign Digitally'}
                </Text>
                {dossier.swot.isSigned && (
                  <Text style={styles.sigSubCaption}>
                    Digitally Signed by Candidate (Tap to Toggle)
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'meetings' && (
          <View style={styles.formCard}>
            <Text style={styles.cardSectionTitle}>Mentor-Mentee Counseling Log</Text>
            {dossier.meetings.map((m, idx) => (
              <View key={idx} style={styles.subItemBox}>
                <View style={styles.meetingHeader}>
                  <View style={styles.dateChip}>
                    <Text style={styles.dateChipText}>Date: {m.date}</Text>
                  </View>
                  <View style={styles.dateChip}>
                    <Text style={styles.dateChipText}>Time: {m.time}</Text>
                  </View>
                </View>
                <Text style={styles.fieldLabel}>TOPICS DISCUSSED</Text>
                <TextInput
                  style={styles.input}
                  value={m.topics}
                  onChangeText={(v) => {
                    const updated = [...dossier.meetings];
                    updated[idx].topics = v;
                    setDossier({ ...dossier, meetings: updated });
                  }}
                />
                <Text style={styles.fieldLabel}>OBSERVATION</Text>
                <TextInput
                  style={styles.input}
                  value={m.observation}
                  onChangeText={(v) => {
                    const updated = [...dossier.meetings];
                    updated[idx].observation = v;
                    setDossier({ ...dossier, meetings: updated });
                  }}
                />
                <Text style={styles.fieldLabel}>RECOMMENDATION</Text>
                <TextInput
                  style={styles.input}
                  value={m.recommendation}
                  onChangeText={(v) => {
                    const updated = [...dossier.meetings];
                    updated[idx].recommendation = v;
                    setDossier({ ...dossier, meetings: updated });
                  }}
                />
              </View>
            ))}
            <TouchableOpacity
              style={styles.dashedBtn}
              onPress={() =>
                setDossier({
                  ...dossier,
                  meetings: [
                    ...dossier.meetings,
                    {
                      date: new Date().toISOString().split('T')[0],
                      time: '3:00-4:00',
                      topics: '',
                      observation: '',
                      recommendation: '',
                    },
                  ],
                })
              }
            >
              <Text style={styles.dashedBtnText}>+ Log New Monthly Meeting</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setScreenMode('archive')}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitModalBtn}
          disabled={isSubmitting}
          onPress={handleUploadDocument}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitModalBtnText}>
              Save & Upload to Archive
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const StudentDocsScreen = DocumentUploadScreen;
export default DocumentUploadScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#14294e' },
  topHeader: {
    backgroundColor: '#14294e',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portalTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#a5c4ff',
    letterSpacing: 0.9,
  },
  portalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  portalSub: { fontSize: 11, color: '#cbd5e1', marginTop: 2 },
  uploadBtn: {
    backgroundColor: '#315fc4',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
  },
  uploadBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#315fc4',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  tabsWrapper: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#dce5f3',
  },
  tabsTrack: {
    flexDirection: 'row',
    backgroundColor: '#edf2fb',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce5f3',
    gap: 3,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  tabPillText: { fontSize: 10, fontWeight: '700', color: '#5e6f8c' },
  tabPillTextActive: { color: '#315fc4', fontWeight: '800' },
  container: { flex: 1, backgroundColor: '#f3f6fc' },
  scrollContent: { padding: 14 },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#172b4d' },
  emptySub: {
    fontSize: 11.5,
    color: '#5e6f8c',
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 17,
  },
  execDocCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 1,
  },
  docTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  docIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e8efff',
    borderWidth: 1,
    borderColor: '#d7e3fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconBadgeText: { fontSize: 10, fontWeight: '800', color: '#315fc4' },
  docTitle: { fontSize: 14, fontWeight: '800', color: '#172b4d' },
  docMeta: { fontSize: 11, color: '#5e6f8c', marginTop: 2 },
  verifyBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  verifyBadgeDone: { backgroundColor: '#ecfdf5' },
  verifyBadgePending: { backgroundColor: '#fffbeb' },
  verifyBadgeText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  verifyTextDone: { color: '#047857' },
  verifyTextPending: { color: '#b45309' },
  dossierSummaryBanner: {
    backgroundColor: '#f6f9ff',
    borderWidth: 1,
    borderColor: '#e1ebfa',
    borderLeftWidth: 3,
    borderLeftColor: '#315fc4',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  dossierSummaryText: { fontSize: 11, color: '#172b4d', lineHeight: 16 },
  docBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#edf2fb',
    flexWrap: 'wrap',
    gap: 8,
  },
  filePill: {
    backgroundColor: '#e8efff',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    maxWidth: '40%',
  },
  filePillText: { fontSize: 10.5, fontWeight: '700', color: '#315fc4' },
  docActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  viewCloudBtn: {
    backgroundColor: '#315fc4',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewCloudBtnText: { fontSize: 10.5, fontWeight: '800', color: '#ffffff' },
  pdfBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pdfBtnText: { fontSize: 10.5, fontWeight: '800', color: '#1d4ed8' },
  editBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 10.5, fontWeight: '700', color: '#172b4d' },
  removeBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeBtnText: { fontSize: 10.5, fontWeight: '700', color: '#be123c' },
  execUploadCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c9daf8',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
  },
  proofHeader: { fontSize: 14, fontWeight: '800', color: '#14294e' },
  proofSub: { fontSize: 11, color: '#5e6f8c', marginTop: 2, marginBottom: 10 },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  catChip: {
    width: '48.4%',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  catChipActive: { backgroundColor: '#315fc4', borderColor: '#315fc4' },
  catChipText: { fontSize: 11, fontWeight: '700', color: '#5e6f8c' },
  catChipTextActive: { color: '#ffffff', fontWeight: '800' },
  dropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f4f8ff',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9ab5ec',
    borderRadius: 12,
    padding: 12,
  },
  dropzoneTitle: { fontSize: 12, fontWeight: '700', color: '#172b4d' },
  dropzoneSub: { fontSize: 10, color: '#5e6f8c', marginTop: 2 },
  browseBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  browseBadgeText: { fontSize: 11, fontWeight: '800', color: '#315fc4' },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#172b4d',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fb',
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5e6f8c',
    marginBottom: 5,
    marginTop: 8,
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
    backgroundColor: '#fbfdff',
    color: '#172b4d',
  },
  tableRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 6,
    alignItems: 'center',
  },
  cellInput: {
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#f9fbff',
    color: '#172b4d',
  },
  semBlock: {
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e4ecf9',
    borderRadius: 13,
    padding: 11,
    marginBottom: 12,
  },
  semPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8efff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    marginBottom: 8,
  },
  semPillText: { fontSize: 11, fontWeight: '800', color: '#315fc4' },
  removeInlineBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeInlineBtnText: { fontSize: 11, fontWeight: '800', color: '#be123c' },
  dashedBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#a7c0f2',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 6,
  },
  dashedBtnText: { color: '#315fc4', fontSize: 11.5, fontWeight: '800' },
  subItemBox: {
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e1eaf8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  dateChipText: { fontSize: 10.5, fontWeight: '800', color: '#315fc4' },
  sigBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#b8c9e8',
    borderRadius: 14,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fbff',
  },
  sigBoxSigned: {
    borderStyle: 'solid',
    borderColor: '#6ee7b7',
    backgroundColor: '#ecfdf5',
  },
  sigText: { fontSize: 12, fontWeight: '700', color: '#5e6f8c' },
  sigTextSigned: {
    fontSize: 19,
    fontWeight: '800',
    color: '#047857',
    fontStyle: 'italic',
  },
  sigSubCaption: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#047857',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dce5f3',
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#dce5f3',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 12.5, fontWeight: '700', color: '#5e6f8c' },
  submitModalBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 11,
    backgroundColor: '#315fc4',
    alignItems: 'center',
  },
  submitModalBtnText: { fontSize: 12.5, fontWeight: '800', color: '#ffffff' },
});