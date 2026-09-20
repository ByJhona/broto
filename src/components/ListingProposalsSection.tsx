import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { OFFER_STATUS, type OfferStatus } from '@/types';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { SectionTitle } from './SectionTitle';

export type ListingProposal = {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  offeredPlantName?: string | null;
  offeredPlantPhotoUrl?: string | null;
  status: OfferStatus;
  onAccept?: () => void;
  onDecline?: () => void;
  onViewOffer?: () => void;
};

const STATUS_LABEL_KEY: Record<OfferStatus, string> = {
  pending: 'proposalStatusPending',
  accepted: 'proposalStatusAccepted',
  declined: 'proposalStatusDeclined',
};

const STATUS_COLOR: Record<OfferStatus, string> = {
  pending: '#F59E0B',
  accepted: '#22C55E',
  declined: '#D03D37',
};

type ListingProposalsSectionProps = {
  title: string;
  emptyMessage: string;
  proposals: ListingProposal[] | undefined;
  onOpenChat: (userId: string) => void;
};

type ProposalOfferedPlantProps = {
  proposal: ListingProposal;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  t: (key: string) => string;
};

function ProposalOfferedPlant({ proposal, colors, styles, t }: Readonly<ProposalOfferedPlantProps>) {
  return (
    <>
      <View style={styles.offeredPlant}>
        <Text style={styles.offeredPlantLabel}>{t('offeredPlantLabel')}</Text>
        <View style={styles.offeredPlantRow}>
          {proposal.offeredPlantPhotoUrl ? (
            <Image source={{ uri: proposal.offeredPlantPhotoUrl }} style={styles.offeredPlantThumb} />
          ) : (
            <View style={[styles.offeredPlantThumb, styles.offeredPlantThumbPlaceholder]}>
              <Leaf size={16} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
            </View>
          )}
          <Text style={styles.offeredPlantName}>{proposal.offeredPlantName}</Text>
        </View>
      </View>
      {proposal.onViewOffer ? (
        <Pressable style={styles.viewOfferButton} onPress={proposal.onViewOffer}>
          <Text style={styles.viewOfferButtonText}>{t('offer:viewOfferAction')}</Text>
          <ChevronRight size={16} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>
      ) : null}
    </>
  );
}

type ProposalInterestActionsProps = {
  proposal: ListingProposal;
  styles: ReturnType<typeof makeStyles>;
  t: (key: string) => string;
};

function ProposalInterestActions({ proposal, styles, t }: Readonly<ProposalInterestActionsProps>) {
  if (proposal.status !== OFFER_STATUS.PENDING || (!proposal.onAccept && !proposal.onDecline)) return null;

  return (
    <View style={styles.actions}>
      <Pressable style={styles.declineButton} onPress={proposal.onDecline}>
        <Text style={styles.declineButtonText}>{t('declineAction')}</Text>
      </Pressable>
      <Pressable style={styles.acceptButton} onPress={proposal.onAccept}>
        <Text style={styles.acceptButtonText}>{t('acceptAction')}</Text>
      </Pressable>
    </View>
  );
}

export function ListingProposalsSection({
  title,
  emptyMessage,
  proposals,
  onOpenChat,
}: Readonly<ListingProposalsSectionProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation(['listing', 'offer', 'common']);

  return (
    <Card style={styles.section}>
      <SectionTitle>{title}</SectionTitle>
      {proposals?.length ? (
        proposals.map((proposal) => (
          <View key={proposal.id} style={styles.proposal}>
            <ListRow
              leading={<Avatar name={proposal.name ?? t('common:someone')} url={proposal.avatarUrl} size={40} />}
              title={proposal.name ?? t('common:someone')}
              trailing={
                <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[proposal.status] }]}>
                  <Text style={styles.statusPillText}>{t(STATUS_LABEL_KEY[proposal.status])}</Text>
                </View>
              }
              onPress={() => onOpenChat(proposal.userId)}
            />
            {proposal.offeredPlantName ? (
              <ProposalOfferedPlant proposal={proposal} colors={colors} styles={styles} t={t} />
            ) : (
              <ProposalInterestActions proposal={proposal} styles={styles} t={t} />
            )}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      )}
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    emptyText: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.foreground,
    },
    proposal: {
      paddingVertical: Metrics.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statusPill: {
      borderRadius: Metrics.radius.full,
      paddingVertical: 4,
      paddingHorizontal: Metrics.spacing.sm,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
    offeredPlant: {
      marginTop: Metrics.spacing.sm,
    },
    offeredPlantLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.xs,
    },
    offeredPlantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    offeredPlantThumb: {
      width: 36,
      height: 36,
      borderRadius: Metrics.radius.sm,
      backgroundColor: colors.muted,
    },
    offeredPlantThumbPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    offeredPlantName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    viewOfferButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      marginTop: Metrics.spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.sm,
    },
    viewOfferButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    actions: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
      marginTop: Metrics.spacing.sm,
    },
    declineButton: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.destructive,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.sm,
      alignItems: 'center',
    },
    declineButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.destructive,
    },
    acceptButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: Metrics.radius.md,
      paddingVertical: Metrics.spacing.sm,
      alignItems: 'center',
    },
    acceptButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryForeground,
    },
  });
