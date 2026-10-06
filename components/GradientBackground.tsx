import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { colors, gradients } from '@/constants/theme';

/** Fundo das telas: degradê verde suave no topo com manchas de luz, estilo "glass". */
export function GradientBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={gradients.page} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, styles.blobGreen]} />
      <View style={[styles.blob, styles.blobLime]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 999 },
  blobGreen: { width: 320, height: 320, top: -140, right: -100, backgroundColor: colors.primary, opacity: 0.14 },
  blobLime: { width: 260, height: 260, top: 40, left: -150, backgroundColor: colors.lime, opacity: 0.16 },
});
