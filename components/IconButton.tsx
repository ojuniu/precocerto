import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '@/constants/theme';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  tone?: 'light' | 'dark';
  size?: number;
}

export function IconButton({ icon, onPress, label, tone = 'light', size = 44 }: IconButtonProps) {
  const dark = tone === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, backgroundColor: dark ? 'rgba(255,255,255,0.18)' : colors.glass, borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.25)' : colors.glassBorder, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color={dark ? colors.white : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' } });
