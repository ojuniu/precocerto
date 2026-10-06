import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors } from '@/constants/theme';

/** Marca do PreçoCerto: etiqueta de preço com um check. */
export function Logo({ size = 72, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? colors.white : colors.primary;
  const fg = inverted ? colors.primary : colors.white;
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <Rect x={0} y={0} width={72} height={72} rx={22} fill={bg} />
      <Path d="M20 22h20l14 14-18 18-16-16V22z" fill={fg} opacity={0.18} />
      <Path d="M18 20h21l15 15-19 19-17-17V20z" stroke={fg} strokeWidth={3.5} strokeLinejoin="round" fill="none" />
      <Circle cx={27} cy={29} r={3} fill={fg} />
      <Path d="M30 40l5 5 10-11" stroke={fg} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
