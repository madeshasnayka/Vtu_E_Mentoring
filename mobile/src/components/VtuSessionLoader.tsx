import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Modal,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface VtuSessionLoaderProps {
  visible: boolean;
  statusText?: string;
  asModal?: boolean;
}

export const VtuSessionLoader: React.FC<VtuSessionLoaderProps> = ({
  visible,
  statusText = 'AUTHENTICATING SESSION...',
  asModal = false,
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    spinAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1050,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [visible, spinAnim]);

  if (!visible) return null;

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const content = (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" backgroundColor="#183263" />

      {/* Center Emblem + Rotating Arc Ring */}
      <View style={styles.emblemBox}>
        <Animated.View
          style={[styles.spinnerWrap, { transform: [{ rotate }] }]}
        >
          <Svg width={94} height={94} viewBox="0 0 94 94">
            <Circle
              cx="47"
              cy="47"
              r="42"
              stroke="rgba(255, 255, 255, 0.14)"
              strokeWidth="2.5"
              fill="none"
            />
            <Circle
              cx="47"
              cy="47"
              r="42"
              stroke="#7dd3fc"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="68 200"
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* Inner Translucent Core + White Graduation Cap */}
        <View style={styles.innerCore}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="#ffffff">
            <Path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 13.5l-7-3.82v4.57C5 19.99 8.13 22 12 22s7-2.01 7-4.75v-4.57l-7 3.82z" />
          </Svg>
        </View>
      </View>

      <Text style={styles.title}>VTU E-Mentoring System</Text>
      <Text style={styles.subtitle}>
        Dept. of Computer Science &amp; Engineering{'\n'}PG Studies, Mysuru
      </Text>

      <View style={styles.statusPill}>
        <Text style={styles.statusPillText}>{statusText.toUpperCase()}</Text>
      </View>
    </View>
  );

  if (asModal) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        {content}
      </Modal>
    );
  }

  return content;
};

export default VtuSessionLoader;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#183263',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    zIndex: 999,
  },
  emblemBox: {
    width: 94,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  spinnerWrap: {
    position: 'absolute',
    width: 94,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#cbd5e1',
    marginTop: 7,
    textAlign: 'center',
    lineHeight: 19,
  },
  statusPill: {
    marginTop: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: 0.7,
  },
});