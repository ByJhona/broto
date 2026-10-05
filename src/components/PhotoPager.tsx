import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';
import { Metrics, Overlays, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { PhotoViewerModal } from './PhotoViewerModal';


export function useHeroHeight(): number {
  const { width } = useWindowDimensions();
  return Math.min(Math.round(width / Metrics.aspect.hero), Metrics.layout.heroMaxHeight);
}

type PageDotsProps = {
  count: number;
  activeIndex: number;
  alignRight: boolean;
};

function PageDots({ count, activeIndex, alignRight }: Readonly<PageDotsProps>) {
  const styles = useThemedStyles(makeStyles);
  if (count < 2) return null;
  const pages = Array.from({ length: count }, (_, index) => index);

  return (
    <View style={[styles.dots, alignRight && styles.dotsRight]} pointerEvents="none">
      {pages.map((page) => (
        <View key={page} style={[styles.dot, page === activeIndex && styles.dotActive]} />
      ))}
    </View>
  );
}

type PageSize = { width: number; height: number };

type PhotoPagerProps = {
  photoUrls: string[];
  placeholderIcon: LucideIcon;
  placeholderColor?: string;
  fullWidth?: boolean;
  overlay?: ReactNode;
  renderPhotoAction?: (photoUrl: string) => ReactNode;
  trailingPage?: ReactNode;
  recyclingKey?: string;
  style?: StyleProp<ViewStyle>;
};

export function PhotoPager({
  photoUrls,
  placeholderIcon: PlaceholderIcon,
  placeholderColor,
  fullWidth = false,
  overlay,
  renderPhotoAction,
  trailingPage,
  recyclingKey,
  style,
}: Readonly<PhotoPagerProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');
  const { width: windowWidth } = useWindowDimensions();
  const heroHeight = useHeroHeight();
  const [measured, setMeasured] = useState<PageSize>({ width: 0, height: 0 });
  const [pageIndex, setPageIndex] = useState(0);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);
  const page: PageSize = fullWidth ? { width: windowWidth, height: heroHeight } : measured;
  const pageCount = photoUrls.length + (trailingPage ? 1 : 0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMeasured({ width, height });
  };

  return (
    <View
      style={[styles.container, fullWidth ? { height: heroHeight } : styles.measured, style]}
      onLayout={fullWidth ? undefined : handleLayout}
    >
      {pageCount === 0 ? (
        <View style={styles.placeholder}>
          <PlaceholderIcon size={Metrics.icon.xl} color={placeholderColor ?? colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
        </View>
      ) : null}

      {pageCount > 0 && page.width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setPageIndex(Math.round(event.nativeEvent.contentOffset.x / page.width))}
        >
          {photoUrls.map((url, index) => (
            <View key={url} style={page}>
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel={t('photoPageLabel', { index: index + 1, total: photoUrls.length })}
                onPress={() => setViewerPhotoUrl(url)}
              >
                <Image
                  source={{ uri: url }}
                  style={[styles.photo, page]}
                  contentFit="cover"
                  transition={200}
                  recyclingKey={recyclingKey ? `${recyclingKey}-${index}` : undefined}
                  cachePolicy="memory-disk"
                />
              </Pressable>
              {renderPhotoAction ? <View style={styles.photoAction}>{renderPhotoAction(url)}</View> : null}
            </View>
          ))}
          {trailingPage ? <View style={page}>{trailingPage}</View> : null}
        </ScrollView>
      ) : null}

      {overlay ? (
        <View style={styles.overlay} pointerEvents="none">
          {overlay}
        </View>
      ) : null}
      <PageDots count={pageCount} activeIndex={pageIndex} alignRight={!!overlay} />
      <PhotoViewerModal photoUrl={viewerPhotoUrl} onClose={() => setViewerPhotoUrl(null)} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      width: '100%',
      overflow: 'hidden',
      backgroundColor: colors.muted,
    },
    measured: {
      aspectRatio: Metrics.aspect.hero,
    },
    placeholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photo: {
      backgroundColor: colors.muted,
    },
    photoAction: {
      position: 'absolute',
      right: Metrics.spacing.md,
      bottom: Metrics.spacing.md,
    },
    overlay: {
      position: 'absolute',
      left: Metrics.spacing.md,
      bottom: Metrics.spacing.md,
      right: Metrics.size.hero,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: Metrics.spacing.xs,
    },
    dots: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: Metrics.spacing.md + 12,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Metrics.spacing.sm,
    },
    dotsRight: {
      left: undefined,
      right: Metrics.spacing.md,
      bottom: Metrics.spacing.md + 8,
    },
    dot: {
      width: Metrics.size.dot,
      height: Metrics.size.dot,
      borderRadius: Metrics.radius.full,
      backgroundColor: Overlays.whiteTint,
      borderWidth: Metrics.borderWidth.sm,
      borderColor: Overlays.scrimLight,
    },
    dotActive: {
      width: Metrics.size.xs,
      backgroundColor: colors.white,
    },
  });
