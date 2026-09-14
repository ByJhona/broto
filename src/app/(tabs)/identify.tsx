import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Bell from 'lucide-react-native/icons/bell';
import Camera from 'lucide-react-native/icons/camera';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Clock from 'lucide-react-native/icons/clock';
import Cloud from 'lucide-react-native/icons/cloud';
import Droplet from 'lucide-react-native/icons/droplet';
import Heart from 'lucide-react-native/icons/heart';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Scan from 'lucide-react-native/icons/scan';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import Sun from 'lucide-react-native/icons/sun';
import Trash2 from 'lucide-react-native/icons/trash-2';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import X from 'lucide-react-native/icons/x';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { Card, IconBadge, PlantChat } from '@/components';
import { CREDIT_COSTS } from '@/services';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type NeedItem = {
  icon: LucideIcon;
  label: string;
};

function getPlantNeeds(t: TFunc): NeedItem[] {
  return [
    { icon: Sun, label: t('needLight') },
    { icon: Droplet, label: t('needWater') },
    { icon: Clock, label: t('needTime') },
  ];
}

function getCommonMistakes(t: TFunc): string[] {
  return [t('mistakeOverwatering'), t('mistakePests'), t('mistakeFertilizingSickPlant')];
}

function getCuriosities(t: TFunc): string[] {
  return [t('curiosityPhotosynthesis'), t('curiosityPhototropism'), t('curiosityNightLeaves'), t('curiosityFungiNetworks')];
}

function getCuriosityColors(colors: ThemeColors): string[] {
  return [colors.leaf, colors.primary, colors.secondary, colors.accent];
}

type BenefitItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

function getPlantBenefits(t: TFunc): BenefitItem[] {
  return [
    { icon: Heart, title: t('benefitStressTitle'), description: t('benefitStressDescription') },
    { icon: Cloud, title: t('benefitHumidityTitle'), description: t('benefitHumidityDescription') },
    { icon: Sparkles, title: t('benefitRoutineTitle'), description: t('benefitRoutineDescription') },
    { icon: TrendingUp, title: t('benefitGrowthTitle'), description: t('benefitGrowthDescription') },
  ];
}

type FaqItem = {
  id: string;
  icon: LucideIcon;
  question: string;
  answer: string;
};

function getFaqItems(t: TFunc): FaqItem[] {
  return [
    {
      id: 'diagnose',
      icon: Stethoscope,
      question: t('faqDiagnoseQuestion'),
      answer: t('faqDiagnoseAnswer', { count: CREDIT_COSTS.diagnosis }),
    },
    {
      id: 'identify',
      icon: Camera,
      question: t('faqIdentifyQuestion'),
      answer: t('faqIdentifyAnswer'),
    },
    {
      id: 'care',
      icon: Droplet,
      question: t('faqCareQuestion'),
      answer: t('faqCareAnswer'),
    },
    {
      id: 'sun',
      icon: Sun,
      question: t('faqSunQuestion'),
      answer: t('faqSunAnswer'),
    },
    {
      id: 'watering',
      icon: Bell,
      question: t('faqWateringQuestion'),
      answer: t('faqWateringAnswer'),
    },
    {
      id: 'delete',
      icon: Trash2,
      question: t('faqDeleteQuestion'),
      answer: t('faqDeleteAnswer'),
    },
    {
      id: 'sync',
      icon: Cloud,
      question: t('faqSyncQuestion'),
      answer: t('faqSyncAnswer'),
    },
  ];
}

type ActionCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
};

function ActionCard({ icon: Icon, title, subtitle, onPress, styles, colors }: Readonly<ActionCardProps>) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <IconBadge size={52} backgroundColor={colors.leafForeground}>
        <Icon size={Metrics.icon.large} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      </IconBadge>
      <View style={styles.actionTextBox}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <ArrowRight size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
    </Pressable>
  );
}

