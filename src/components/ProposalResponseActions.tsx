import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Metrics, Opacity, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';

type ProposalResponseActionsProps = {
  onAccept?: () => void;
  onDecline?: () => void;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ProposalResponseActions({ onAccept, onDecline, loading = false, compact = false, style }: Readonly<ProposalResponseActionsProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('listing');
  const buttonStyle = [styles.button, compact && styles.buttonCompact, loading && styles.disabled];
  const labelStyle = compact ? styles.labelCompact : styles.label;

  return (
    <View style={[styles.row, style]}>
      <Pressable accessibilityRole="button" style={[buttonStyle, styles.decline]} onPress={onDecline} disabled={loading}>
        <Text style={[labelStyle, styles.declineLabel]}>{t('declineAction')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={[buttonStyle, styles.accept]} onPress={onAccept} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[labelStyle, styles.acceptLabel]}>{t('acceptAction')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
    },
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Metrics.radius.full,
      paddingVertical: Metrics.spacing.md,
    },
    buttonCompact: {
      paddingVertical: Metrics.spacing.sm,
    },
    disabled: {
      opacity: Opacity.disabled,
    },
    decline: {
      borderWidth: Metrics.borderWidth.md,
      borderColor: colors.destructive,
    },
    accept: {
      backgroundColor: colors.primary,
    },
    label: {
      ...Typography.headingMedium,
    },
    labelCompact: {
      ...Typography.label,
    },
    declineLabel: {
      color: colors.destructive,
    },
    acceptLabel: {
      color: colors.primaryForeground,
    },
  });
