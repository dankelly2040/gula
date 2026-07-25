import type { PizzaStyle, PizzaFormat, PizzaContext, PriceTier, SendFriend } from '../constants/enums';

export type SubScores = {
  crust: number | null; // 1-5
  charBake: number | null;
  sauceCheese: number | null;
  toppings: number | null;
  vibes: number | null;
  service: number | null;
  value: number | null;
};

export type PizzaTags = {
  style: PizzaStyle | null;
  format: PizzaFormat | null;
  toppings: string[];
  priceTier: PriceTier | null;
  context: PizzaContext | null;
};

export type PizzaLog = {
  id: string;
  userId: string;
  spotId: string | null;
  spotName: string | null;
  timestamp: string;
  photoUri: string | null; // local file, kept for instant rendering
  photoUrl: string | null; // remote URL once uploaded
  moneyShot: number; // 0-100
  pizzaScore: number | null; // 0-100 computed
  experienceScore: number | null; // 0-100 computed
  sendFriend: SendFriend | null;
  subScores: SubScores;
  tags: PizzaTags;
  notes: string;
  pointsEarned: number;
  lat: number | null;
  lng: number | null;
  isPublic: boolean;
  updatedAt: string;
};

export type Spot = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

// `symbol` is an SF Symbol name rendered via expo-symbols; `emoji` is kept
// for plain-text contexts (share messages, exports).
export const ACHIEVEMENT_DEFS = {
  first_log: { title: 'First slice', emoji: '🍕', symbol: 'star.fill', description: 'Logged your first pizza' },
  five_logs: { title: 'Regular', emoji: '🔥', symbol: 'flame.fill', description: 'Logged 5 pizzas' },
  ten_logs: { title: 'Connoisseur', emoji: '🎖️', symbol: 'medal.fill', description: 'Logged 10 pizzas' },
  twenty_five_logs: { title: 'Obsessive', emoji: '👑', symbol: 'crown.fill', description: 'Logged 25 pizzas' },
  fifty_logs: { title: 'Legend', emoji: '🏆', symbol: 'trophy.fill', description: 'Logged 50 pizzas' },
  style_explorer: { title: 'Style explorer', emoji: '🧭', symbol: 'safari.fill', description: 'Logged 3 different styles' },
  streak_3: { title: 'On a roll', emoji: '⚡', symbol: 'bolt.fill', description: '3-week logging streak' },
  nirvana: { title: 'Nirvana', emoji: '✨', symbol: 'sparkles', description: 'Scored a pizza 85 or higher' },
} as const;

export type AchievementType = keyof typeof ACHIEVEMENT_DEFS;

export type Achievement = {
  id: string;
  userId: string;
  type: AchievementType;
  earnedAt: string;
};

export type UserProfile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  favoriteStyle: PizzaStyle | null;
  homeCity: string | null;
  totalPoints: number;
  totalLogs: number;
  currentStreak: number;
  shareWithCommunity: boolean;
};

export function computePizzaScore(sub: SubScores): number | null {
  const vals = [sub.crust, sub.charBake, sub.sauceCheese, sub.toppings].filter(
    (v): v is number => v !== null
  );
  if (vals.length === 0) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((avg / 5) * 100);
}

export function computeExperienceScore(sub: SubScores): number | null {
  const vals = [sub.vibes, sub.service, sub.value].filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((avg / 5) * 100);
}
