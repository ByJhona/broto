import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/i18n';
import { useAuth, useEvents, useListings } from '@/hooks';
import { createPost } from '@/services';
import type { ListingType } from '@/types';
import { listingShareVerb, Toast } from '@/utils';
import { parsePhotoList, resolvePlacingKind, type PlacingParams } from './placement';
import type { Coordinates } from './useHomeLocation';

type Translate = (key: string, options?: Record<string, unknown>) => string;
type AddEvent = ReturnType<typeof useEvents>['addEvent'];
type AddListing = ReturnType<typeof useListings>['addListing'];
type EventDraft = PlacingParams & { title: string; eventDate: string };
type ListingDraft = PlacingParams & { title: string; listingType: ListingType };

type PublishContext = {
  t: Translate;
  userId: string | null;
  mapCenter: Coordinates;
  photoUrls: string[];
  photoUris: string[];
};

function isEventDraft(params: PlacingParams): params is EventDraft {
  return !!params.title && !!params.eventDate;
}

function isListingDraft(params: PlacingParams): params is ListingDraft {
  return !!params.title && !!params.listingType;
}

function shouldShareToCommunity(draft: PlacingParams, userId: string | null): userId is string {
  return draft.shareToCommunity === '1' && userId !== null;
}

async function shareOrWarn(share: () => Promise<unknown>, errorMessage: string) {
  try {
    await share();
  } catch {
    Toast.error(errorMessage);
  }
}

async function publishEventDraft(draft: EventDraft, addEvent: AddEvent, context: PublishContext) {
  const { t, userId, mapCenter } = context;
  const newEvent = await addEvent({
    title: draft.title,
    description: draft.description || null,
    eventDate: draft.eventDate,
    photoUri: context.photoUris[0] ?? null,
    latitude: mapCenter.latitude,
    longitude: mapCenter.longitude,
  });

  if (shouldShareToCommunity(draft, userId)) {
    const caption = draft.communityCaption || t('eventCommunityCaptionFallback', { title: draft.title });
    const photoUrls = newEvent.photoUrl ? [newEvent.photoUrl] : [];
    await shareOrWarn(
      () => createPost(userId, caption, [], null, photoUrls, null, newEvent.id),
      t('eventPublishedShareError')
    );
  }

  Toast.success(t('eventPublishSuccess'));
}

async function publishListingDraft(draft: ListingDraft, addListing: AddListing, context: PublishContext) {
  const { t, userId, mapCenter } = context;
  const newListing = await addListing({
    listingType: draft.listingType,
    plantId: draft.plantId || null,
    title: draft.title,
    description: draft.description || null,
    photoUrls: context.photoUrls,
    photoUris: context.photoUris,
    priceCents: draft.priceCents ? Number(draft.priceCents) : null,
    latitude: mapCenter.latitude,
    longitude: mapCenter.longitude,
  });

  if (shouldShareToCommunity(draft, userId)) {
    const caption = draft.communityCaption || `${listingShareVerb(draft.listingType)} "${draft.title}"!`;
    await shareOrWarn(
      () => createPost(userId, caption, [], null, newListing.photoUrls, newListing.id),
      t('listingPublishedShareError')
    );
  }

  Toast.success(t('listingPublishSuccess'));
}

export function usePlacementPublishing(params: PlacingParams, mapCenter: Coordinates) {
  const router = useRouter();
  const { t } = useTranslation('home');
  const { user } = useAuth();
  const { addListing } = useListings();
  const { addEvent } = useEvents();
  const [isPublishing, setIsPublishing] = useState(false);

  const runPublish = async (publish: () => Promise<void>, errorKey: string) => {
    setIsPublishing(true);
    try {
      await publish();
      router.replace('/(tabs)');
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : t(errorKey));
    } finally {
      setIsPublishing(false);
    }
  };

  const confirmPlacing = () => {
    const context: PublishContext = {
      t,
      userId: user?.id ?? null,
      mapCenter,
      photoUrls: parsePhotoList(params.photoUrls),
      photoUris: parsePhotoList(params.photoUris),
    };

    if (resolvePlacingKind(params) === 'event') {
      if (isEventDraft(params)) runPublish(() => publishEventDraft(params, addEvent, context), 'eventPublishError');
      return;
    }
    if (isListingDraft(params)) runPublish(() => publishListingDraft(params, addListing, context), 'listingPublishError');
  };

  return { isPublishing, confirmPlacing };
}
