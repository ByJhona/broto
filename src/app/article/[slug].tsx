import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import BookOpen from 'lucide-react-native/icons/book-open';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { EmptyState, IconButton, LoadingScreen, PageTitle } from '@/components';
import { ArticleBody } from '@/components/articles/ArticleBody';
import { ArticleCover } from '@/components/articles/ArticleCover';
import { useArticle } from '@/hooks';

function BackButton({ top }: Readonly<{ top: number }>) {
  const router = useRouter();
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <IconButton
      accessibilityLabel={t('a11yBack')}
      size={Metrics.size.md}
      elevated
      style={[styles.backButton, { top }]}
      onPress={() => router.back()}
    >
      <ArrowLeft size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
    </IconButton>
  );
}

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const themed = useThemedStyles(makeStyles);
  const { t } = useTranslation('article');
  const { article, isLoading } = useArticle(slug);
  const backButtonTop = insets.top + Metrics.spacing.sm;

  if (isLoading) return <LoadingScreen />;

  if (!article) {
    return (
      <View style={themed.container}>
        <BackButton top={backButtonTop} />
        <EmptyState icon={BookOpen} title={t('notFoundTitle')} message={t('notFoundMessage')} style={themed.empty} />
      </View>
    );
  }

  return (
    <View style={themed.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}>
        <ArticleCover
          slug={article.slug}
          coverUrl={article.coverUrl}
          iconSize={96}
          style={[themed.cover, { height: Metrics.media.lg + insets.top }]}
        />
        <View style={themed.column}>
          <Text style={themed.category}>{article.category}</Text>
          <PageTitle style={themed.title}>{article.title}</PageTitle>
          <Text style={themed.dek}>{article.dek}</Text>
          <Text style={themed.meta}>{t('readingTime', { count: article.readingMinutes })}</Text>
          <View style={themed.divider} />
          <ArticleBody blocks={article.body} />
        </View>
      </ScrollView>
      <BackButton top={backButtonTop} />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: Metrics.spacing.lg,
  },
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Metrics.spacing.xl,
    },
    cover: {
      width: '100%',
    },
    column: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
      paddingTop: Metrics.spacing.lg,
    },
    category: {
      ...Typography.label,
      color: colors.leaf,
    },
    title: {
      marginTop: Metrics.spacing.xs,
    },
    dek: {
      ...Typography.body,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.sm,
    },
    meta: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.sm,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: Metrics.spacing.lg,
      marginBottom: Metrics.spacing.sm,
    },
  });
