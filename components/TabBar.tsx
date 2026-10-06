import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, gradients, radius, shadow, spacing } from '@/constants/theme';
import { useHistoryStore } from '@/store/historyStore';
import { AppText } from './AppText';
import { GlassView } from './GlassView';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, [IconName, IconName]> = {
  home: ['home', 'home-outline'],
  history: ['receipt', 'receipt-outline'],
  prices: ['trending-up', 'trending-up-outline'],
  profile: ['person-circle', 'person-circle-outline'],
};

/** Barra inferior de vidro com o botão de câmera no centro (atalho para fotografar). */
export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const ongoing = useHistoryStore((s) => s.shoppings.find((shopping) => shopping.status !== 'checked'));

  const openCamera = () => {
    if (ongoing) router.push(`/shopping/${ongoing.id}/camera`);
    else router.push('/shopping/new');
  };

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const label = descriptors[route.key]?.options.title ?? route.name;
    const [active, inactive] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} onPress={onPress} style={styles.tab}>
        <Ionicons name={focused ? active : inactive} size={23} color={focused ? colors.primaryDark : colors.textMuted} />
        <AppText variant="caption" style={styles.label} color={focused ? colors.primaryDark : colors.textMuted}>
          {label}
        </AppText>
      </Pressable>
    );
  });

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <GlassView style={styles.bar} intensity={60}>
        <View style={styles.row}>
          {tabs.slice(0, 2)}
          <View style={styles.centerSlot} />
          {tabs.slice(2)}
        </View>
      </GlassView>
      <Pressable accessibilityRole="button" accessibilityLabel="Fotografar etiqueta" onPress={openCamera} style={styles.fabWrap}>
        <LinearGradient colors={gradients.hero} style={styles.fab}>
          <Ionicons name="scan" size={28} color={colors.white} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg },
  bar: { borderRadius: radius.xl, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  label: { fontSize: 11 },
  centerSlot: { width: 72 },
  fabWrap: {
    position: 'absolute',
    alignSelf: 'center',
    top: -22,
    borderRadius: radius.pill,
    borderWidth: 5,
    borderColor: colors.background,
    ...shadow,
    shadowOpacity: 0.3,
    shadowColor: colors.primaryDark,
  },
  fab: { width: 64, height: 64, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
