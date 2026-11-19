import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../context/useAuthStore';
import { useDataContext } from '../../context/useDataContext';

export const ConfigScreen = () => {
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const { config, updateConfig } = useDataContext();

  const [thetaA, setThetaA] = useState(String(config.thetaA ?? 7.5));
  const [thetaM, setThetaM] = useState(String(config.thetaM ?? 6.0));
  const [wM, setWM] = useState(String(config.wM ?? 0.6));
  const [wA, setWA] = useState(String(config.wA ?? 0.4));

  useEffect(() => {
    setThetaA(String(config.thetaA ?? 7.5));
    setThetaM(String(config.thetaM ?? 6.0));
    setWM(String(config.wM ?? 0.6));
    setWA(String(config.wA ?? 0.4));
  }, [config]);

  const handleSave = async () => {
    await updateConfig({
      thetaA: parseFloat(thetaA) || 7.5,
      thetaM: parseFloat(thetaM) || 6.0,
      wM: parseFloat(wM) || 0.6,
      wA: parseFloat(wA) || 0.4,
    });
    Alert.alert('Configuration Saved', 'System diagnostic parameters have been updated.');
  };

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#14294e" />

      <View style={styles.appTopbar}>
        <View>
          <Text style={styles.topbarKicker}>VTU PG STUDIES • GOVERNANCE</Text>
          <Text style={styles.topbarTitle}>Department Administrator</Text>
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
      >
        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>Diagnostic Threshold Parameters</Text>
          <Text style={styles.panelSub}>
            Configure evaluation weights and early-warning cutoffs.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>COMPETENCY MASTERY BENCHMARK (0 – 10)</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="decimal-pad"
              value={thetaA}
              onChangeText={setThetaA}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>EARLY-WARNING RISK THRESHOLD (0 – 10)</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="decimal-pad"
              value={thetaM}
              onChangeText={setThetaM}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>MARKS WEIGHT (wM)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="decimal-pad"
                value={wM}
                onChangeText={setWM}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>ATTENDANCE WEIGHT (wA)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="decimal-pad"
                value={wA}
                onChangeText={setWA}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Save Configuration</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default ConfigScreen;

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
  panelCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5f3',
    borderRadius: 18,
    padding: 17,
    elevation: 2,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#172b4d',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fb',
  },
  panelSub: {
    fontSize: 11.5,
    color: '#5e6f8c',
    lineHeight: 17,
    marginBottom: 14,
  },
  formGroup: { marginBottom: 14 },
  label: {
    color: '#5e6f8c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.45,
    marginBottom: 6,
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
    fontWeight: '600',
  },
  btnPrimary: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#315fc4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    elevation: 2,
  },
  btnPrimaryText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
});