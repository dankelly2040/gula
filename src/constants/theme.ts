// Pizza Quest palette (November 2026): a pizza-shop sign.
// Pure white ground, near-black ink, brushed-steel neutrals, and one deep
// signal red as the ONLY interactive color. Gold is reserved for points; danger for destructive
// actions. Kingdom fills are the four map tints and nothing else.
export const colors = {
  // Brand (the one color that means "tap me")
  brand: '#C8102E',
  brandDark: '#A00D25',
  brandLight: '#E0465C',

  // Backgrounds (white ground, neutral grays for raised and input surfaces)
  bg: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgElevated: '#F1F2F3',
  bgInput: '#F5F6F7',

  // Text (near-black, cool greys)
  textPrimary: '#1F1B1B',
  textSecondary: '#6B6767',
  textMuted: '#A29E9E',

  // Reserved accents
  gold: '#B8923E', // points only

  // Score zones (Vom to Nirvana): one monotonic ramp, faded so it sits on
  // white without shouting.
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
  border: '#E2E3E5',
  overlay: 'rgba(20, 17, 17, 0.4)',
  danger: '#C25B4D',
  success: '#7FA56F',

  // Sticker language, softened: thin ink lines, low shadows
  ink: '#1F1B1B', // outlines
  frame: '#E6CF96', // pale mustard card frames
  surface: '#FFFFFF', // button/card fill
  viewportDark: '#1B1610', // camera viewport behind the live preview
} as const;

// Illustration palette: the splash slice, the reward confetti, the confetti
// dots on the capture card. Food colors stay saturated on purpose; they are
// art, not UI chrome, so they sit outside the neutral ramp.
export const illustration = {
  crust: '#B84508',
  crustLight: '#D9530E',
  cheese: '#F6C445',
  cheesePale: '#F1E599',
  pepperoni: '#C43C24',
  basil: '#75A24E',
} as const;

export const KINGDOM_FILLS = [
  colors.kingdomSage,
  colors.kingdomPowder,
  colors.kingdomBlush,
  colors.kingdomMustard,
] as const;

// Shapes. One language for the whole app:
//
//   - Nothing has an outline, and nothing has a hard offset shadow.
//   - Buttons are solid rounded rectangles (`shape.button`). Icon-only
//     buttons are solid circles.
//   - Tabs are words: the chosen one is red with a red rule under it
//     (components/text-tabs).
//   - Containers are not drawn. Content sits on the white page, grouped by
//     space and hairlines. A grey block (`colors.bgElevated`, `shape.block`)
//     is for the rare thing that needs a surface of its own.
//   - Only things that float over other content (the log button, a panel on
//     the map, a modal) get a soft shadow: `lift`.
//
// Native surfaces (@expo/ui forms, pickers, sheets, the tab bar) stay native.
const INK_RGB = '31, 27, 27';

/** Corner radii by role. */
export const shape = {
  button: 14,
  chip: 10,
  block: 16,
  panel: 22,
} as const;

/** The one shadow, for things that float over other content. */
export const lift = {
  boxShadow: `0 8px 24px rgba(${INK_RGB}, 0.18)`,
} as const;

// `sticker` was the old outlined, hard-shadowed card style. The tokens stay
// so that every surface built on them changed at once, but they now draw
// nothing. New code should not reach for them: use `shape` and `lift`.
export const sticker = {
  border: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  shadow: { boxShadow: [] },
  shadowSm: { boxShadow: [] },
  shadowLg: { boxShadow: [] },
  shadowNone: { boxShadow: [] },
  // Press feedback: a slight squeeze and dim, in place of the old push-down.
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
} as const;

/** The ink color as RGB parts, for building shadows and tints in worklets. */
export const STICKER_SHADOW_RGB = INK_RGB;

// Sign lettering: a heavy geometric grotesque, set in capitals, like the
// fascia of a pizza shop. `display` is for headlines and big numbers,
// `label` for buttons and small capitals. Loaded in the root layout. Each
// name is one face, so never combine them with fontWeight. Body copy stays
// on the system font.
export const fonts = {
  display: 'Montserrat_900Black',
  label: 'Montserrat_800ExtraBold',
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
