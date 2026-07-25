// 2L "Wood-fired, daylight" palette (design round, July 2026).
// Rules: brand ember is the ONLY interactive color; gold is reserved for
// points and Nirvana; danger is reserved for destructive actions.
export const colors = {
  // Brand (the one color that means "tap me")
  brand: '#D9530E',
  brandDark: '#B84508',
  brandLight: '#F26E2E',

  // Backgrounds (pale butter yellow)
  bg: '#FAF1B2',
  bgCard: '#FFFEF4',
  bgElevated: '#F1E599',
  bgInput: '#F5EBA4',

  // Text (espresso)
  textPrimary: '#2C1E12',
  textSecondary: '#6B5744',
  textMuted: '#9A8670',

  // Reserved accents
  gold: '#A06E08', // points and Nirvana only; deepened to hold contrast on the yellow ground

  // Score zones (Vom to Nirvana), tuned for the light ground
  zoneVom: '#8C1A0F',
  zoneRegret: '#C43C24',
  zoneFine: '#DD7E1C',
  zoneCrave: '#E0A616',
  zoneBliss: '#75A24E',
  zoneNirvana: '#C89B08',

  // Utility
  border: '#E2D488',
  overlay: 'rgba(44, 30, 18, 0.45)',
  danger: '#C0392B',
  success: '#4E7A3A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  hero: 40,
} as const;
