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
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

type RoleOption = 'student' | 'mentor' | 'admin';
type DemoFillMode = 'id' | 'email';

const DEMO_PRESETS: Record<
  RoleOption,
  { label: string; sub: string; id: string; email: string; dotColor: string }
> = {
  student: {
    label: 'Sebastian',
    sub: 'Student',
    id: '91325',
    email: '91325@vtu.ac.in',
    dotColor: '#2563eb',
  },
  mentor: {
    label: 'Dr. Kumar',
    sub: 'Mentor',
    id: '0001',
    email: 'kumar.pk@vtu.ac.in',
    dotColor: '#4f46e5',
  },
  admin: {
    label: 'Dept Admin',
    sub: 'Admin',
    id: 'ADMIN-01',
    email: 'admin@vtu.ac.in',
    dotColor: '#059669',
  },
};

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const { batchYears, addCustomBatchYear } = useDataContext();

  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<RoleOption>('admin');
  const [demoFillMode, setDemoFillMode] = useState<DemoFillMode>('id');
  const [identifier, setIdentifier] = useState('ADMIN-01');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student Self-Registration State (Default 2026 Batch + Custom Year)
  const [regName, setRegName] = useState('');
  const [regUsn, setRegUsn] = useState('');
  const [regYear, setRegYear] = useState('2026');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const isEmailMode = identifier.includes('@');

  const handleSelectRole = (
    role: RoleOption,
    mode: DemoFillMode = demoFillMode
  ) => {
    setSelectedRole(role);
    if (role === 'student') {
      setIdentifier(mode === 'email' ? '4vz25mc055@vtu.ac.in' : '4VZ25MC055');
    } else if (role === 'mentor') {
      setIdentifier(mode === 'email' ? 'kumar.pk@vtu.ac.in' : '0001');
    } else {
      setIdentifier(mode === 'email' ? 'admin@vtu.ac.in' : 'ADMIN-01');
    }
    setPassword('password123');
  };

  const executeLogin = async (
    roleToUse: RoleOption,
    idToUse: string,
    passToUse: string
  ) => {
    const cleanId = idToUse.trim();
    if (!cleanId || !passToUse) {
      Alert.alert(
        'Missing Credentials',
        'Please enter your USN/ID or registered email and password.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
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
          regEmail.trim().toLowerCase() ||
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
      ? 'STUDENT USN OR REGISTERED EMAIL'
      : selectedRole === 'mentor'
      ? 'FACULTY ID OR REGISTERED EMAIL'
      : 'ADMIN ID OR REGISTERED EMAIL';

  const idPlaceholder =
    selectedRole === 'student'
      ? 'e.g. 4VZ25MC055 or student@vtu.ac.in'
      : selectedRole === 'mentor'
      ? 'e.g. 0001 or kumar.pk@vtu.ac.in'
      : 'e.g. ADMIN-01 or admin@vtu.ac.in';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0c1f3f" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Architectural Deep Navy Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
          <View style={styles.heroRow}>
            <View style={styles.brandBadge}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="#ffffff">
                <Path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 13.5l-7-3.82v4.57C5 19.99 8.13 22 12 22s7-2.01 7-4.75v-4.57l-7 3.82z" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>VTU PG STUDIES • MYSURU</Text>
              <Text style={styles.heroTitle}>Online Mentoring</Text>
              <Text style={styles.heroSub}>Dept. of CSE (MCA Programme)</Text>
            </View>
          </View>
        </View>

        {/* Straddling Elevated Pill Switcher */}
        <View style={styles.switcherWrap}>
          <View style={styles.switcherTrack}>
            <TouchableOpacity
              style={[
                styles.switcherPill,
                authTab === 'login' && styles.switcherPillActive,
              ]}
              onPress={() => setAuthTab('login')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.switcherText,
                  authTab === 'login' && styles.switcherTextActive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.switcherPill,
                authTab === 'register' && styles.switcherPillActive,
              ]}
              onPress={() => setAuthTab('register')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.switcherText,
                  authTab === 'register' && styles.switcherTextActive,
                ]}
              >
                Student Register
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Elevated Form Card */}
        <View style={styles.card}>
          {authTab === 'login' ? (
            <View style={styles.loginContainer}>
              <View>
                <View style={styles.welcomeBlock}>
                  <Text style={styles.welcomeTitle}>Welcome Back</Text>
                  <Text style={styles.welcomeSub}>
                    Sign in using your University ID or registered email to
                    access your mentoring workspace.
                  </Text>
                </View>

                <Text style={styles.sectionCaps}>SELECT PORTAL ROLE</Text>
                <View style={styles.roleSegmented}>
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
                        style={[styles.roleBtn, active && styles.roleBtnActive]}
                        onPress={() => handleSelectRole(r.key)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.roleBtnText,
                            active && styles.roleBtnTextActive,
                          ]}
                        >
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Smart USN / Email Input */}
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
                      {idLabel}
                    </Text>
                    <View
                      style={[
                        styles.modeBadge,
                        isEmailMode ? styles.modeBadgeEmail : styles.modeBadgeId,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeBadgeText,
                          isEmailMode
                            ? styles.modeBadgeTextEmail
                            : styles.modeBadgeTextId,
                        ]}
                      >
                        {isEmailMode ? 'Email Mode' : 'ID Mode'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputWrap}>
                    <View style={styles.inputIcon}>
                      {isEmailMode ? (
                        <Svg
                          width={17}
                          height={17}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <Rect x="2" y="4" width="20" height="16" rx="2" />
                          <Path d="M22 6l-10 7L2 6" />
                        </Svg>
                      ) : (
                        <Svg
                          width={17}
                          height={17}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <Rect x="2" y="5" width="20" height="14" rx="2" />
                          <Line x1="2" y1="10" x2="22" y2="10" />
                        </Svg>
                      )}
                    </View>
                    <TextInput
                      style={styles.inputField}
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder={idPlaceholder}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Password Input with Visibility Toggle */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <View style={styles.inputWrap}>
                    <View style={styles.inputIcon}>
                      <Svg
                        width={17}
                        height={17}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <Rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </Svg>
                    </View>
                    <TextInput
                      style={styles.inputField}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Enter password"
                      placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword((prev) => !prev)}
                    >
                      <Svg
                        width={18}
                        height={18}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {showPassword ? (
                          <>
                            <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <Line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <Circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.btnPrimary, isSubmitting && { opacity: 0.7 }]}
                  disabled={isSubmitting}
                  onPress={() => executeLogin(selectedRole, identifier, password)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnPrimaryText}>Sign In to Dashboard</Text>
                  <Svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Line x1="5" y1="12" x2="19" y2="12" />
                    <Polyline points="12 5 19 12 12 19" />
                  </Svg>
                </TouchableOpacity>
              </View>

              {/* Refined Quick Demo Access Bar */}
              <View style={styles.demoSection}>
                <View style={styles.demoHeader}>
                  <Text style={styles.demoTitle}>QUICK DEMO ACCESS</Text>
                  <View style={styles.demoToggle}>
                    <TouchableOpacity
                      style={[
                        styles.demoToggleBtn,
                        demoFillMode === 'id' && styles.demoToggleBtnActive,
                      ]}
                      onPress={() => setDemoFillMode('id')}
                    >
                      <Text
                        style={[
                          styles.demoToggleText,
                          demoFillMode === 'id' && styles.demoToggleTextActive,
                        ]}
                      >
                        USN / ID
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.demoToggleBtn,
                        demoFillMode === 'email' && styles.demoToggleBtnActive,
                      ]}
                      onPress={() => setDemoFillMode('email')}
                    >
                      <Text
                        style={[
                          styles.demoToggleText,
                          demoFillMode === 'email' &&
                            styles.demoToggleTextActive,
                        ]}
                      >
                        Email
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.demoGrid}>
                  {(['student', 'mentor', 'admin'] as const).map((roleKey) => {
                    const preset = DEMO_PRESETS[roleKey];
                    const credential =
                      demoFillMode === 'email' ? preset.email : preset.id;
                    return (
                      <TouchableOpacity
                        key={roleKey}
                        style={styles.demoCard}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedRole(roleKey);
                          setIdentifier(credential);
                          setPassword('password123');
                          executeLogin(roleKey, credential, 'password123');
                        }}
                      >
                        <View style={styles.demoCardTop}>
                          <View
                            style={[
                              styles.demoDot,
                              { backgroundColor: preset.dotColor },
                            ]}
                          />
                          <Text style={styles.demoRoleSub}>{preset.sub}</Text>
                        </View>
                        <Text style={styles.demoName} numberOfLines={1}>
                          {preset.label}
                        </Text>
                        <Text style={styles.demoCred} numberOfLines={1}>
                          {credential}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
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
                  Admission Batch defaults to{' '}
                  <Text style={{ fontWeight: '800' }}>2026</Text>, or enter any
                  custom 4-digit batch year.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>STUDENT FULL NAME *</Text>
                <TextInput
                  style={styles.plainInput}
                  placeholder="e.g. Kavya Murthy"
                  placeholderTextColor="#94a3b8"
                  value={regName}
                  onChangeText={setRegName}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1.2 }]}>
                  <Text style={styles.fieldLabel}>STUDENT USN / ID *</Text>
                  <TextInput
                    style={styles.plainInput}
                    placeholder="e.g. 4VZ26MC019"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    value={regUsn}
                    onChangeText={setRegUsn}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 0.9 }]}>
                  <Text style={styles.fieldLabel}>BATCH YEAR</Text>
                  <TextInput
                    style={styles.plainInput}
                    placeholder="2026"
                    placeholderTextColor="#94a3b8"
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
                  style={styles.plainInput}
                  placeholder="e.g. scholar@vtu.ac.in"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={regEmail}
                  onChangeText={setRegEmail}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>CONTACT NUMBER</Text>
                <TextInput
                  style={styles.plainInput}
                  placeholder="e.g. +91 9876543210"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={regPhone}
                  onChangeText={setRegPhone}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>CREATE PORTAL PASSWORD *</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.inputField, { paddingLeft: 13 }]}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showRegPassword}
                    value={regPassword}
                    onChangeText={setRegPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowRegPassword((prev) => !prev)}
                  >
                    <Svg
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#64748b"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {showRegPassword ? (
                        <>
                          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <Line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <Circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </Svg>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, isSubmitting && { opacity: 0.7 }]}
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5fb' },
  scroll: { flex: 1 },
  hero: {
    backgroundColor: '#0c1f3f',
    paddingHorizontal: 22,
    paddingBottom: 46,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brandBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#93c5fd',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  switcherWrap: {
    paddingHorizontal: 20,
    marginTop: -24,
    zIndex: 10,
  },
  switcherTrack: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 5,
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  switcherPill: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherPillActive: {
    backgroundColor: '#2563eb',
  },
  switcherText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  switcherTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  card: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    minHeight: 500,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#dce5f3',
    elevation: 2,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  welcomeBlock: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fb',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  welcomeSub: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionCaps: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  roleSegmented: {
    flexDirection: 'row',
    backgroundColor: '#edf2fb',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  roleBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
  roleBtnTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  formGroup: { marginBottom: 18 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  modeBadgeId: { backgroundColor: '#f1f5f9' },
  modeBadgeEmail: { backgroundColor: '#eff6ff' },
  modeBadgeText: { fontSize: 10, fontWeight: '800' },
  modeBadgeTextId: { color: '#475569' },
  modeBadgeTextEmail: { color: '#2563eb' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#d5e0f0',
    borderRadius: 12,
    backgroundColor: '#f8fbff',
  },
  inputIcon: {
    paddingLeft: 13,
    paddingRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    fontWeight: '600',
    paddingVertical: 10,
    paddingRight: 10,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  plainInput: {
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d5e0f0',
    borderRadius: 12,
    backgroundColor: '#f8fbff',
    color: '#0f172a',
    fontSize: 13.5,
    fontWeight: '500',
  },
  noticeBox: {
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    marginBottom: 16,
  },
  noticeText: {
    color: '#1e3a8a',
    fontSize: 12,
    lineHeight: 18,
  },
  btnPrimary: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    elevation: 3,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  demoSection: {
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  demoToggle: {
    flexDirection: 'row',
    backgroundColor: '#edf2fb',
    borderRadius: 8,
    padding: 2,
  },
  demoToggleBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  demoToggleBtnActive: {
    backgroundColor: '#ffffff',
    elevation: 1,
  },
  demoToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  demoToggleTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  demoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  demoCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  demoCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  demoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  demoRoleSub: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
  },
  demoName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  demoCred: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '600',
  },
});