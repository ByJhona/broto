import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import type { ArticleBlock } from '@/types';

type Styles = ReturnType<typeof makeStyles>;

type BlockProps<T extends ArticleBlock['type']> = {
  block: Extract<ArticleBlock, { type: T }>;
  styles: Styles;
};

function ListBlock({ block, styles }: Readonly<BlockProps<'list'>>) {
  return (
    <View style={styles.list}>
      {block.items.map((item) => (
        <View key={item} style={styles.listItem}>
          <View style={styles.bullet} />
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function TipBlock({ block, styles }: Readonly<BlockProps<'tip'>>) {
  const { t } = useTranslation('article');
  return (
    <View style={styles.tip}>
      <Text style={styles.tipLabel}>{t('tipLabel')}</Text>
      <Text style={styles.tipText}>{block.text}</Text>
    </View>
  );
}

function ImageBlock({ block, styles }: Readonly<BlockProps<'image'>>) {
  return (
    <View style={styles.figure}>
      <Image source={{ uri: block.url }} style={styles.image} contentFit="cover" />
      {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
    </View>
  );
}

function ArticleBlockView({ block, styles }: Readonly<{ block: ArticleBlock; styles: Styles }>) {
  switch (block.type) {
    case 'heading':
      return (
        <Text style={styles.heading} accessibilityRole="header">
          {block.text}
        </Text>
      );
    case 'paragraph':
      return <Text style={styles.paragraph}>{block.text}</Text>;
    case 'list':
      return <ListBlock block={block} styles={styles} />;
    case 'tip':
      return <TipBlock block={block} styles={styles} />;
    case 'image':
      return <ImageBlock block={block} styles={styles} />;
    default:
      return null;
  }
}

type ArticleBodyProps = {
  blocks: ArticleBlock[];
};

export function ArticleBody({ blocks }: Readonly<ArticleBodyProps>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      {blocks.map((block, index) => (
        <ArticleBlockView key={`${block.type}-${index}`} block={block} styles={styles} />
      ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    heading: {
      ...Typography.title,
      color: colors.foreground,
      marginTop: Metrics.spacing.lg,
      marginBottom: Metrics.spacing.sm,
    },
    paragraph: {
      ...Typography.body,
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
    },
    list: {
      gap: Metrics.spacing.sm,
      marginBottom: Metrics.spacing.md,
    },
    listItem: {
      flexDirection: 'row',
      gap: Metrics.spacing.sm,
    },
    bullet: {
      width: Metrics.size.dot,
      height: Metrics.size.dot,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.leaf,
      marginTop: Metrics.spacing.sm,
    },
    listText: {
      flex: 1,
      ...Typography.body,
      color: colors.foreground,
    },
    tip: {
      backgroundColor: `${colors.leaf}14`,
      borderLeftWidth: 3,
      borderLeftColor: colors.leaf,
      borderRadius: Metrics.radius.md,
      padding: Metrics.spacing.md,
      marginBottom: Metrics.spacing.md,
    },
    tipLabel: {
      ...Typography.labelStrong,
      color: colors.leaf,
      marginBottom: Metrics.spacing.xs,
    },
    tipText: {
      ...Typography.body,
      color: colors.foreground,
    },
    figure: {
      marginBottom: Metrics.spacing.md,
    },
    image: {
      width: '100%',
      aspectRatio: Metrics.aspect.landscape,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    caption: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
  });
