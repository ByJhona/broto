import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Metrics } from '@/theme';
import { CollapsibleSection } from './CollapsibleSection';

type CarouselSectionProps<T> = {
  title: string;
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

export function CarouselSection<T>({
  title,
  items,
  keyExtractor,
  renderItem,
  isCollapsed,
  onToggleCollapsed,
}: Readonly<CarouselSectionProps<T>>) {
  if (items.length === 0) return null;

  return (
    <CollapsibleSection title={title} isCollapsed={isCollapsed} onToggleCollapsed={onToggleCollapsed}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <Fragment key={keyExtractor(item)}>{renderItem(item)}</Fragment>
        ))}
      </ScrollView>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Metrics.spacing.md,
  },
});
