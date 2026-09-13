import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { PHOTO_UPLOAD_MAX_WIDTH, resizeImageForUpload } from './imageResize';
import { uniquePhotoFilename } from './storagePath';
import type { ListingStatus, ListingType, OfferStatus, PlantListing } from '@/types';

export const MAX_LISTING_PHOTOS = 5;

type PlantListingRow = {
  id: string;
  user_id: string;
  plant_id: string | null;
  listing_type: ListingType;
  title: string;
  description: string | null;
  photo_urls: string[];
  latitude: number;
  longitude: number;
  status: ListingStatus;
  created_at: string;
  owner: { name: string | null; username: string | null; avatar_url: string | null } | null;
};

const PLANT_LISTING_SELECT =
  'id, user_id, plant_id, listing_type, title, description, photo_urls, latitude, longitude, status, created_at, owner:profiles!user_id(name, username, avatar_url)';

function mapPlantListingRow(row: PlantListingRow): PlantListing {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    listingType: row.listing_type,
    title: row.title,
    description: row.description,
    photoUrls: row.photo_urls,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    createdAt: row.created_at,
    ownerName: row.owner?.name || row.owner?.username || null,
    ownerAvatarUrl: row.owner?.avatar_url ?? null,
  };
}

export async function getAvailableListings(): Promise<PlantListing[]> {
  const { data, error } = await supabase
    .from('plant_listings')
    .select(PLANT_LISTING_SELECT)
    .eq('status', 'available')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as unknown as PlantListingRow[]).map(mapPlantListingRow);
}

export async function getListingsByUserId(userId: string): Promise<PlantListing[]> {
  const { data, error } = await supabase
    .from('plant_listings')
    .select(PLANT_LISTING_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as unknown as PlantListingRow[]).map(mapPlantListingRow);
}

export async function getListingById(id: string): Promise<PlantListing | null> {
  const { data, error } = await supabase
    .from('plant_listings')
    .select(PLANT_LISTING_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) return null;

  return mapPlantListingRow(data as unknown as PlantListingRow);
}

async function uploadListingPhoto(userId: string, listingId: string, localUri: string): Promise<string> {
  const resizedUri = await resizeImageForUpload(localUri, PHOTO_UPLOAD_MAX_WIDTH);
  const file = new File(resizedUri);
  const bytes = await file.bytes();
  const path = `${userId}/listings/${listingId}/${uniquePhotoFilename()}`;

  const { error: uploadError } = await supabase.storage
    .from('plant-photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('plant-photos').getPublicUrl(path);

  return publicUrl;
}

export type CreateListingInput = {
  plantId?: string | null;
  listingType: ListingType;
  title: string;
  description?: string | null;
  photoUris?: string[];
  photoUrls?: string[];
  latitude: number;
  longitude: number;
};

export async function createListing(input: CreateListingInput): Promise<PlantListing> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) throw new Error('Usuário não autenticado.');

  const { data: listing, error } = await supabase
    .from('plant_listings')
    .insert({
      plant_id: input.plantId ?? null,
      listing_type: input.listingType,
      title: input.title,
      description: input.description ?? null,
      photo_urls: input.photoUrls ?? [],
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select(PLANT_LISTING_SELECT)
    .single();

  if (error) throw error;

  const row = listing as unknown as PlantListingRow;
  const photoUris = input.photoUris ?? [];

  if (photoUris.length > 0) {
    try {
      const uploadedPhotoUrls = await Promise.all(photoUris.map((uri) => uploadListingPhoto(user.id, row.id, uri)));
      const photoUrls = [...row.photo_urls, ...uploadedPhotoUrls];
      const { error: photoError } = await supabase.from('plant_listings').update({ photo_urls: photoUrls }).eq('id', row.id);
      if (photoError) throw photoError;
      row.photo_urls = photoUrls;
    } catch (photoErr) {
      await supabase.from('plant_listings').delete().eq('id', row.id);
      throw photoErr;
    }
  }

  return mapPlantListingRow(row);
}

export async function updateListingStatus(id: string, status: ListingStatus): Promise<void> {
  const { error } = await supabase.from('plant_listings').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteListing(id: string): Promise<void> {
  const { error } = await supabase
    .from('plant_listings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function expressInterest(listingId: string, message?: string | null): Promise<void> {
  const { error } = await supabase.from('plant_listing_interests').insert({ listing_id: listingId, message: message ?? null });
  if (error) throw error;
}

export type ListingInterest = {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  message: string | null;
  status: OfferStatus;
  createdAt: string;
};

type ListingInterestRow = {
  id: string;
  user_id: string;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  interested: { name: string | null; username: string | null; avatar_url: string | null } | null;
};

export async function getListingInterests(listingId: string): Promise<ListingInterest[]> {
  const { data, error } = await supabase
    .from('plant_listing_interests')
    .select('id, user_id, message, status, created_at, interested:profiles!user_id(name, username, avatar_url)')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data as unknown as ListingInterestRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.interested?.name || row.interested?.username || null,
    avatarUrl: row.interested?.avatar_url ?? null,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function respondToInterest(interestId: string, listingId: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('plant_listing_interests')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', interestId);

  if (error) throw error;

  if (accept) {
    await updateListingStatus(listingId, 'completed');
    await supabase
      .from('plant_listing_interests')
      .update({ status: 'declined' })
      .eq('listing_id', listingId)
      .eq('status', 'pending');
  }
}
