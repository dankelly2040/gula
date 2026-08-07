import { supabase } from '../lib/supabase';
import type { Achievement, AchievementType, PizzaLog, Spot, UserProfile } from './types';

// Row mappers: snake_case Postgres rows ↔ camelCase app types.

type LogRow = {
  id: string;
  user_id: string;
  spot_id: string | null;
  spot_name: string | null;
  logged_at: string;
  photo_url: string | null;
  money_shot: number;
  pizza_score: number | null;
  experience_score: number | null;
  send_friend: string | null;
  sub_scores: PizzaLog['subScores'];
  tags: PizzaLog['tags'];
  notes: string;
  points_earned: number;
  lat: number | null;
  lng: number | null;
  is_public: boolean;
  updated_at: string;
};

function rowToLog(row: LogRow): PizzaLog {
  return {
    id: row.id,
    userId: row.user_id,
    spotId: row.spot_id,
    spotName: row.spot_name,
    timestamp: row.logged_at,
    photoUri: null,
    photoUrl: row.photo_url,
    moneyShot: row.money_shot,
    pizzaScore: row.pizza_score,
    experienceScore: row.experience_score,
    sendFriend: row.send_friend as PizzaLog['sendFriend'],
    subScores: row.sub_scores,
    tags: row.tags,
    notes: row.notes,
    pointsEarned: row.points_earned,
    lat: row.lat,
    lng: row.lng,
    isPublic: row.is_public,
    updatedAt: row.updated_at,
  };
}

function logToRow(log: PizzaLog): Omit<LogRow, 'photo_url'> & { photo_url: string | null } {
  return {
    id: log.id,
    user_id: log.userId,
    spot_id: log.spotId,
    spot_name: log.spotName,
    logged_at: log.timestamp,
    photo_url: log.photoUrl,
    money_shot: log.moneyShot,
    pizza_score: log.pizzaScore,
    experience_score: log.experienceScore,
    send_friend: log.sendFriend,
    sub_scores: log.subScores,
    tags: log.tags,
    notes: log.notes,
    points_earned: log.pointsEarned,
    lat: log.lat,
    lng: log.lng,
    is_public: log.isPublic,
    updated_at: log.updatedAt,
  };
}

export async function fetchRemoteLogs(userId: string): Promise<PizzaLog[]> {
  const { data, error } = await supabase
    .from('pizza_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as LogRow[]).map(rowToLog);
}

export async function upsertRemoteLog(log: PizzaLog): Promise<void> {
  const { error } = await supabase.from('pizza_logs').upsert(logToRow(log));
  if (error) throw new Error(error.message);
}

export async function deleteRemoteLog(id: string): Promise<void> {
  const { error } = await supabase.from('pizza_logs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── profiles ────────────────────────────────────────────────────────────────

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  favorite_style: string | null;
  home_city: string | null;
  total_points: number;
  total_logs: number;
  current_streak: number;
  share_with_community: boolean;
};

export async function fetchRemoteProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as ProfileRow;
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    favoriteStyle: row.favorite_style as UserProfile['favoriteStyle'],
    homeCity: row.home_city,
    totalPoints: row.total_points,
    totalLogs: row.total_logs,
    currentStreak: row.current_streak,
    shareWithCommunity: row.share_with_community,
  };
}

export async function upsertRemoteProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: profile.id,
    display_name: profile.displayName,
    avatar_url: profile.avatarUrl,
    favorite_style: profile.favoriteStyle,
    home_city: profile.homeCity,
    total_points: profile.totalPoints,
    total_logs: profile.totalLogs,
    current_streak: profile.currentStreak,
    share_with_community: profile.shareWithCommunity,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

// ── spots ───────────────────────────────────────────────────────────────────

type SpotRow = { id: string; name: string; address: string | null; lat: number | null; lng: number | null };

export async function searchRemoteSpots(query: string): Promise<Spot[]> {
  const { data, error } = await supabase
    .from('spots')
    .select('id, name, address, lat, lng')
    .ilike('name', `%${query}%`)
    .limit(15);
  if (error) throw new Error(error.message);
  return data as SpotRow[];
}