export default function IdentifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const curiosityColors = useMemo(() => getCuriosityColors(colors), [colors]);
  const [openId, setOpenId] = useState<string | null>(null);
  const { t } = useTranslation('help');
  const plantNeeds = getPlantNeeds(t);
  const commonMistakes = getCommonMistakes(t);
  const curiosities = getCuriosities(t);
  const plantBenefits = getPlantBenefits(t);
  const faqItems = getFaqItems(t);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Metrics.spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>
      </View>

      <View style={styles.actionsRow}>
        <ActionCard
          icon={Scan}
          title={t('identifyCardTitle')}
          subtitle={t('identifyCardSubtitle')}
          onPress={() => router.push({ pathname: '/identify/capture', params: { mode: 'identify' } })}
          styles={styles}
          colors={colors}
        />
        <ActionCard
          icon={Stethoscope}
          title={t('diagnosisCardTitle')}
          subtitle={t('diagnosisCardSubtitle')}
          onPress={() => router.push({ pathname: '/identify/capture', params: { mode: 'diagnose' } })}
          styles={styles}
          colors={colors}
        />
      </View>

      <Pressable style={styles.historyLink} onPress={() => router.push('/diagnose')}>
        <Text style={styles.historyLinkText}>{t('viewPastDiagnoses')}</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{t('specialistSectionTitle')}</Text>
      </View>

      <Card style={styles.specialistCard}>
        <Text style={styles.specialistIntro}>
          {t('specialistIntro')}
        </Text>
        <PlantChat />
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{t('firstStepsSectionTitle')}</Text>
      </View>

      <Card style={styles.needsCard}>
        <Text style={styles.needsTitle}>{t('plantNeedsTitle')}</Text>
        <View style={styles.needsRow}>
          {plantNeeds.map((need) => {
            const Icon = need.icon;
            return (
              <View key={need.label} style={styles.needChip}>
                <Icon size={18} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                <Text style={styles.needChipText}>{need.label}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.needsCaption}>
          {t('plantNeedsCaption')}
        </Text>
      </Card>

      <View style={styles.mistakesCard}>
        <View style={styles.mistakesHeader}>
          <AlertTriangle size={18} color={colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.mistakesTitle}>{t('commonMistakesTitle')}</Text>
        </View>
        {commonMistakes.map((mistake) => (
          <View key={mistake} style={styles.mistakeRow}>
            <X size={14} color={colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.mistakeText}>{mistake}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.subsectionTitle}>{t('curiositiesTitle')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.curiosityRow}
        style={styles.curiosityScroll}
      >
        {curiosities.map((fact, index) => {
          const color = curiosityColors[index % curiosityColors.length];
          return (
            <View key={fact} style={[styles.curiosityCard, { backgroundColor: `${color}1A`, borderColor: color }]}>
              <Lightbulb size={20} color={color} strokeWidth={Metrics.icon.strokeWidth} />
              <Text style={styles.curiosityText}>{fact}</Text>
            </View>
          );
        })}
      </ScrollView>

      <Text style={styles.subsectionTitle}>{t('benefitsTitle')}</Text>
      <View style={styles.benefitsGrid}>
        {plantBenefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <Card key={benefit.title} style={styles.benefitTile}>
              <IconBadge size={36} backgroundColor={`${colors.accent}22`}>
                <Icon size={18} color={colors.accent} strokeWidth={Metrics.icon.strokeWidth} />
              </IconBadge>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitText}>{benefit.description}</Text>
            </Card>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{t('faqSectionTitle')}</Text>
      </View>

      {faqItems.map((item) => {
        const isOpen = openId === item.id;
        const Icon = item.icon;

        return (
          <Card key={item.id} style={styles.card} onPress={() => setOpenId(isOpen ? null : item.id)}>
            <View style={styles.row}>
              <IconBadge>
                <Icon size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
              </IconBadge>
              <Text style={styles.question}>{item.question}</Text>
              <ChevronDown
                size={Metrics.icon.normal}
                color={colors.mutedForeground}
                strokeWidth={Metrics.icon.strokeWidth}
                style={isOpen ? styles.chevronOpen : undefined}
              />
            </View>

            {isOpen ? <Text style={styles.answer}>{item.answer}</Text> : null}
          </Card>
        );
      })}
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
  header: {
    marginBottom: Metrics.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
  },
  actionsRow: {
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.md,
    backgroundColor: colors.leaf,
    borderRadius: Metrics.radius.lg,
    padding: Metrics.spacing.md,
  },
  actionTextBox: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.leafForeground,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.leafForeground,
    opacity: 0.85,
    marginTop: 2,
  },
  historyLink: {
    alignItems: 'center',
    marginBottom: Metrics.spacing.xl,
  },
  historyLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.leaf,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    marginBottom: Metrics.spacing.md,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  specialistCard: {
    marginBottom: Metrics.spacing.xl,
  },
  specialistIntro: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: Metrics.spacing.md,
  },
  needsCard: {
    marginBottom: Metrics.spacing.md,
  },
  needsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: Metrics.spacing.sm,
  },
  needsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.sm,
  },
  needChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    backgroundColor: colors.muted,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.xs,
    paddingHorizontal: Metrics.spacing.md,
  },
  needChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  needsCaption: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    marginTop: Metrics.spacing.sm,
  },
  mistakesCard: {
    backgroundColor: `${colors.destructive}0D`,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: `${colors.destructive}33`,
    padding: Metrics.spacing.md,
    marginBottom: Metrics.spacing.md,
  },
  mistakesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.sm,
  },
  mistakesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.destructive,
    flex: 1,
  },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.sm,
    marginTop: Metrics.spacing.sm,
  },
  mistakeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: Metrics.spacing.sm,
  },
  curiosityScroll: {
    marginBottom: Metrics.spacing.md,
  },
  curiosityRow: {
    gap: Metrics.spacing.sm,
    paddingRight: Metrics.spacing.lg,
  },
  curiosityCard: {
    width: 220,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    padding: Metrics.spacing.md,
    gap: Metrics.spacing.sm,
  },
  curiosityText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.foreground,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.md,
  },
  benefitTile: {
    width: '48%',
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: Metrics.spacing.sm,
  },
  benefitText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  card: {
    width: '100%',
    marginBottom: Metrics.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
  },
  question: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  answer: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 19,
    marginTop: Metrics.spacing.sm,
    paddingLeft: 40 + Metrics.spacing.sm,
  },
  });
