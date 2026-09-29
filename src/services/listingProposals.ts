import type { QueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { getHiddenBefore } from './chat';
import { updateListingStatus } from './plantListings';
import { supabase } from './supabase';
import {
  LISTING_STATUS,
  OFFER_STATUS,
  type OfferStatus,
  type Plant,
  type Proposal,
  type ProposalType,
} from '@/types';
import { patchInList, upsertInList } from '@/utils/queryListCache';

const PROPOSAL_SELECT =
  'id, listing_id, sender_id, recipient_id, proposal_type, offered_plant_id, status, created_at, responded_at, listing:plant_listings(title, photo_urls), offered_plant:plants(name, photo_urls)';

type ProposalRow = {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  proposal_type: ProposalType;
  offered_plant_id: string | null;
  status: OfferStatus;
  created_at: string;
  responded_at: string | null;
  listing: { title: string; photo_urls: string[] } | null;
  offered_plant: { name: string; photo_urls: string[] } | null;
};

function mapProposalRow(row: ProposalRow): Proposal {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing?.title ?? null,
    listingPhotoUrl: row.listing?.photo_urls[0] ?? null,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    proposalType: row.proposal_type,
    offeredPlantId: row.offered_plant_id,
    offeredPlantName: row.offered_plant?.name ?? null,
    offeredPlantPhotoUrl: row.offered_plant?.photo_urls[0] ?? null,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

export function mergeProposal(existing: Proposal, incoming: Proposal): Proposal {
  return {
    ...incoming,
    listingTitle: incoming.listingTitle ?? existing.listingTitle,
    listingPhotoUrl: incoming.listingPhotoUrl ?? existing.listingPhotoUrl,
    offeredPlantName: incoming.offeredPlantName ?? existing.offeredPlantName,
    offeredPlantPhotoUrl: incoming.offeredPlantPhotoUrl ?? existing.offeredPlantPhotoUrl,
  };
}

export async function sendOfferProposal(input: { recipientId: string; listingId: string; offeredPlantId: string }): Promise<Proposal> {
  const { data, error } = await supabase
    .from('plant_listing_proposals')
    .insert({
      recipient_id: input.recipientId,
      listing_id: input.listingId,
      offered_plant_id: input.offeredPlantId,
      proposal_type: 'offer',
    })
    .select(PROPOSAL_SELECT)
    .single();

  if (error) throw error;
  return mapProposalRow(data as unknown as ProposalRow);
}

export async function sendInterestProposal(input: { recipientId: string; listingId: string }): Promise<Proposal> {
  const { data, error } = await supabase
    .from('plant_listing_proposals')
    .insert({ recipient_id: input.recipientId, listing_id: input.listingId, proposal_type: 'interest' })
    .select(PROPOSAL_SELECT)
    .single();

  if (error) throw error;
  return mapProposalRow(data as unknown as ProposalRow);
}

export async function respondToProposal(proposalId: string, accept: boolean): Promise<Proposal> {
  const { data, error } = await supabase
    .from('plant_listing_proposals')
    .update({ status: accept ? OFFER_STATUS.ACCEPTED : OFFER_STATUS.DECLINED })
    .eq('id', proposalId)
    .select(PROPOSAL_SELECT)
    .single();

  if (error) throw error;

  const proposal = mapProposalRow(data as unknown as ProposalRow);

  if (accept) {
    await updateListingStatus(proposal.listingId, LISTING_STATUS.COMPLETED);
    await supabase
      .from('plant_listing_proposals')
      .update({ status: OFFER_STATUS.DECLINED })
      .eq('listing_id', proposal.listingId)
      .eq('proposal_type', proposal.proposalType)
      .eq('status', OFFER_STATUS.PENDING);
  }

  return proposal;
}

export async function hasSentProposal(listingId: string, userId: string, proposalType: ProposalType): Promise<boolean> {
  const { data, error } = await supabase
    .from('plant_listing_proposals')
    .select('id')
    .eq('listing_id', listingId)
    .eq('sender_id', userId)
    .eq('proposal_type', proposalType)
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export type ListingProposalSummary = {
  id: string;
  senderId: string;
  senderName: string | null;
  senderAvatarUrl: string | null;
  offeredPlantName: string | null;
  offeredPlantPhotoUrl: string | null;
  status: OfferStatus;
  createdAt: string;
};

type ListingProposalSummaryRow = {
  id: string;
  sender_id: string;
  status: OfferStatus;
  created_at: string;
  sender: { name: string | null; username: string | null; avatar_url: string | null } | null;
  offered_plant: { name: string; photo_urls: string[] } | null;
};

export async function getListingProposals(listingId: string, proposalType: ProposalType): Promise<ListingProposalSummary[]> {
  const { data, error } = await supabase
    .from('plant_listing_proposals')
    .select(
      'id, sender_id, status, created_at, sender:profiles!sender_id(name, username, avatar_url), offered_plant:plants(name, photo_urls)'
    )
    .eq('listing_id', listingId)
    .eq('proposal_type', proposalType)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data as unknown as ListingProposalSummaryRow[]).map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender?.name || row.sender?.username || null,
    senderAvatarUrl: row.sender?.avatar_url ?? null,
    offeredPlantName: row.offered_plant?.name ?? null,
    offeredPlantPhotoUrl: row.offered_plant?.photo_urls[0] ?? null,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getProposalsWithUser(otherUserId: string): Promise<Proposal[]> {
  const hiddenBefore = await getHiddenBefore(otherUserId);

  let query = supabase
    .from('plant_listing_proposals')
    .select(PROPOSAL_SELECT)
    .or(`sender_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`)
    .order('created_at', { ascending: true });

  if (hiddenBefore) {
    query = query.gt('created_at', hiddenBefore);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as unknown as ProposalRow[]).map(mapProposalRow);
}

export function subscribeToProposalsWithUser(otherUserId: string, onChange: (proposal: Proposal) => void): () => void {
  const channel = supabase
    .channel(`chat-proposals:${otherUserId}:${randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'plant_listing_proposals', filter: `sender_id=eq.${otherUserId}` },
      (payload) => onChange(mapProposalRow(payload.new as ProposalRow))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'plant_listing_proposals', filter: `recipient_id=eq.${otherUserId}` },
      (payload) => onChange(mapProposalRow(payload.new as ProposalRow))
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToOwnProposals(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`own-proposals:${userId}:${randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'plant_listing_proposals', filter: `sender_id=eq.${userId}` }, onChange)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'plant_listing_proposals', filter: `recipient_id=eq.${userId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export type OfferedPlantDetail = Pick<Plant, 'id' | 'name' | 'species' | 'commonName' | 'photoUrls' | 'wateringDays'>;

export type ProposalDetail = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  senderId: string;
  senderName: string | null;
  senderAvatarUrl: string | null;
  recipientId: string;
  status: OfferStatus;
  createdAt: string;
  offeredPlant: OfferedPlantDetail | null;
};

const PROPOSAL_DETAIL_SELECT =
  'id, listing_id, sender_id, recipient_id, status, created_at, listing:plant_listings(title), sender:profiles!sender_id(name, username, avatar_url), offered_plant:plants(id, name, species, common_name, photo_urls, watering_days)';

type OfferedPlantDetailRow = {
  id: string;
  name: string;
  species: string | null;
  common_name: string | null;
  photo_urls: string[];
  watering_days: number | null;
};

type ProposalDetailRow = {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  status: OfferStatus;
  created_at: string;
  listing: { title: string } | null;
  sender: { name: string | null; username: string | null; avatar_url: string | null } | null;
  offered_plant: OfferedPlantDetailRow | null;
};

function mapOfferedPlantDetail(row: OfferedPlantDetailRow): OfferedPlantDetail {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    commonName: row.common_name,
    photoUrls: row.photo_urls,
    wateringDays: row.watering_days,
  };
}

export async function getProposalById(id: string): Promise<ProposalDetail | null> {
  const { data, error } = await supabase.from('plant_listing_proposals').select(PROPOSAL_DETAIL_SELECT).eq('id', id).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as ProposalDetailRow;
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing?.title ?? null,
    senderId: row.sender_id,
    senderName: row.sender?.name || row.sender?.username || null,
    senderAvatarUrl: row.sender?.avatar_url ?? null,
    recipientId: row.recipient_id,
    status: row.status,
    createdAt: row.created_at,
    offeredPlant: row.offered_plant ? mapOfferedPlantDetail(row.offered_plant) : null,
  };
}

export function applyProposalStatusEverywhere(queryClient: QueryClient, proposal: Proposal, currentUserId: string | undefined) {
  const otherUserId = proposal.senderId === currentUserId ? proposal.recipientId : proposal.senderId;
  if (otherUserId) {
    queryClient.setQueryData<Proposal[]>(['chat-proposals', otherUserId], (current = []) =>
      upsertInList(current, proposal, { merge: mergeProposal })
    );
  }
  queryClient.setQueriesData<ListingProposalSummary[]>({ queryKey: ['plant-listing-proposals', proposal.listingId] }, (old) =>
    old ? patchInList(old, proposal.id, (item) => ({ ...item, status: proposal.status })) : old
  );
  queryClient.setQueryData<ProposalDetail>(['proposal-detail', proposal.id], (current) =>
    current ? { ...current, status: proposal.status } : current
  );
}
