import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { FloatingScreenControls, ScreenHeader, useScreenTopInset } from '@/components';
import { Toast } from '@/utils';

type Section = { title: string; body: string };

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['privacy', 'profile']);

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

  const handleContact = async () => {
    try {
      await Linking.openURL(`mailto:${contactEmail}`);
    } catch (err) {
      console.error(err);
      Toast.info(contactEmail);
    }
  };

  return (
    <View style={styles.container}>
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: insets.bottom + Metrics.spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title={t('profile:privacyTitle')} subtitle={t('lastUpdated')} />
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
        <Pressable onPress={handleContact} accessibilityRole="link">
          <Text style={styles.contactEmail}>{contactEmail}</Text>
        </Pressable>
      </View>
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
    intro: {
      ...Typography.body,
      color: colors.foreground,
      marginBottom: Metrics.spacing.lg,
    },
    section: {
      marginBottom: Metrics.spacing.lg,
    },
    sectionTitle: {
      ...Typography.heading,
      color: colors.foreground,
      marginBottom: Metrics.spacing.xs,
    },
    sectionBody: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    contactEmail: {
      ...Typography.label,
      color: colors.leaf,
      marginTop: Metrics.spacing.xs,
    },
  });
