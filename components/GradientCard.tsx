import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { gradients, radius, shadow, spacing } from '@/constants/theme';

export interface GradientCardProps {
  children: ReactNode;
  colors?: readonly [string, string, ...string[]];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Linhas curvas decorativas (como mapas topográficos). */
  decorated?: boolean;
}

function Contours() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 340 220" preserveAspectRatio="none">
      {[0, 1, 2, 3].map((i) => (
        <Path
          key={i}
          d={`M${180 + i * 22},-10 C${150 + i * 20},${60 + i * 8} ${260 - i * 10},${110 + i * 6} ${210 + i * 18},230`}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={1.5}
          fill="none"
        />
      ))}
      <Path d="M-10,170 C80,140 120,210 220,190 S330,150 360,170" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

export function GradientCard({ children, colors = gradients.hero, onPress, style, decorated = true }: GradientCardProps) {
  const content = (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, style]}>
      {decorated ? <Contours /> : null}
      <View style={styles.inner}>{children}</View>
    </LinearGradient>
  );
  if (!onPress) return <View style={styles.shadow}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.shadow, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { ...shadow, shadowOpacity: 0.2, shadowColor: '#1D7E3B', borderRadius: radius.xl },
  card: { borderRadius: radius.xl, overflow: 'hidden', padding: spacing.xl },
  inner: { gap: spacing.md },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.95 },
});
