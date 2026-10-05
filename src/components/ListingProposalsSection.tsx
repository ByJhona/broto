import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { OFFER_STATUS, type OfferStatus } from '@/types';
import { Avatar } from './Avatar';
import { ListRow } from './ListRow';
import { InfoSection } from './InfoSection';
import { ProposalResponseActions } from './ProposalResponseActions';

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
  pending: '#B45309',
  accepted: '#15803D',
  declined: '#BF3832',
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
              <Leaf size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
            </View>
          )}
          <Text style={styles.offeredPlantName}>{proposal.offeredPlantName}</Text>
        </View>
      </View>
      {proposal.onViewOffer ? (
        <Pressable style={styles.viewOfferButton} onPress={proposal.onViewOffer}>
          <Text style={styles.viewOfferButtonText}>{t('offer:viewOfferAction')}</Text>
          <ChevronRight size={Metrics.icon.small} color={colors.primary} strokeWidth={Metrics.icon.stroke.regular} />
        </Pressable>
      ) : null}
    </>
  );
}

type ProposalInterestActionsProps = {
  proposal: ListingProposal;
  styles: ReturnType<typeof makeStyles>;
};

function ProposalInterestActions({ proposal, styles }: Readonly<ProposalInterestActionsProps>) {
  if (proposal.status !== OFFER_STATUS.PENDING || (!proposal.onAccept && !proposal.onDecline)) return null;

  return (
    <ProposalResponseActions compact onAccept={proposal.onAccept} onDecline={proposal.onDecline} style={styles.actions} />
  );
}

export function ListingProposalsSection({
  title,
  emptyMessage,
  proposals,
  onOpenChat,
}: Readonly<ListingProposalsSectionProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['listing', 'offer', 'common']);

  return (
    <InfoSection title={title}>
      {proposals?.length ? (
        proposals.map((proposal) => (
          <View key={proposal.id} style={styles.proposal}>
            <ListRow
              leading={<Avatar name={proposal.name ?? t('common:someone')} url={proposal.avatarUrl} size={Metrics.size.md} />}
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
              <ProposalInterestActions proposal={proposal} styles={styles} />
            )}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      )}
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    emptyText: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    proposal: {
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
      padding: Metrics.spacing.md,
      marginBottom: Metrics.spacing.sm,
    },
    statusPill: {
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.chip.sm.paddingVertical,
      paddingHorizontal: Metrics.chip.sm.paddingHorizontal,
    },
    statusPillText: {
      ...Typography.captionStrong,
      color: colors.white,
    },
    offeredPlant: {
      marginTop: Metrics.spacing.sm,
    },
    offeredPlantLabel: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.xs,
    },
    offeredPlantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
    },
    offeredPlantThumb: {
      width: Metrics.size.md,
      height: Metrics.size.md,
      borderRadius: Metrics.radius.sm,
      backgroundColor: colors.muted,
    },
    offeredPlantThumbPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    offeredPlantName: {
      ...Typography.label,
      color: colors.foreground,
    },
    viewOfferButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Metrics.spacing.xs,
      marginTop: Metrics.spacing.sm,
      borderWidth: Metrics.borderWidth.md,
      borderColor: colors.primary,
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.sm,
    },
    viewOfferButtonText: {
      ...Typography.label,
      color: colors.primary,
    },
    actions: {
      marginTop: Metrics.spacing.sm,
    },
  });
