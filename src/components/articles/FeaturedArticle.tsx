import { Pressable, StyleSheet, Text } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { ArticleSummary } from '@/types';
import { ArticleCover } from './ArticleCover';

type FeaturedArticleProps = {
  article: ArticleSummary;
  onPress: () => void;
};

export function FeaturedArticle({ article, onPress }: Readonly<FeaturedArticleProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('article');

  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed} onPress={onPress}>
      <ArticleCover slug={article.slug} coverUrl={article.coverUrl} iconSize={72} style={styles.cover} />
      <Text style={styles.category}>{article.category}</Text>
      <Text style={styles.title}>{article.title}</Text>
      <Text style={styles.dek}>{article.dek}</Text>
      <Text style={styles.meta}>{t('readingTime', { count: article.readingMinutes })}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pressed: {
      opacity: 0.85,
    },
    cover: {
      height: Metrics.media.md,
      borderRadius: Metrics.radius.lg,
      marginBottom: Metrics.spacing.md,
    },
    category: {
      ...Typography.label,
      color: colors.leaf,
    },
    title: {
      ...Typography.display,
      color: colors.foreground,
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
  });
