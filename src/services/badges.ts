import { supabase } from './supabase';
import type { Badge, BadgeBatch, EarnedBadge, PixelArt, UserBadge } from '@/types';

type BadgeRow = {
  id: string;
  batch_id: string;
  name: string;
  description: string;
  pixel_art: PixelArt;
};

type BadgeBatchRow = {
  id: string;
  name: string;
  description: string;
  badges: BadgeRow[];
};

function mapBadgeRow(row: BadgeRow): Badge {
  return {
    id: row.id,
    batchId: row.batch_id,
    name: row.name,
    description: row.description,
    pixelArt: row.pixel_art,
  };
}

export async function getBadgeCatalog(): Promise<BadgeBatch[]> {
  const { data, error } = await supabase
    .from('badge_batches')
    .select('id, name, description, badges(id, batch_id, name, description, pixel_art)')
    .eq('is_active', true)
    .eq('badges.is_active', true)
    .order('sort_order')
    .order('sort_order', { referencedTable: 'badges' });

  if (error) {
    console.warn('Não foi possível buscar o catálogo de emblemas:', error);
    return [];
  }

  return (data as unknown as BadgeBatchRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    badges: row.badges.map(mapBadgeRow),
  }));
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_id, granted_at')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });

  if (error) {
    console.warn('Não foi possível buscar os emblemas do usuário:', error);
    return [];
  }

  return (data as { badge_id: string; granted_at: string }[]).map((row) => ({
    badgeId: row.badge_id,
    grantedAt: row.granted_at,
  }));
}

export async function checkNewlyEarnedBadge(userId: string, scientificName: string): Promise<Badge | null> {
  const { data: badgeRow, error: badgeError } = await supabase
    .from('badges')
    .select('id, batch_id, name, description, pixel_art')
    .eq('scientific_name', scientificName)
    .maybeSingle();

  if (badgeError || !badgeRow) return null;

  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)
    .eq('badge_id', badgeRow.id)
    .maybeSingle();

  if (existing) return null;

  return mapBadgeRow(badgeRow);
}

export async function getUserBadgesWithDetails(userId: string): Promise<EarnedBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('granted_at, badges(id, batch_id, name, description, pixel_art)')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });

  if (error) {
    console.warn('Não foi possível buscar os emblemas do usuário:', error);
    return [];
  }

  return (data as unknown as { granted_at: string; badges: BadgeRow }[])
    .filter((row) => row.badges)
    .map((row) => ({ ...mapBadgeRow(row.badges), grantedAt: row.granted_at }));
}
