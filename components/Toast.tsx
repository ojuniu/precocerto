import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './AppText';

type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  message: string | null;
  tone: ToastTone;
  key: number;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set, get) => ({
  message: null,
  tone: 'success',
  key: 0,
  show: (message, tone = 'success') => set({ message, tone, key: get().key + 1 }),
  hide: () => set({ message: null }),
}));

const ICONS: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

export function ToastHost() {
  const { message, tone, key, hide } = useToast();
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => hide());
    }, 2400);
    return () => clearTimeout(timer);
  }, [key, message, hide, opacity]);

  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { top: insets.top + spacing.sm, opacity }]}>
      <Ionicons name={ICONS[tone]} size={20} color={tone === 'error' ? colors.danger : colors.primary} />
      <AppText variant="bodyStrong" color={colors.white} style={styles.text} numberOfLines={2}>
        {message}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: { flex: 1 },
});
