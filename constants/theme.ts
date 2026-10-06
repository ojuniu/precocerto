export const colors = {
  background: '#F1F4EE',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF1EA',
  glass: 'rgba(255,255,255,0.62)',
  glassBorder: 'rgba(255,255,255,0.85)',
  glassDark: 'rgba(20,26,22,0.42)',
  border: '#E2E8DE',
  text: '#121A14',
  textSecondary: '#56635A',
  textMuted: '#8B978E',
  primary: '#2FA552',
  primaryDark: '#1D7E3B',
  primarySoft: '#E2F4E6',
  lime: '#A6D84A',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  warning: '#E8A317',
  warningSoft: '#FDF4DF',
  ink: '#141A16',
  white: '#FFFFFF',
  overlay: 'rgba(12, 18, 14, 0.55)',
} as const;

/** Degradês da marca (usados com expo-linear-gradient). */
export const gradients = {
  hero: ['#3FB862', '#2A9A4C', '#1F7D3D'] as const,
  lime: ['#B5E05A', '#6CC04A'] as const,
  page: ['#DCEFD9', '#EEF4EA', '#F1F4EE'] as const,
  danger: ['#F0646A', '#D63D43'] as const,
  ink: ['#26302A', '#121A14'] as const,
};

export const radius = { sm: 12, md: 18, lg: 26, xl: 32, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const shadow = {
  shadowColor: '#1B3A24',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;
