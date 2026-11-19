import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';
import apiClient from '../../api/client';
import { printOrExportDossierPdf } from '../../utils/dossierPdfPrint';

const createFallbackDossier = (studentId: string, studentName: string) => ({
  personal: {
    dob: '2005-01-15',
    contactNo: '9632039934',
    email: `${String(studentId).toLowerCase()}@vtu.ac.in`,
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
      sem2: [],
      sem3: [],
      sem4: [],
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
      { title: 'ICSEM 2026 Paper Presentation', description: 'Accepted for Full Paper' },
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
    digitalSignature: studentName || 'Candidate Signed',
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

const isImageAttachment = (doc: any) => {
  const mime = String(doc?.mimeType || '').toLowerCase();
  const uri = String(doc?.fileUri || doc?.fileName || '').toLowerCase();
  return (
    mime.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(uri)
  );
};

export const MenteeDocsScreen = () => {
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const { students, documents, toggleDocVerify, syncFromDatabase } = useDataContext();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Verified'>('ALL');
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<any | null>(null);
  const [candidateDossier, setCandidateDossier] = useState<any | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'personal' | 'academics' | 'projects' | 'swot' | 'meetings'
  >('personal');

  useEffect(() => {
    syncFromDatabase('mentor');
  }, [syncFromDatabase]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromDatabase('mentor');
    setRefreshing(false);
  };

  const studentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(String(s.id).toUpperCase(), s.name));
    return map;
  }, [students]);

  const handleOpenCloudFile = (doc: any) => {
    const url = doc?.fileUri;
    if (!url) {
      Alert.alert(
        'No Cloud File URL',
        'This record does not have an ImageKit cloud file URL attached.'
      );
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Cannot Open File', 'Unable to open the uploaded file URL on this device.')
    );
  };

  const handlePermanentDelete = (doc: any) => {
    const docId = doc.id || doc._id;
    Alert.alert(
      'Permanently Delete Record',
      `Are you sure you want to permanently delete "${doc.title}" (USN: ${doc.studentId}) from the institutional database? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              setLocallyDeletedIds((prev) => [...prev, String(docId)]);
              if (selectedDoc && (selectedDoc.id || selectedDoc._id) === docId) {
                setSelectedDoc(null);
              }
              await apiClient.delete(`/mentor/documents/${docId}`);
              await syncFromDatabase('mentor');
            } catch (error: any) {
              Alert.alert(
                'Delete Error',
                error.response?.data?.error ||
                  error.message ||
                  'Could not delete document from server.'
              );
            }
          },
        },
      ]
    );
  };

  const handleInspectCandidate = async (doc: any) => {
    setSelectedDoc(doc);
    setActiveTab('personal');
    setLoadingDossier(true);
    const studentId = doc.studentId || '4VZ25MC055';
    const fallbackName =
      studentNameMap.get(String(studentId).toUpperCase()) ||
      doc.studentName ||
      'Scholar';

    try {
      const res = await apiClient.get(`/student/dossier/${studentId}`);
      const fetchedStudent = res.data?.student || null;
      const fetchedDossier =
        res.data?.dossier ||
        fetchedStudent?.dossier ||
        doc.dossierSnapshot ||
        createFallbackDossier(studentId, fetchedStudent?.name || fallbackName);
      setCandidateProfile(fetchedStudent);
      setCandidateDossier(fetchedDossier);
    } catch {
      setCandidateProfile({
        usn: studentId,
        name: fallbackName,
      });
      setCandidateDossier(
        doc.dossierSnapshot || createFallbackDossier(studentId, fallbackName)
      );
    } finally {
      setLoadingDossier(false);
    }
  };

  const handlePrintFromCard = async (doc: any) => {
    const studentId = doc.studentId || '4VZ25MC055';
    const studentName =
      studentNameMap.get(String(studentId).toUpperCase()) ||
      doc.studentName ||
      'Scholar';
    let targetDossier = doc.dossierSnapshot;
    if (!targetDossier) {
      try {
        const res = await apiClient.get(`/student/dossier/${studentId}`);
        targetDossier = res.data?.dossier || res.data?.student?.dossier;
      } catch {
        targetDossier = null;
      }
    }
    await printOrExportDossierPdf(
      doc,
      targetDossier || createFallbackDossier(studentId, studentName),
      studentName,
      studentId
    );
  };

  const visibleDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((doc: any) => {
      if (locallyDeletedIds.includes(String(doc.id || doc._id))) return false;
      if (statusFilter === 'Verified' && !doc.verified) return false;
      if (statusFilter === 'Pending' && doc.verified) return false;

      if (!q) return true;
      const resolvedName = (
        studentNameMap.get(String(doc.studentId || '').toUpperCase()) ||
        doc.studentName ||
        ''
      ).toLowerCase();

      return (
        resolvedName.includes(q) ||
        String(doc.studentId || '').toLowerCase().includes(q) ||
        String(doc.title || '').toLowerCase().includes(q) ||
        String(doc.category || '').toLowerCase().includes(q)
      );
    });
  }, [documents, locallyDeletedIds, statusFilter, searchQuery, studentNameMap]);

  // ============================================================================
  // VIEW 2: FULL-SCREEN CANDIDATE 5-TAB DOSSIER INSPECTOR (MENTOR VIEW + PDF PRINT)
  // ============================================================================
  if (selectedDoc) {
    const d =
      candidateDossier ||
      createFallbackDossier(
        selectedDoc.studentId || '4VZ25MC055',
        selectedDoc.studentName || 'Scholar'
      );
    const candidateName =
      candidateProfile?.name ||
      studentNameMap.get(String(selectedDoc.studentId || '').toUpperCase()) ||
      selectedDoc.studentName ||
      d?.swot?.digitalSignature ||
      `Scholar (${selectedDoc.studentId})`;
    const candidateUsn =
      candidateProfile?.usn || selectedDoc.studentId || 'N/A';

    return (
      <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />
        <View style={styles.topHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setSelectedDoc(null)}
            >
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerPortalTag}>
                CANDIDATE VTU MENTORSHIP DOSSIER
              </Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {candidateName} ({candidateUsn})
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                Proof: {selectedDoc.title} ({selectedDoc.category})
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerPrintBtn}
            onPress={() =>
              printOrExportDossierPdf(selectedDoc, d, candidateName, candidateUsn)
            }
          >
            <Text style={styles.headerPrintBtnText}>Print / PDF</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsBar}>
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
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[styles.tabBtnText, active && styles.tabBtnTextActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 104 },
          ]}
        >
          {loadingDossier && (
            <ActivityIndicator
              size="small"
              color="#4f46e5"
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Submitted Proof Document Card with Inline ImageKit Image & Direct Open Button */}
          <View style={styles.attachmentHighlightCard}>
            <Text style={styles.attachmentHighlightTitle}>
              Submitted Proof Document
            </Text>
            <Text style={styles.attachmentHighlightMeta}>
              Title: {selectedDoc.title} • Category: {selectedDoc.category}
            </Text>
            <Text style={styles.attachmentHighlightFile}>
              File: {selectedDoc.fileName || 'document.pdf'} ({selectedDoc.fileSize || '1.2 MB'}) • Uploaded: {selectedDoc.date || '2026-11-17'}
            </Text>

            {Boolean(selectedDoc.fileUri) && isImageAttachment(selectedDoc) && (
              <Image
                source={{ uri: selectedDoc.fileUri }}
                style={styles.cloudImagePreview}
                resizeMode="contain"
              />
            )}

            {Boolean(selectedDoc.fileUri) ? (
              <TouchableOpacity
                style={styles.openCloudFileBtn}
                onPress={() => handleOpenCloudFile(selectedDoc)}
                activeOpacity={0.85}
              >
                <Text style={styles.openCloudFileBtnText}>
                  ↗ View Uploaded File ({selectedDoc.fileName || 'Open'})
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noCloudUrlWarning}>
                No cloud attachment URL found for this record.
              </Text>
            )}
          </View>

          {activeTab === 'personal' && (
            <View>
              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>
                  Candidate Basic Information
                </Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>USN / ID</Text>
                  <Text style={styles.infoValue}>{candidateUsn}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{candidateName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>
                    {d.personal?.dob || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Contact Number</Text>
                  <Text style={styles.infoValue}>
                    {d.personal?.contactNo || candidateProfile?.phone || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email ID</Text>
                  <Text style={styles.infoValue}>
                    {d.personal?.email || candidateProfile?.email || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Blood Group</Text>
                  <Text style={styles.infoValue}>
                    {d.personal?.bloodGroup || 'Not Provided'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>
                  Permanent Address & Parents Details
                </Text>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Permanent Address</Text>
                  <Text style={styles.infoBlockValue}>
                    {d.personal?.permanentAddress || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>City & Pincode</Text>
                  <Text style={styles.infoValue}>
                    {d.personal?.cityPincode || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Father's Name & Occupation</Text>
                  <Text style={styles.infoValue}>
                    {d.personal?.fatherNameOccupation || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mother's Name & Occupation</Text>
                  <Text style={styles.infoValue}>
                    {d.personal?.motherNameOccupation || 'Not Provided'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'academics' && (
            <View>
              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>
                  Prior Educational Qualifications (SSLC, PUC, Degree)
                </Text>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Degree</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.9 }]}>Spec.</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>Board/Univ</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Year</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>CGPA/%</Text>
                </View>
                {(d.academics?.qualifications || []).map((q: any, idx: number) => (
                  <View key={idx} style={styles.tableDataRow}>
                    <Text style={[styles.tableDataCell, { flex: 1, fontWeight: '700' }]}>
                      {q.degree || '-'}
                    </Text>
                    <Text style={[styles.tableDataCell, { flex: 0.9 }]}>
                      {q.spec || '-'}
                    </Text>
                    <Text style={[styles.tableDataCell, { flex: 1.4 }]}>
                      {q.boardUniv || '-'}
                    </Text>
                    <Text style={[styles.tableDataCell, { flex: 0.8 }]}>
                      {q.year || '-'}
                    </Text>
                    <Text style={[styles.tableDataCell, { flex: 1, color: '#4f46e5', fontWeight: '800' }]}>
                      {q.cgpaPercent || '-'}
                    </Text>
                  </View>
                ))}
                <View style={[styles.infoRow, { marginTop: 10 }]}>
                  <Text style={styles.infoLabel}>PGCET / MAT / CAT Rank</Text>
                  <Text style={styles.infoValue}>
                    {d.academics?.pgcetRank || 'Not Entered'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>
                  MCA Semester I – IV IA & Final Exam Marks
                </Text>
                {(['sem1', 'sem2', 'sem3', 'sem4'] as const).map((semKey, sIdx) => {
                  const rows = (d.academics?.semesters?.[semKey] || []).filter(
                    (r: any) => r.code || r.ia || r.final || r.total
                  );
                  return (
                    <View key={semKey} style={{ marginBottom: 14 }}>
                      <Text style={styles.semSubTitle}>
                        {['I', 'II', 'III', 'IV'][sIdx]} Semester Marks
                      </Text>
                      {rows.length === 0 ? (
                        <Text style={styles.emptySmallText}>
                          No subject marks recorded for this semester yet.
                        </Text>
                      ) : (
                        <View>
                          <View style={styles.tableHeaderRow}>
                            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                              Subject Code
                            </Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                              IA Marks
                            </Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                              Final Exam
                            </Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                              Total
                            </Text>
                          </View>
                          {rows.map((r: any, rIdx: number) => (
                            <View key={rIdx} style={styles.tableDataRow}>
                              <Text style={[styles.tableDataCell, { flex: 1.5, fontWeight: '700' }]}>
                                {r.code || '-'}
                              </Text>
                              <Text style={[styles.tableDataCell, { flex: 1 }]}>
                                {r.ia || '-'}
                              </Text>
                              <Text style={[styles.tableDataCell, { flex: 1 }]}>
                                {r.final || '-'}
                              </Text>
                              <Text style={[styles.tableDataCell, { flex: 1, fontWeight: '800', color: '#4f46e5' }]}>
                                {r.total || '-'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {activeTab === 'projects' && (
            <View>
              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>Internship Details</Text>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Organization Address & Contact</Text>
                  <Text style={styles.infoBlockValue}>
                    {d.projects?.internship?.addressContact || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Internship Guide</Text>
                  <Text style={styles.infoValue}>
                    {d.projects?.internship?.guideName || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Duration (From – To)</Text>
                  <Text style={styles.infoValue}>
                    {d.projects?.internship?.fromDate || '-'} to{' '}
                    {d.projects?.internship?.toDate || '-'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>Academic Project Details</Text>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Project Title</Text>
                  <Text style={styles.infoBlockValue}>
                    {d.projects?.project?.title || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Project Guide</Text>
                  <Text style={styles.infoValue}>
                    {d.projects?.project?.guide || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Carried Out At</Text>
                  <Text style={styles.infoValue}>
                    {d.projects?.project?.address || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Duration & Elective</Text>
                  <Text style={styles.infoValue}>
                    {d.projects?.project?.duration || '6 Months'}{' '}
                    {d.projects?.project?.elective
                      ? `• ${d.projects.project.elective}`
                      : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>
                  Achievements & Awards Received
                </Text>
                {(d.projects?.achievements || []).length === 0 ? (
                  <Text style={styles.emptySmallText}>
                    No achievements listed.
                  </Text>
                ) : (
                  (d.projects?.achievements || []).map((ach: any, idx: number) => (
                    <View key={idx} style={styles.subItemCard}>
                      <Text style={styles.subItemTitle}>
                        {idx + 1}. {ach.title || 'Achievement'}
                      </Text>
                      <Text style={styles.subItemDesc}>
                        {ach.description || 'Verified Activity'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {activeTab === 'swot' && (
            <View>
              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>Candidate SWOT Analysis</Text>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Strengths</Text>
                  <Text style={styles.infoBlockValue}>
                    {d.swot?.strengths || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Weaknesses</Text>
                  <Text style={styles.infoBlockValue}>
                    {d.swot?.weaknesses || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Opportunities</Text>
                  <Text style={styles.infoBlockValue}>
                    {d.swot?.opportunities || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Threats</Text>
                  <Text style={styles.infoBlockValue}>
                    {d.swot?.threats || 'Not Provided'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>
                  Career Plans, Interests & Trainings
                </Text>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Career Plans</Text>
                  <Text style={styles.infoBlockValue}>
                    {d.swot?.careerPlans || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Area of Interest</Text>
                  <Text style={styles.infoBlockValue}>
                    {d.swot?.areaOfInterest || 'Not Provided'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Extra-Curricular Activities</Text>
                  <Text style={styles.infoValue}>
                    {d.swot?.extraCurricular || '-'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Co-Curricular Activities</Text>
                  <Text style={styles.infoValue}>
                    {d.swot?.coCurricular || '-'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Training Undergone</Text>
                  <Text style={styles.infoValue}>
                    {d.swot?.trainingUndergone || '-'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.cardSectionTitle}>Mentee Digital Signature</Text>
                <View style={styles.signatureDisplayBox}>
                  <Text style={styles.signatureDisplayText}>
                    {d.swot?.digitalSignature || candidateName}
                  </Text>
                  <Text style={styles.signatureVerifiedSub}>
                    Digitally Signed by Candidate
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'meetings' && (
            <View style={styles.detailCard}>
              <Text style={styles.cardSectionTitle}>
                Monthly Mentor-Mentee Counseling Logs
              </Text>
              {(d.meetings || []).length === 0 ? (
                <Text style={styles.emptySmallText}>
                  No monthly meetings logged yet.
                </Text>
              ) : (
                (d.meetings || []).map((m: any, idx: number) => (
                  <View key={idx} style={styles.subItemCard}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <Text style={styles.subItemTitle}>Date: {m.date}</Text>
                      <Text style={styles.subItemTitle}>Time: {m.time}</Text>
                    </View>
                    <Text style={styles.infoLabel}>TOPICS DISCUSSED</Text>
                    <Text style={styles.infoBlockValue}>{m.topics || '-'}</Text>
                    <Text style={[styles.infoLabel, { marginTop: 6 }]}>
                      SPECIFIC OBSERVATION
                    </Text>
                    <Text style={styles.infoBlockValue}>
                      {m.observation || '-'}
                    </Text>
                    <Text style={[styles.infoLabel, { marginTop: 6 }]}>
                      MENTOR RECOMMENDATION
                    </Text>
                    <Text style={styles.infoBlockValue}>
                      {m.recommendation || '-'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.inspectorFooter,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TouchableOpacity
            style={styles.footerPrintBtn}
            onPress={() =>
              printOrExportDossierPdf(selectedDoc, d, candidateName, candidateUsn)
            }
          >
            <Text style={styles.footerPrintBtnText}>Print / PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerDeleteBtn}
            onPress={() => handlePermanentDelete(selectedDoc)}
          >
            <Text style={styles.footerDeleteBtnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.footerVerifyBtn,
              selectedDoc.verified && styles.footerRevokeBtn,
            ]}
            onPress={() => {
              const docKey = selectedDoc.id || selectedDoc._id;
              toggleDocVerify(docKey);
              setSelectedDoc({
                ...selectedDoc,
                verified: !selectedDoc.verified,
              });
            }}
          >
            <Text
              style={[
                styles.footerVerifyBtnText,
                selectedDoc.verified && styles.footerRevokeBtnText,
              ]}
            >
              {selectedDoc.verified ? 'Revoke' : 'Verify & Approve'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================================================
  // VIEW 1: MENTEE SUBMISSIONS LIST (WITH SEARCH BAR, VIEW FILE, INSPECT & PDF)
  // ============================================================================
  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerPortalTag}>DOCUMENT VERIFICATION DESK</Text>
          <Text style={styles.headerTitle}>Mentee Submissions</Text>
          <Text style={styles.headerSub}>
            Verify, inspect & print student VTU dossiers and proofs
          </Text>
        </View>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutBtnText}>Sign Out</Text>
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
        <View style={styles.filterHeaderRow}>
          <Text style={styles.sectionTitle}>
            Records ({visibleDocuments.length})
          </Text>
          <View style={styles.filterChipsRow}>
            {(['ALL', 'Pending', 'Verified'] as const).map((st) => {
              const active = statusFilter === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setStatusFilter(st)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.searchBar}>
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
            placeholder="Search scholar by name, USN, or document title..."
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

        {visibleDocuments.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f46e5"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </Svg>
            </View>
            <Text style={styles.emptyTitle}>No Submissions Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No records match "${searchQuery}".`
                : 'Mentees have not uploaded any certificates yet.'}
            </Text>
          </View>
        ) : (
          visibleDocuments.map((doc: any) => {
            const docKey = doc.id || doc._id;
            const summary = doc.dossierSummary || doc.notes;
            const scholarName =
              studentNameMap.get(String(doc.studentId || '').toUpperCase()) ||
              doc.studentName ||
              'Scholar';

            return (
              <View key={docKey} style={styles.docCard}>
                <View style={styles.docCardTop}>
                  <View style={styles.docLeadingIcon}>
                    <Svg
                      width={19}
                      height={19}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <Polyline points="14 2 14 8 20 8" />
                    </Svg>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle} numberOfLines={1}>
                      {doc.title}
                    </Text>
                    <Text style={styles.docStudent}>
                      <Text style={{ fontWeight: '800', color: '#1e293b' }}>
                        {scholarName}
                      </Text>{' '}
                      ({doc.studentId}) • {doc.category} • {doc.date || '2026-11-17'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      doc.verified
                        ? styles.statusPillVerified
                        : styles.statusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        doc.verified
                          ? styles.statusTextVerified
                          : styles.statusTextPending,
                      ]}
                    >
                      {doc.verified ? 'Verified' : 'Unverified'}
                    </Text>
                  </View>
                </View>

                {summary ? (
                  <View style={styles.dossierBanner}>
                    <Text style={styles.dossierBannerText}>{summary}</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.fullDossierBtn, { flex: 1.4 }]}
                    onPress={() => handleInspectCandidate(doc)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.fullDossierBtnText}>
                      Inspect All 5 Tabs
                    </Text>
                  </TouchableOpacity>

                  {Boolean(doc.fileUri) && (
                    <TouchableOpacity
                      style={[styles.viewFileCardBtn, { flex: 1 }]}
                      onPress={() => handleOpenCloudFile(doc)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.viewFileCardBtnText}>View File</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.printCardBtn, { flex: 1 }]}
                    onPress={() => handlePrintFromCard(doc)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.printCardBtnText}>Print / PDF</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.docCardBottom}>
                  <Text style={styles.fileMeta} numberOfLines={1}>
                    {doc.fileName} • {doc.fileSize || '1.2 MB'}
                  </Text>
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={styles.deleteDocBtn}
                      onPress={() => handlePermanentDelete(doc)}
                    >
                      <Text style={styles.deleteDocBtnText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.verifyBtn,
                        doc.verified && styles.verifyBtnRevoke,
                      ]}
                      onPress={() => toggleDocVerify(docKey)}
                    >
                      <Text
                        style={[
                          styles.verifyBtnText,
                          doc.verified && styles.verifyBtnTextRevoke,
                        ]}
                      >
                        {doc.verified ? 'Revoke' : 'Verify & Approve'}
                      </Text>
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
};

