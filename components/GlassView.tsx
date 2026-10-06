import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/constants/theme';

export interface GlassViewProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** "light" sobre fundos claros, "dark" sobre fotos/câmera. */
  tone?: 'light' | 'dark';
  intensity?: number;
}

/** Painel de vidro fosco (glassmorphism). No Android usa translucidez simples. */
export function GlassView({ children, style, tone = 'light', intensity = 40 }: GlassViewProps) {
  const dark = tone === 'dark';
  const tint = dark ? 'dark' : 'light';
  return (
    <View style={[styles.base, { borderColor: dark ? 'rgba(255,255,255,0.18)' : colors.glassBorder }, style]}>
      {Platform.OS === 'ios' ? <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? colors.glassDark : colors.glass }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1 },
});
