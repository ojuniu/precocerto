import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from '@/constants/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'price' | 'priceLarge';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textMuted },
  price: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  priceLarge: { fontFamily: fonts.extrabold, fontSize: 38, lineHeight: 44, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[{ color: colors.text }, VARIANTS[variant], color ? { color } : null, align ? { textAlign: align } : null, style]} />;
}
