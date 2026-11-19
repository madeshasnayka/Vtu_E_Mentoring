import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
}

export const ThresholdAlertBanner: React.FC<Props> = ({ type, title, message }) => {
  const isDanger = type === 'danger';
  const isWarning = type === 'warning';

  return (
    <View style={[
      styles.container,
      isDanger ? styles.dangerContainer : isWarning ? styles.warningContainer : styles.infoContainer
    ]}>
      <Text style={styles.icon}>{isDanger ? '⚠️' : isWarning ? '⏱️' : 'ℹ️'}</Text>
      <View style={styles.textContainer}>
        <Text style={[styles.title, isDanger ? styles.dangerText : isWarning ? styles.warningText : styles.infoText]}>
          {title}
        </Text>
        <Text style={[styles.message, isDanger ? styles.dangerText : isWarning ? styles.warningText : styles.infoText]}>
          {message}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
  },
  dangerContainer: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  warningContainer: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  infoContainer: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' },
  icon: { fontSize: 16 },
  textContainer: { flex: 1 },
  title: { fontSize: 12, fontWeight: '800', marginBottom: 2 },
  message: { fontSize: 11, lineHeight: 15 },
  dangerText: { color: '#991b1b' },
  warningText: { color: '#92400e' },
  infoText: { color: '#075985' },
});