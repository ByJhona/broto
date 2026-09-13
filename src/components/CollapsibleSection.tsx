import { useMemo, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { SectionTitle } from './SectionTitle';

type CollapsibleSectionProps = PropsWithChildren<{
  title: string;
  onSeeMore?: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}>;

export function CollapsibleSection({
  title,
  onSeeMore,
  isCollapsed,
  onToggleCollapsed,
  children,
}: Readonly<CollapsibleSectionProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <SectionTitle style={styles.titleRow}>{title}</SectionTitle>
        <View style={styles.actions}>
          {onSeeMore ? (
            <Pressable onPress={onSeeMore}>
              <Text style={styles.seeMore}>Ver mais</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onToggleCollapsed} hitSlop={8}>
            {isCollapsed ? (
              <ChevronDown size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
            ) : (
              <ChevronUp size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
            )}
          </Pressable>
        </View>
      </View>

      {!isCollapsed ? children : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Metrics.spacing.sm,
    },
    titleRow: {
      marginBottom: 0,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    seeMore: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.leaf,
    },
  });
