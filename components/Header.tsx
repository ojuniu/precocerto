import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './AppText';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}

export function Header({ title, subtitle, back = true, onBack, right }: HeaderProps) {
  return (
    <View style={styles.row}>
      {back ? (
        <Pressable accessibilityLabel="Voltar" hitSlop={12} onPress={onBack ?? (() => router.back())} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <AppText variant="title" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? <AppText variant="caption" numberOfLines={1}>{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
});
