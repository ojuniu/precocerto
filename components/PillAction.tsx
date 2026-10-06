import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './AppText';

/** Botão em pílula branca com círculo verde e setas (chamada principal sobre cards em degradê). */
export function PillAction({ title, onPress, icon = 'chevron-forward' }: { title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      <View style={styles.circle}>
        <Ionicons name={icon} size={20} color={colors.white} />
      </View>
      <AppText variant="heading" style={styles.title}>{title}</AppText>
      <View style={styles.chevrons}>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={styles.overlap} />
        <Ionicons name="chevron-forward" size={14} color={colors.text} style={styles.overlap} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    padding: 6,
    paddingRight: spacing.lg,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  circle: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
  chevrons: { flexDirection: 'row' },
  overlap: { marginLeft: -6 },
});
