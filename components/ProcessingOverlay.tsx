import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './AppText';

export interface ProcessingOverlayProps {
  title: string;
  message?: string;
  imageUri?: string | null;
}

/** Feedback visível enquanto a IA processa: nunca deixar a tela parada sem resposta. */
export function ProcessingOverlay({ title, message, imageUri }: ProcessingOverlayProps) {
  const [scan] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);

  const translateY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, 196] });

  return (
    <View style={styles.overlay}>
      <View style={styles.frame}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]} />}
        <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
      </View>
      <AppText variant="title" color={colors.white} align="center">{title}</AppText>
      {message ? <AppText variant="body" color="rgba(255,255,255,0.75)" align="center">{message}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10, 15, 25, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
    zIndex: 10,
  },
  frame: { width: 200, height: 200, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: colors.primary },
  image: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: '#1F2937' },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});
