import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Flower2 from 'lucide-react-native/icons/flower-2';
import Gem from 'lucide-react-native/icons/gem';
import Leaf from 'lucide-react-native/icons/leaf';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Sprout from 'lucide-react-native/icons/sprout';
import Trees from 'lucide-react-native/icons/trees';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { findStorePackage, type CreditPack } from '@/services';
import { GRID_GAP, useGridCardWidth } from '../gridLayout';
import { IconBadge } from '../IconBadge';
import { InfoChip } from '../InfoChip';
import { SubmitButton } from '../SubmitButton';
import { bestValuePackId, cheapestPackId, pricePerCredit, type StoreOfferings } from './storePricing';

const PACK_ICONS: Record<string, LucideIcon> = {
  credits_30: Sprout,
  credits_80: Leaf,
  credits_200: Trees,
  credits_500: Flower2,
};

type CreditPackPickerProps = {
  packs: CreditPack[];
  offerings: StoreOfferings;
  purchasingId: string | null;
  onBuy: (packId: string) => void;
};

type PackTileProps = {
  pack: CreditPack;
  offerings: StoreOfferings;
  isSelected: boolean;
  isBestValue: boolean;
  width: number;
  onSelect: () => void;
};

function PackTile({ pack, offerings, isSelected, isBestValue, width, onSelect }: Readonly<PackTileProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('credits');
  const pkg = findStorePackage(offerings, pack.id);
  const Icon = PACK_ICONS[pack.id] ?? Gem;

  return (
    <Pressable
      style={[styles.tile, { width }, isSelected && styles.tileSelected]}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.tileTop}>
        <IconBadge backgroundColor={isSelected ? colors.leaf : colors.muted}>
          <Icon size={Metrics.icon.small} color={isSelected ? colors.leafForeground : colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
        </IconBadge>
      </View>
      <Text style={styles.credits}>{t('packCredits', { count: pack.credits })}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {pack.name}
      </Text>
      <Text style={styles.price}>{pkg?.product.priceString ?? t('comingSoon')}</Text>
      {pkg ? <Text style={styles.unitPrice}>{t('pricePerCredit', { price: pricePerCredit(pkg, pack.credits) })}</Text> : null}
      {isBestValue ? (
        <View style={styles.badge}>
          <InfoChip size="sm" icon={Sparkles} value={t('bestValue')} tintColor={colors.primary} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function CreditPackPicker({ packs, offerings, purchasingId, onBuy }: Readonly<CreditPackPickerProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('credits');
  const tileWidth = useGridCardWidth();
  const bestValueId = bestValuePackId(packs, offerings);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selectedId = pickedId ?? cheapestPackId(packs, offerings);
  const selectedPack = packs.find((pack) => pack.id === selectedId) ?? packs[0];
  const selectedPrice = findStorePackage(offerings, selectedPack.id)?.product.priceString ?? t('comingSoon');

  return (
    <View style={styles.picker}>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {packs.map((pack) => (
          <PackTile
            key={pack.id}
            pack={pack}
            offerings={offerings}
            isSelected={pack.id === selectedPack.id}
            isBestValue={pack.id === bestValueId}
            width={tileWidth}
            onSelect={() => setPickedId(pack.id)}
          />
        ))}
      </View>
      <SubmitButton
        label={t('buyPack', { count: selectedPack.credits, price: selectedPrice })}
        onPress={() => onBuy(selectedPack.id)}
        loading={purchasingId === selectedPack.id}
        disabled={!!purchasingId}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    picker: {
      gap: Metrics.spacing.sm,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP,
    },
    tile: {
      gap: Metrics.spacing.xs,
      padding: Metrics.spacing.md,
      borderRadius: Metrics.radius.lg,
      borderWidth: Metrics.borderWidth.lg,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    tileSelected: {
      borderColor: colors.leaf,
    },
    tileTop: {
      flexDirection: 'row',
      marginBottom: Metrics.spacing.xs,
    },
    credits: {
      ...Typography.heading,
      color: colors.foreground,
    },
    name: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
    price: {
      ...Typography.labelStrong,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
    },
    unitPrice: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
    badge: {
      flexDirection: 'row',
      marginTop: Metrics.spacing.xs,
    },
  });
