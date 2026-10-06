import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/Toast';
import { colors } from '@/constants/theme';
import { isSupabaseConfigured } from '@/constants/env';
import { useAuthStore } from '@/store/authStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const signedIn = useAuthStore((s) => s.session !== null);

  useEffect(() => {
    initialize().catch(() => undefined);
  }, [initialize]);

  useEffect(() => {
    if (fontsLoaded && initialized) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, initialized]);

  if (!fontsLoaded || !initialized) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Protected guard={!isSupabaseConfigured}>
            <Stack.Screen name="setup" />
          </Stack.Protected>
          <Stack.Protected guard={isSupabaseConfigured && !signedIn}>
            <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="shopping/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="shopping/[id]/index" />
            <Stack.Screen name="shopping/[id]/camera" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="shopping/[id]/confirm" />
            <Stack.Screen name="shopping/[id]/shelf" />
            <Stack.Screen name="shopping/[id]/item/[itemId]" />
            <Stack.Screen name="shopping/[id]/receipt" />
            <Stack.Screen name="shopping/[id]/conference" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
          </Stack.Protected>
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
