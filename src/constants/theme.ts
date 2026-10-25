// Pizza Quest "faded pizzeria menu" palette (October 2026).
// Pale parchment ground, warm charcoal ink, faded tomato as the ONLY
// interactive color. Gold is reserved for points; danger for destructive
// actions. Kingdom fills are the four map tints and nothing else.
export const colors = {
  // Brand (the one color that means "tap me")
  brand: '#D96C5A',
  brandDark: '#B95443',
  brandLight: '#E8897A',

  // Backgrounds (parchment)
  bg: '#F7F1E3',
  bgCard: '#FFFBF2',
  bgElevated: '#EFE6D2',
  bgInput: '#F3ECDB',

  // Text (warm charcoal)
  textPrimary: '#4A3F35',
  textSecondary: '#8A7B6B',
  textMuted: '#AFA290',

  // Reserved accents
  gold: '#B8923E', // points only

  // Score zones (Vom to Nirvana): one monotonic ramp, faded so it sits on
  // parchment without shouting.
  zoneVom: '#C0564A',
  zoneRegret: '#D4826A',
  zoneFine: '#DDA86B',
  zoneCrave: '#D9BE6E',
  zoneBliss: '#A9BA7E',
  zoneNirvana: '#7FA56F',

  // Kingdom tints (map fills, legend swatches)
  kingdomSage: '#C9D6B8',
  kingdomPowder: '#C3D4E0',
  kingdomBlush: '#EFCFC4',
  kingdomMustard: '#EAD48C',

  // Utility
  border: '#E3D8C3',
  overlay: 'rgba(74, 63, 53, 0.4)',
  danger: '#C25B4D',
  success: '#7FA56F',

  // Sticker language, softened: thin ink lines, low shadows
  ink: '#4A3F35', // outlines
  frame: '#E6CF96', // pale mustard card frames
  surface: '#FFFBF2', // button/card fill
} as const;

export const KINGDOM_FILLS = [
  colors.kingdomSage,
  colors.kingdomPowder,
  colors.kingdomBlush,
  colors.kingdomMustard,
] as const;

// Sticker treatment, now a printed-card feel: 1px ink line, 1px to 3px
// offset shadows at low opacity. Applies to custom RN surfaces only; native
// surfaces (@expo/ui forms, pickers, sheets, the tab bar) stay native.
export const sticker = {
  border: {
    borderWidth: 1,
    borderColor: colors.ink,
  },
  shadow: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 0,
    elevation: 3,
  },
  shadowSm: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 2,
  },
  shadowLg: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 4,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    shadowOffset: { width: 0, height: 1 },
  },
} as const;

// Screen wash: paler parchment at the top, a touch deeper at the bottom,
// with a faint mustard bloom in the upper right so the ground is not one
// flat sheet.
//
// CSS gradients need the New Architecture. Gula is Fabric-only, so this is
// safe; do not swap in expo-linear-gradient.
export const gradients = {
  screen: [
    'radial-gradient(ellipse 110% 70% at 85% 0%, rgba(230, 207, 150, 0.35) 0%, rgba(230, 207, 150, 0) 62%)',
    'linear-gradient(to bottom, #FBF7EC 0%, #F7F1E3 42%, #F0E7D2 100%)',
  ].join(', '),
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
