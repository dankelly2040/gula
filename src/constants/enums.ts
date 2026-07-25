export const PIZZA_STYLES = ['NY', 'Neapolitan', 'Detroit', 'Sicilian', 'Other'] as const;
export type PizzaStyle = (typeof PIZZA_STYLES)[number];

export const PIZZA_FORMATS = ['Slice', 'Whole pie'] as const;
export type PizzaFormat = (typeof PIZZA_FORMATS)[number];

export const CONTEXT_OPTIONS = ['Dine-in', 'Takeout', 'Delivery'] as const;
export type PizzaContext = (typeof CONTEXT_OPTIONS)[number];

export const PRICE_TIERS = ['$', '$$', '$$$', '$$$$'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const SEND_FRIEND_OPTIONS = ['Never', 'Sure', 'Drop everything'] as const;
export type SendFriend = (typeof SEND_FRIEND_OPTIONS)[number];

export const COMMON_TOPPINGS = [
  'Pepperoni',
  'Mushroom',
  'Sausage',
  'Basil',
  'Mozzarella',
  'Ricotta',
  'Olive',
  'Onion',
  'Pepper',
  'Jalapeño',
  'Pineapple',
  'Ham',
  'Bacon',
  'Anchovy',
  'Garlic',
  'Tomato',
  'Arugula',
  'Prosciutto',
  'Truffle',
  'Burrata',
] as const;

import { colors } from './theme';

// Zone colors live in theme.ts so they move with the palette.
export const MONEY_SHOT_ZONES = [
  { label: 'Vom', min: 0, max: 16, color: colors.zoneVom },
  { label: 'Regret', min: 17, max: 33, color: colors.zoneRegret },
  { label: 'Fine', min: 34, max: 50, color: colors.zoneFine },
  { label: 'Crave', min: 51, max: 67, color: colors.zoneCrave },
  { label: 'Bliss', min: 68, max: 84, color: colors.zoneBliss },
  { label: 'Nirvana', min: 85, max: 100, color: colors.zoneNirvana },
] as const;

export function getZoneForScore(score: number) {
  return MONEY_SHOT_ZONES.find((z) => score >= z.min && score <= z.max) ?? MONEY_SHOT_ZONES[0];
}
