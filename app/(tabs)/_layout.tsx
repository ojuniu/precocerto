import { Ionicons } from '@expo/vector-icons';
import Tabs from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { colors, fonts } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Início', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="history" options={{ title: 'Histórico', tabBarIcon: icon('receipt') }} />
      <Tabs.Screen name="prices" options={{ title: 'Preços', tabBarIcon: icon('trending-up') }} />
      <Tabs.Screen name="profile" options={{ title: 'Conta', tabBarIcon: icon('person-circle') }} />
    </Tabs>
  );
}