export default MenteeDocsScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#1e1b4b' },
  topHeader: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerPortalTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 0.9,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  headerSub: { fontSize: 11, color: '#c7d2fe', marginTop: 2 },
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  signOutBtnText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  headerPrintBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },
  headerPrintBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#312e81',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: '#4f46e5' },
  tabBtnText: { fontSize: 10, fontWeight: '700', color: '#c7d2fe' },
  tabBtnTextActive: { color: '#ffffff', fontWeight: '800' },
  container: { flex: 1, backgroundColor: '#f3f6fc' },
  scrollContent: { padding: 14 },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#172f55' },
  filterChipsRow: { flexDirection: 'row', gap: 6 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#4f46e5' },
  filterChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterChipTextActive: { color: '#ffffff', fontWeight: '800' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 42,
    marginBottom: 13,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b', paddingVertical: 8 },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94a3b8',
    paddingHorizontal: 4,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#dce5f3',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 11.5, color: '#64748b', marginTop: 4, textAlign: 'center' },
  docCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 1,
  },
  docCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  docLeadingIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  docStudent: { fontSize: 11, color: '#64748b', marginTop: 2 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusPillVerified: { backgroundColor: '#ecfdf5' },
  statusPillPending: { backgroundColor: '#fffbeb' },
  statusPillText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  statusTextVerified: { color: '#047857' },
  statusTextPending: { color: '#b45309' },
  dossierBanner: {
    backgroundColor: '#f6f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#4f46e5',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 9,
  },
  dossierBannerText: { fontSize: 11, color: '#1e293b' },
  fullDossierBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullDossierBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  viewFileCardBtn: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewFileCardBtnText: { fontSize: 11, fontWeight: '800', color: '#4338ca' },
  printCardBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printCardBtnText: { fontSize: 11, fontWeight: '800', color: '#1d4ed8' },
  docCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  fileMeta: { fontSize: 10.5, color: '#64748b', flex: 1, marginRight: 8 },
  cardActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteDocBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deleteDocBtnText: { fontSize: 11, fontWeight: '700', color: '#be123c' },
  verifyBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  verifyBtnRevoke: { backgroundColor: '#fff1f2' },
  verifyBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  verifyBtnTextRevoke: { color: '#be123c' },
  attachmentHighlightCard: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 14,
    padding: 13,
    marginBottom: 12,
  },
  attachmentHighlightTitle: { fontSize: 12.5, fontWeight: '800', color: '#1e1b4b' },
  attachmentHighlightMeta: {
    fontSize: 11,
    color: '#4338ca',
    marginTop: 2,
    fontWeight: '600',
  },
  attachmentHighlightFile: { fontSize: 10.5, color: '#312e81', marginTop: 3 },
  cloudImagePreview: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  openCloudFileBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  openCloudFileBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  noCloudUrlWarning: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '600',
    marginTop: 8,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1e1b4b',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 7,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: '62%',
    textAlign: 'right',
  },
  infoBlock: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoBlockValue: {
    fontSize: 12,
    color: '#1e293b',
    marginTop: 3,
    lineHeight: 17,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableDataCell: { fontSize: 11, color: '#0f172a' },
  semSubTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338ca',
    marginBottom: 6,
  },
  emptySmallText: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },
  subItemCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 11,
    marginBottom: 8,
  },
  subItemTitle: { fontSize: 11.5, fontWeight: '800', color: '#1e1b4b' },
  subItemDesc: { fontSize: 11, color: '#334155', marginTop: 3 },
  signatureDisplayBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signatureDisplayText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#047857',
    fontStyle: 'italic',
  },
  signatureVerifiedSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    marginTop: 4,
  },
  inspectorFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  footerPrintBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
  },
  footerPrintBtnText: { fontSize: 11.5, fontWeight: '800', color: '#1d4ed8' },
  footerDeleteBtn: {
    flex: 0.9,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
  },
  footerDeleteBtnText: { fontSize: 11.5, fontWeight: '800', color: '#be123c' },
  footerVerifyBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#047857',
    alignItems: 'center',
  },
  footerRevokeBtn: { backgroundColor: '#fff1f2' },
  footerVerifyBtnText: { fontSize: 11.5, fontWeight: '800', color: '#ffffff' },
  footerRevokeBtnText: { color: '#be123c' },
});