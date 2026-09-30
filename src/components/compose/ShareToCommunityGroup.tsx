import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MessagesSquare from 'lucide-react-native/icons/messages-square';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { CardGroup } from '../CardGroup';
import { IconBadge } from '../IconBadge';

type ShareToCommunityGroupProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  description: string;
  caption: string;
  onChangeCaption: (value: string) => void;
  captionLabel: string;
  captionPlaceholder: string;
};

export function ShareToCommunityGroup({
  value,
  onValueChange,
  description,
  caption,
  onChangeCaption,
  captionLabel,
  captionPlaceholder,
}: Readonly<ShareToCommunityGroupProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('listing');

  return (
    <CardGroup style={styles.group}>
      <Pressable
        style={styles.toggleRow}
        onPress={() => onValueChange(!value)}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      >
        <IconBadge>
          <MessagesSquare size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        </IconBadge>
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>{t('shareToCommunityTitle')}</Text>
          <Text style={styles.toggleDescription}>{description}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.muted, true: colors.leaf }}
          thumbColor={colors.white}
        />
      </Pressable>
      {value ? (
        <TextInput
          value={caption}
          onChangeText={onChangeCaption}
          placeholder={captionPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel={captionLabel}
          style={styles.caption}
          multiline
        />
      ) : null}
    </CardGroup>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      marginBottom: Metrics.spacing.xl,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.md,
    },
    toggleText: {
      flex: 1,
      gap: Metrics.spacing.xs,
    },
    toggleTitle: {
      ...Typography.heading,
      color: colors.foreground,
    },
    toggleDescription: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    caption: {
      ...Typography.body,
      color: colors.foreground,
      paddingVertical: Metrics.spacing.md,
      minHeight: Metrics.size.xxl,
      textAlignVertical: 'top',
    },
  });
