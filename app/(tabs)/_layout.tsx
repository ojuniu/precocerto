import Tabs from 'expo-router/js-tabs';
import { TabBar } from '@/components/TabBar';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="home" options={{ title: 'Início' }} />
      <Tabs.Screen name="history" options={{ title: 'Histórico' }} />
      <Tabs.Screen name="prices" options={{ title: 'Preços' }} />
      <Tabs.Screen name="profile" options={{ title: 'Conta' }} />
    </Tabs>
  );
}
