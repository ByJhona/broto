import { getCurrentUserId, supabase } from './supabase';
import type { PlantGroup } from '@/types';

const GROUP_PREVIEW_LIMIT = 4;

type PlantGroupRow = {
  id: string;
  name: string;
  created_at: string;
};

type GroupedPlantRow = {
  group_id: string;
  photo_urls: string[];
};

export async function getPlantGroups(): Promise<PlantGroup[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const [{ data: groups, error: groupsError }, { data: plants, error: plantsError }] = await Promise.all([
    supabase
      .from('plant_groups')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('plants')
      .select('group_id, photo_urls')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('group_id', 'is', null)
      .order('created_at', { ascending: true }),
  ]);

  if (groupsError) throw groupsError;
  if (plantsError) throw plantsError;

  const groupedPlants = plants as GroupedPlantRow[];

  return (groups as PlantGroupRow[]).map((group) => {
    const plantsInGroup = groupedPlants.filter((plant) => plant.group_id === group.id);
    return {
      id: group.id,
      name: group.name,
      createdAt: group.created_at,
      plantCount: plantsInGroup.length,
      previewPhotoUrls: plantsInGroup
        .map((plant) => plant.photo_urls[0])
        .filter((url): url is string => !!url)
        .slice(0, GROUP_PREVIEW_LIMIT),
    };
  });
}

export async function createPlantGroup(name: string): Promise<PlantGroup> {
  const { data, error } = await supabase.from('plant_groups').insert({ name }).select('id, name, created_at').single();
  if (error) throw error;

  const row = data as PlantGroupRow;
  return { id: row.id, name: row.name, createdAt: row.created_at, plantCount: 0, previewPhotoUrls: [] };
}

export async function renamePlantGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('plant_groups').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deletePlantGroup(id: string): Promise<void> {
  const { error } = await supabase.from('plant_groups').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
