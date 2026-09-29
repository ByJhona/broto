import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Scan from 'lucide-react-native/icons/scan';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { IconBadge, ListRow } from '@/components';
import { ArticleListItem } from '@/components/articles/ArticleListItem';
import { FeaturedArticle } from '@/components/articles/FeaturedArticle';
import { ActionCard } from '@/components/identify/ActionCard';
import { RecentSpeciesStrip } from '@/components/identify/RecentSpeciesStrip';
import { makeStyles } from '@/components/identify/styles';
import { useArticles } from '@/hooks';

export default function IdentifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['help', 'article']);
  const { featured, others } = useArticles();

  const openArticle = (slug: string) => router.push({ pathname: '/article/[slug]', params: { slug } });

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

      <ListRow
        variant="card"
        style={styles.specialistRow}
        leading={
          <IconBadge size={Metrics.size.lg} backgroundColor={colors.leafForeground}>
            <MessageCircle size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
          </IconBadge>
        }
        title={t('specialistSectionTitle')}
        subtitle={t('specialistRowSubtitle')}
        trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
        onPress={() => router.push('/specialist')}
      />

      {featured ? <FeaturedArticle article={featured} onPress={() => openArticle(featured.slug)} /> : null}

      {others.length > 0 ? (
        <>
          <Text style={styles.articlesTitle} accessibilityRole="header">
            {t('article:sectionTitle')}
          </Text>
          {others.map((article) => (
            <ArticleListItem key={article.id} article={article} onPress={() => openArticle(article.slug)} />
          ))}
        </>
      ) : null}

      <RecentSpeciesStrip />
    </ScrollView>
  );
}
