import { type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { SectionHeading } from './InfoSection';

type CollapsibleSectionProps = PropsWithChildren<{
  title: string;
  onSeeMore?: () => void;
  headerAction?: ReactNode;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  style?: StyleProp<ViewStyle>;
}>;

export function CollapsibleSection({
  title,
  onSeeMore,
  headerAction,
  isCollapsed,
  onToggleCollapsed,
  style,
  children,
}: Readonly<CollapsibleSectionProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');

  return (
    <View style={[styles.section, style]}>
      <SectionHeading
        title={title}
        trailing={
          <View style={styles.actions}>
            {headerAction}
            {onSeeMore ? (
              <Pressable onPress={onSeeMore}>
                <Text style={styles.seeMore}>{t('seeMore')}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel={isCollapsed ? t('common:a11yExpand') : t('common:a11yCollapse')} onPress={onToggleCollapsed} hitSlop={Metrics.hitSlop}>
              {isCollapsed ? (
                <ChevronDown size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
              ) : (
                <ChevronUp size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
              )}
            </Pressable>
          </View>
        }
      />

      {!isCollapsed ? children : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: Metrics.spacing.xl,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    seeMore: {
      ...Typography.label,
      color: colors.leaf,
    },
  });
