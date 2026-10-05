import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleX from 'lucide-react-native/icons/circle-x';
import Clock from 'lucide-react-native/icons/clock';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { OFFER_STATUS, type OfferStatus, type Proposal } from '@/types';
import { formatTime } from '@/utils';
import { Card } from '../Card';
import { InfoChip } from '../InfoChip';
import { OutlineButton } from '../OutlineButton';
import { SubmitButton } from '../SubmitButton';

type ProposalEventCardProps = {
  proposal: Proposal;
  isMine: boolean;
  onRespond: (proposalId: string, accept: boolean) => Promise<void>;
  onViewOffer: (proposalId: string) => void;
  onOpenListing: (listingId: string) => void;
};

const STATUS_ICON: Record<OfferStatus, LucideIcon> = {
  [OFFER_STATUS.PENDING]: Clock,
  [OFFER_STATUS.ACCEPTED]: CircleCheck,
  [OFFER_STATUS.DECLINED]: CircleX,
};

const STATUS_LABEL_KEY: Record<OfferStatus, string> = {
  [OFFER_STATUS.PENDING]: 'offerStatusPending',
  [OFFER_STATUS.ACCEPTED]: 'offerStatusAccepted',
  [OFFER_STATUS.DECLINED]: 'offerStatusDeclined',
};

function ProposalStatusChip({ status }: Readonly<{ status: OfferStatus }>) {
  const colors = useColors();
  const { t } = useTranslation('chat');
  const tint: Record<OfferStatus, string> = {
    [OFFER_STATUS.PENDING]: colors.mutedForeground,
    [OFFER_STATUS.ACCEPTED]: colors.leaf,
    [OFFER_STATUS.DECLINED]: colors.destructive,
  };
  return <InfoChip size="sm" icon={STATUS_ICON[status]} value={t(STATUS_LABEL_KEY[status])} tintColor={tint[status]} />;
}

type ProposalActionsProps = Omit<ProposalEventCardProps, 'onOpenListing'>;

function ProposalActions({ proposal, isMine, onRespond, onViewOffer }: Readonly<ProposalActionsProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['chat', 'offer']);
  const [isResponding, setIsResponding] = useState(false);
  const isPending = proposal.status === OFFER_STATUS.PENDING;

  const respond = async (accept: boolean) => {
    setIsResponding(true);
    await onRespond(proposal.id, accept);
    setIsResponding(false);
  };

  if (isPending && proposal.proposalType === 'offer') {
    return <OutlineButton label={t('offer:viewOfferAction')} icon={ArrowLeftRight} onPress={() => onViewOffer(proposal.id)} />;
  }

  if (!isPending || isMine) {
    return (
      <View style={styles.status}>
        <ProposalStatusChip status={proposal.status} />
      </View>
    );
  }

  return (
    <View style={styles.actions}>
      <SubmitButton label={t('acceptButton')} onPress={() => respond(true)} loading={isResponding} />
      <OutlineButton label={t('declineButton')} icon={CircleX} onPress={() => respond(false)} disabled={isResponding} />
    </View>
  );
}

export function ProposalEventCard({ proposal, isMine, onRespond, onViewOffer, onOpenListing }: Readonly<ProposalEventCardProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('chat');
  const isOffer = proposal.proposalType === 'offer';

  return (
    <Card style={styles.card} onPress={() => onOpenListing(proposal.listingId)}>
      <View style={styles.header}>
        {proposal.listingPhotoUrl ? (
          <Image source={{ uri: proposal.listingPhotoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Leaf size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>
            {isOffer ? t('offerCardTitle') : t('interestCardTitle')} · {formatTime(new Date(proposal.createdAt))}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {proposal.listingTitle}
          </Text>
          {isOffer && proposal.offeredPlantName ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {t('offerCardPlant', { plantName: proposal.offeredPlantName })}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
      </View>

      <ProposalActions proposal={proposal} isMine={isMine} onRespond={onRespond} onViewOffer={onViewOffer} />
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      gap: Metrics.spacing.md,
      marginVertical: Metrics.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    photo: {
      width: Metrics.size.xxl,
      height: Metrics.size.xxl,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    photoPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      flex: 1,
      gap: Metrics.spacing.xs,
    },
    eyebrow: {
      ...Typography.captionStrong,
      color: colors.leaf,
    },
    title: {
      ...Typography.heading,
      color: colors.foreground,
    },
    subtitle: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    status: {
      flexDirection: 'row',
    },
    actions: {
      gap: Metrics.spacing.sm,
    },
  });