/**
 * Dedupe-aware create (brief §7): reuse an existing spot when the normalized
 * name matches and it is within ~250 m (or neither has coordinates).
 */
export async function findOrCreateRemoteSpot(
  spot: Omit<Spot, 'id'>,
  createdBy: string
): Promise<Spot> {
  const normalized = spot.name.trim().toLowerCase();
  const { data: existing, error: findError } = await supabase
    .from('spots')
    .select('id, name, address, lat, lng')
    .eq('normalized_name', normalized);
  if (findError) throw new Error(findError.message);
  const match = (existing as SpotRow[]).find((s) => {
    if (s.lat == null || spot.lat == null || s.lng == null || spot.lng == null) return true;
    const dLat = (s.lat - spot.lat) * 111_000;
    const dLng = (s.lng - spot.lng) * 111_000 * Math.cos((spot.lat * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) < 250;
  });
  if (match) return match;

  const { data, error } = await supabase
    .from('spots')
    .insert({ name: spot.name.trim(), address: spot.address, lat: spot.lat, lng: spot.lng, created_by: createdBy })
    .select('id, name, address, lat, lng')
    .single();
  if (error) throw new Error(error.message);
  return data as SpotRow;
}

export async function upsertRemoteSpot(spot: Spot, createdBy: string): Promise<void> {
  const { error } = await supabase
    .from('spots')
    .upsert({ id: spot.id, name: spot.name, address: spot.address, lat: spot.lat, lng: spot.lng, created_by: createdBy });
  if (error) throw new Error(error.message);
}

export async function fetchNearbySpots(lat: number, lng: number, radiusKm = 15): Promise<Spot[]> {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const { data, error } = await supabase
    .from('spots')
    .select('id, name, address, lat, lng')
    .gte('lat', lat - dLat)
    .lte('lat', lat + dLat)
    .gte('lng', lng - dLng)
    .lte('lng', lng + dLng)
    .limit(50);
  if (error) throw new Error(error.message);
  return data as SpotRow[];
}

// ── discover ────────────────────────────────────────────────────────────────

export async function fetchNearbyPublicLogs(lat: number, lng: number, radiusKm = 15): Promise<PizzaLog[]> {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const { data, error } = await supabase
    .from('pizza_logs')
    .select('*')
    .eq('is_public', true)
    .gte('lat', lat - dLat)
    .lte('lat', lat + dLat)
    .gte('lng', lng - dLng)
    .lte('lng', lng + dLng)
    .order('logged_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as LogRow[]).map(rowToLog);
}

// ── leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  logs: number;
};

type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  logs: number;
};

function rowToEntry(row: LeaderboardRow): LeaderboardEntry {
  return {
    rank: row.rank,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    points: row.points,
    logs: row.logs,
  };
}

export async function fetchAllTimeLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('leaderboard_all_time', { limit_count: limit });
  if (error) throw new Error(error.message);
  return (data as LeaderboardRow[]).map(rowToEntry);
}

/**
 * Ranked points for a time window. Callers pass local boundaries so the board
 * agrees with the active-days calendar, which is keyed on local dates.
 */
export async function fetchRangeLeaderboard(
  start: Date,
  end: Date,
  limit = 100
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('leaderboard_range', {
    range_start: start.toISOString(),
    range_end: end.toISOString(),
    limit_count: limit,
  });
  if (error) throw new Error(error.message);
  return (data as LeaderboardRow[]).map(rowToEntry);
}

// ── achievements ────────────────────────────────────────────────────────────

export async function upsertRemoteAchievement(a: Achievement): Promise<void> {
  const { error } = await supabase
    .from('achievements')
    .upsert(
      { id: a.id, user_id: a.userId, type: a.type, earned_at: a.earnedAt },
      { onConflict: 'user_id,type', ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
}

export async function fetchRemoteAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await supabase.from('achievements').select('*').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data as { id: string; user_id: string; type: string; earned_at: string }[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type as AchievementType,
    earnedAt: r.earned_at,
  }));
}
