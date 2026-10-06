import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Logo } from '@/components/Logo';
import { isSupabaseConfigured } from '@/constants/env';
import { colors, spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

export default function SplashScreen() {
  const signedIn = useAuthStore((s) => s.session !== null);
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      if (!isSupabaseConfigured) router.replace('/setup');
      else router.replace(signedIn ? '/home' : '/sign-in');
    }, 1300);
    return () => clearTimeout(timer);
  }, [fade, signedIn]);

  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.center, { opacity: fade, transform: [{ translateY }] }]}>
        <Logo size={96} inverted />
        <AppText variant="display" color={colors.white}>PreçoCerto</AppText>
        <AppText variant="body" color="rgba(255,255,255,0.85)">Confira. Compare. Não pague a mais.</AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: spacing.md },
});
