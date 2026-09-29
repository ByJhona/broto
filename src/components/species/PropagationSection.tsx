import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Scissors from 'lucide-react-native/icons/scissors';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { InfoSection } from '../InfoSection';

type PropagationSectionProps = {
  methods: string[];
  action?: ReactNode;
};

export function PropagationSection({ methods, action }: Readonly<PropagationSectionProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('species');

  if (methods.length === 0) return null;

  return (
    <InfoSection title={t('propagationTitle')}>
      <View style={styles.list}>
        {methods.map((method) => (
          <View key={method} style={styles.row}>
            <Scissors size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} style={styles.icon} />
            <Text style={styles.text}>{method}</Text>
          </View>
        ))}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </InfoSection>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: {
      gap: Metrics.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Metrics.spacing.md,
    },
    icon: {
      marginTop: Metrics.spacing.xs,
    },
    text: {
      flex: 1,
      ...Typography.body,
      color: colors.foreground,
    },
    action: {
      marginTop: Metrics.spacing.md,
    },
  });
