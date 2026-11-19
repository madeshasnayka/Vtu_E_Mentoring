import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

type RoleOption = 'student' | 'mentor' | 'admin';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const { batchYears, addCustomBatchYear } = useDataContext();

  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<RoleOption>('admin');
  const [identifier, setIdentifier] = useState('ADMIN-01');
  const [password, setPassword] = useState('password123');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student Self-Registration State (Default 2026 Batch + Custom Year)
  const [regName, setRegName] = useState('');
  const [regUsn, setRegUsn] = useState('');
  const [regYear, setRegYear] = useState('2026');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleSelectRole = (role: RoleOption) => {
    setSelectedRole(role);
    if (role === 'student') setIdentifier('4VZ25MC055');
    else if (role === 'mentor') setIdentifier('0001');
    else setIdentifier('ADMIN-01');
    setPassword('password123');
  };

  const executeLogin = async (
    roleToUse: RoleOption,
    idToUse: string,
    passToUse: string
  ) => {
    const cleanId = idToUse.trim();
    if (!cleanId || !passToUse) {
      Alert.alert('Missing Credentials', 'Please enter your ID and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Immediately show the clean 3rd-image VtuSessionLoader during API call
      useAuthStore.setState({
        sessionTransitionText: `OPENING ${roleToUse.toUpperCase()} WORKSPACE...`,
      });

      const res = await apiClient.post('/auth/login', {
        identifier: cleanId,
        password: passToUse,
        role: roleToUse,
      });

      const { token, user } = res.data;
      await setAuth(token, user);
    } catch (error: any) {
      useAuthStore.setState({ sessionTransitionText: null });
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Unable to reach server. Please check your connection.';
      Alert.alert('Authentication Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentSelfRegister = async () => {
    if (!regName.trim() || !regUsn.trim() || !regPassword.trim()) {
      Alert.alert(
        'Missing Fields',
        'Please enter Full Name, Student USN/ID, and Password.'
      );
      return;
    }

    const cleanYear = /^\d{4}$/.test(regYear.trim()) ? regYear.trim() : '2026';

    try {
      setIsSubmitting(true);
      useAuthStore.setState({
        sessionTransitionText: 'SUBMITTING STUDENT REGISTRATION...',
      });

      await apiClient.post('/auth/register', {
        name: regName.trim(),
        identifier: regUsn.trim().toUpperCase(),
        admissionYear: cleanYear,
        email:
          regEmail.trim() ||
          `${regUsn.trim().toLowerCase()}@vtu.ac.in`,
        phone: regPhone.trim(),
        password: regPassword,
        role: 'student',
      });

      if (!batchYears.includes(cleanYear)) {
        await addCustomBatchYear(cleanYear);
      }

      useAuthStore.setState({ sessionTransitionText: null });
      setRegName('');
      setRegUsn('');
      setRegYear('2026');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setAuthTab('login');

      Alert.alert(
        'Registration Submitted',
        `Enrolled for ${cleanYear} Batch! Your account is now in the Admin Pending Approvals queue.`
      );
    } catch (error: any) {
      useAuthStore.setState({ sessionTransitionText: null });
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Registration failed.';
      Alert.alert('Registration Notice', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const idLabel =
    selectedRole === 'student'
      ? 'STUDENT USN / PROVISIONAL ID'
      : selectedRole === 'mentor'
      ? 'FACULTY MENTOR ID'
      : 'ADMINISTRATOR ID';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />

      {/* Royal Blue University Header with Pure SVG Graduation Cap */}
      <View style={[styles.authHeader, { paddingTop: insets.top + 22 }]}>
        <View style={styles.authHeaderRow}>
          <View style={styles.brandLogo}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="#ffffff">
              <Path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 13.5l-7-3.82v4.57C5 19.99 8.13 22 12 22s7-2.01 7-4.75v-4.57l-7 3.82z" />
            </Svg>
          </View>
          <View>
            <Text style={styles.headerTitle}>Online Mentoring</Text>
            <Text style={styles.headerSub}>
              Dept. of CSE • VTU PG Studies, Mysuru
            </Text>
          </View>
        </View>
      </View>

      {/* Sign In / Student Self-Register Tabs */}
      <View style={styles.authTabs}>
        <TouchableOpacity
          style={[styles.authTab, authTab === 'login' && styles.authTabActive]}
          onPress={() => setAuthTab('login')}
        >
          <Text
            style={[
              styles.authTabText,
              authTab === 'login' && styles.authTabTextActive,
            ]}
          >
            Sign In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.authTab,
            authTab === 'register' && styles.authTabActive,
          ]}
          onPress={() => setAuthTab('register')}
        >
          <Text
            style={[
              styles.authTabText,
              authTab === 'register' && styles.authTabTextActive,
            ]}
          >
            Student Self-Register
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={[
          styles.formArea,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {authTab === 'login' ? (
          <View>
            <Text style={styles.labelCaps}>SELECT PORTAL ROLE</Text>
            <View style={styles.segmentedControl}>
              {(
                [
                  { key: 'student', label: 'Student' },
                  { key: 'mentor', label: 'Mentor' },
                  { key: 'admin', label: 'Admin' },
                ] as const
              ).map((r) => {
                const active = selectedRole === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                    onPress={() => handleSelectRole(r.key)}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        active && styles.segmentBtnTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>{idLabel}</Text>
              <TextInput
                style={styles.formInput}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                placeholder="Enter ID"
                placeholderTextColor="#91a0b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <TextInput
                style={styles.formInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#91a0b8"
              />
            </View>

            <TouchableOpacity
              style={styles.btnPrimary}
              disabled={isSubmitting}
              onPress={() => executeLogin(selectedRole, identifier, password)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Sign In to Dashboard →</Text>
            </TouchableOpacity>

            <View style={styles.presetSection}>
              <Text style={styles.labelCaps}>FAST TESTING PRESET ACCOUNTS</Text>
              <View style={styles.presetRow}>
                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => {
                    handleSelectRole('student');
                    executeLogin('student', '91325', 'password123');
                  }}
                >
                  <Text style={styles.presetBtnText}>Sebastian</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => {
                    handleSelectRole('mentor');
                    executeLogin('mentor', '0001', 'password123');
                  }}
                >
                  <Text style={styles.presetBtnText}>Dr. Kumar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => {
                    handleSelectRole('admin');
                    executeLogin('admin', 'ADMIN-01', 'password123');
                  }}
                >
                  <Text style={styles.presetBtnText}>Dept Admin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                <Text style={{ fontWeight: '800' }}>
                  Student Self-Registration Only:{' '}
                </Text>
                Admission Batch defaults to <Text style={{ fontWeight: '800' }}>2026</Text>, or you may enter any custom 4-digit batch year.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>STUDENT FULL NAME *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Kavya Murthy"
                placeholderTextColor="#91a0b8"
                value={regName}
                onChangeText={setRegName}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.formGroup, { flex: 1.15 }]}>
                <Text style={styles.fieldLabel}>STUDENT USN / ID *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 4VZ26MC019"
                  placeholderTextColor="#91a0b8"
                  autoCapitalize="characters"
                  value={regUsn}
                  onChangeText={setRegUsn}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>BATCH YEAR (DEFAULT 2026)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="2026"
                  placeholderTextColor="#91a0b8"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={regYear}
                  onChangeText={setRegYear}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>INSTITUTIONAL EMAIL *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. scholar@vtu.ac.in"
                placeholderTextColor="#91a0b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={regEmail}
                onChangeText={setRegEmail}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>CONTACT NUMBER</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. +91 9876543210"
                placeholderTextColor="#91a0b8"
                keyboardType="phone-pad"
                value={regPhone}
                onChangeText={setRegPhone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>CREATE PORTAL PASSWORD *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#91a0b8"
                secureTextEntry
                value={regPassword}
                onChangeText={setRegPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.btnPrimary}
              disabled={isSubmitting}
              onPress={handleStudentSelfRegister}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>
                Submit Student Registration for Approval
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f6fc' },
  authHeader: {
    backgroundColor: '#14294e',
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  authHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  brandLogo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#315fc4',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 3,
  },
  authTabs: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dce5f3',
  },
  authTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  authTabActive: {
    borderBottomColor: '#315fc4',
  },
  authTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5e6f8c',
  },
  authTabTextActive: {
    color: '#315fc4',
    fontWeight: '800',
  },
  formScroll: { flex: 1 },
  formArea: { padding: 22 },
  labelCaps: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60759a',
    letterSpacing: 0.85,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#e8eef9',
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5e6f8c',
  },
  segmentBtnTextActive: {
    color: '#315fc4',
    fontWeight: '800',
  },
  formGroup: { marginBottom: 14 },
  fieldLabel: {
    color: '#5e6f8c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.45,
    marginBottom: 6,
  },
  formInput: {
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 11,
    backgroundColor: '#fbfdff',
    color: '#172b4d',
    fontSize: 13.5,
    fontWeight: '500',
  },
  noticeBox: {
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#315fc4',
    borderRadius: 10,
    backgroundColor: '#eef3ff',
    marginBottom: 16,
  },
  noticeText: {
    color: '#3b5380',
    fontSize: 12,
    lineHeight: 18,
  },
  btnPrimary: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#315fc4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    elevation: 3,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  presetSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dce5f3',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  presetBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dce5f3',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#5e6f8c',
  },
});