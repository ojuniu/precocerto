import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { colors, spacing } from '@/constants/theme';
import { formatShortDate } from '@/utils/date';
import { formatBRL } from '@/utils/money';
import { AppText } from './AppText';

export interface ChartPoint {
  date: string;
  value: number;
}

const HEIGHT = 160;
const PADDING = 12;

/** Gráfico de linha simples para histórico de preços. */
export function PriceChart({ points }: { points: ChartPoint[] }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i: number) => (points.length === 1 ? width / 2 : PADDING + (i * (width - PADDING * 2)) / (points.length - 1));
  const y = (v: number) => PADDING + (1 - (v - min) / range) * (HEIGHT - PADDING * 2);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${HEIGHT} L${x(0)},${HEIGHT} Z`;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View onLayout={onLayout} style={styles.container}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.25} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Line x1={0} x2={width} y1={y(min)} y2={y(min)} stroke={colors.border} strokeDasharray="4 4" />
          <Line x1={0} x2={width} y1={y(max)} y2={y(max)} stroke={colors.border} strokeDasharray="4 4" />
          {points.length > 1 ? <Path d={area} fill="url(#fill)" /> : null}
          <Path d={line} stroke={colors.primary} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <Circle key={`${p.date}-${i}`} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 5 : 3} fill={colors.primary} />
          ))}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      <View style={styles.axis}>
        <AppText variant="caption">{first ? formatShortDate(first.date) : ''}</AppText>
        <AppText variant="caption">
          {formatBRL(min)} – {formatBRL(max)}
        </AppText>
        <AppText variant="caption">{last ? formatShortDate(last.date) : ''}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
