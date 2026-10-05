import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { Card, FloatingScreenControls, IconBadge, ScreenHeader, useScreenTopInset } from '@/components';
import { getFaqItems, type FaqItem } from '@/components/help/faqItems';
import { useCreditCosts } from '@/hooks';

type FaqRowProps = {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof makeStyles>;
};

function FaqRow({ item, isOpen, onToggle, styles }: Readonly<FaqRowProps>) {
  const colors = useColors();
  const Icon = item.icon;
  return (
    <Card style={styles.card} onPress={onToggle}>
      <View style={styles.row}>
        <IconBadge>
          <Icon size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
        </IconBadge>
        <Text style={styles.question}>{item.question}</Text>
        <ChevronDown
          size={Metrics.icon.normal}
          color={colors.mutedForeground}
          strokeWidth={Metrics.icon.stroke.regular}
          style={isOpen ? styles.chevronOpen : undefined}
        />
      </View>
      {isOpen ? <Text style={styles.answer}>{item.answer}</Text> : null}
    </Card>
  );
}

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['help', 'profile']);
  const creditCosts = useCreditCosts();
  const [openId, setOpenId] = useState<string | null>(null);
  const faqItems = getFaqItems(t, creditCosts);

  return (
    <View style={styles.container}>
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: insets.bottom + Metrics.spacing.xl }]}
    >
      <ScreenHeader title={t('profile:helpTitle')} subtitle={t('faqSectionTitle')} />
      {faqItems.map((item) => (
        <FaqRow
          key={item.id}
          item={item}
          isOpen={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)}
          styles={styles}
        />
      ))}
    </ScrollView>
    <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
    },
    card: {
      marginBottom: Metrics.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.md,
    },
    question: {
      flex: 1,
      ...Typography.headingMedium,
      color: colors.foreground,
    },
    chevronOpen: {
      transform: [{ rotate: '180deg' }],
    },
    answer: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.md,
    },
  });
