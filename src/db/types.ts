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
  photoUri: string | null;
  moneyShot: number; // 0-100
  pizzaScore: number | null; // 0-100 computed
  experienceScore: number | null; // 0-100 computed
  sendFriend: SendFriend | null;
  subScores: SubScores;
  tags: PizzaTags;
  notes: string;
  pointsEarned: number;
};

export type Spot = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

export type Achievement = {
  id: string;
  userId: string;
  type: string;
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
