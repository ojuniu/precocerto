export const colors = {
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F3',
  border: '#E3E6EB',
  text: '#0F172A',
  textSecondary: '#5B6474',
  textMuted: '#8A93A3',
  primary: '#0E9F6E',
  primaryDark: '#0B7E57',
  primarySoft: '#E3F6EE',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  warning: '#E8A317',
  warningSoft: '#FDF4DF',
  ink: '#111827',
  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.55)',
} as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const shadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
