import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  color?: string;
  variant?: 'solid' | 'subtle';
}

export const DiagnosticBadge: React.FC<Props> = ({ label, color = '#4338ca', variant = 'subtle' }) => {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: variant === 'solid' ? color : `${color}15` }]}>
      <Text style={[styles.label, { color: variant === 'solid' ? '#ffffff' : color }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});