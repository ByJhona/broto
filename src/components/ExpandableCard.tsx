import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Metrics } from '@/theme';

type ExpandableCardProps = {
  title: string;
  icon: React.ReactNode;
  color: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

export function ExpandableCard({
  title,
  icon,
  color,
  defaultExpanded = true,
  children,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: `${color}1A`,
          borderColor: color,
        },
      ]}
    >
      <Pressable style={styles.header} onPress={() => setIsExpanded((prev) => !prev)}>
        {icon}
        <Text style={[styles.title, { color }]}>{title}</Text>
        <View style={styles.chevron}>
          {isExpanded ? (
            <ChevronUp size={18} color={color} strokeWidth={Metrics.icon.strokeWidth} />
          ) : (
            <ChevronDown size={18} color={color} strokeWidth={Metrics.icon.strokeWidth} />
          )}
        </View>
      </Pressable>
      {isExpanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    padding: Metrics.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  chevron: {
    marginLeft: Metrics.spacing.sm,
  },
  content: {
    marginTop: Metrics.spacing.sm,
  },
});
