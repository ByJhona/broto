import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';

type Section = { title: string; body: string };

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('privacy');

  const sections: Section[] = [
    { title: t('section1Title'), body: t('section1Body') },
    { title: t('section2Title'), body: t('section2Body') },
    { title: t('section3Title'), body: t('section3Body') },
    { title: t('section4Title'), body: t('section4Body') },
    { title: t('section5Title'), body: t('section5Body') },
    { title: t('section6Title'), body: t('section6Body') },
    { title: t('section7Title'), body: t('section7Body') },
    { title: t('section8Title'), body: t('section8Body') },
    { title: t('section9Title'), body: t('section9Body') },
  ];

  const contactEmail = t('contactEmail');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lastUpdated}>{t('lastUpdated')}</Text>
      <Text style={styles.intro}>{t('intro')}</Text>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('contactTitle')}</Text>
        <Text style={styles.sectionBody}>{t('contactBody')}</Text>
        <Pressable onPress={() => Linking.openURL(`mailto:${contactEmail}`)}>
          <Text style={styles.contactEmail}>{contactEmail}</Text>
        </Pressable>
      </View>
    </ScrollView>
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
      padding: Metrics.spacing.lg,
    },
    lastUpdated: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.md,
    },
    intro: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.foreground,
      marginBottom: Metrics.spacing.lg,
    },
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: Metrics.spacing.xs,
    },
    sectionBody: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.mutedForeground,
    },
    contactEmail: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.leaf,
      marginTop: Metrics.spacing.xs,
    },
  });
