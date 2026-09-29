import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { ArticleSummary } from '@/types';
import { ArticleCover } from './ArticleCover';

type ArticleListItemProps = {
  article: ArticleSummary;
  onPress: () => void;
};

export function ArticleListItem({ article, onPress }: Readonly<ArticleListItemProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('article');

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.text}>
        <Text style={styles.category}>{article.category}</Text>
        <Text style={styles.title} numberOfLines={3}>
          {article.title}
        </Text>
        <Text style={styles.dek} numberOfLines={2}>
          {article.dek}
        </Text>
        <Text style={styles.meta}>{t('readingTime', { count: article.readingMinutes })}</Text>
      </View>
      <ArticleCover slug={article.slug} coverUrl={article.coverUrl} iconSize={32} style={styles.thumbnail} />
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Metrics.spacing.md,
      paddingVertical: Metrics.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    pressed: {
      opacity: 0.85,
    },
    text: {
      flex: 1,
    },
    category: {
      ...Typography.captionLabel,
      color: colors.leaf,
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      marginTop: Metrics.spacing.xs,
    },
    dek: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    meta: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    thumbnail: {
      width: Metrics.size.xxl,
      height: Metrics.size.xxl,
      borderRadius: Metrics.radius.md,
    },
  });
