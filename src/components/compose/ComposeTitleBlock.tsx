import { StyleSheet, TextInput, View } from 'react-native';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';

type ComposeTitleBlockProps = {
  title: string;
  onChangeTitle: (value: string) => void;
  titleLabel: string;
  titlePlaceholder: string;
  description: string;
  onChangeDescription: (value: string) => void;
  descriptionLabel: string;
  descriptionPlaceholder: string;
};

export function ComposeTitleBlock({
  title,
  onChangeTitle,
  titleLabel,
  titlePlaceholder,
  description,
  onChangeDescription,
  descriptionLabel,
  descriptionPlaceholder,
}: Readonly<ComposeTitleBlockProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.block}>
      <TextInput
        value={title}
        onChangeText={onChangeTitle}
        placeholder={titlePlaceholder}
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={titleLabel}
        style={styles.title}
        multiline
        submitBehavior="blurAndSubmit"
        returnKeyType="next"
      />
      <TextInput
        value={description}
        onChangeText={onChangeDescription}
        placeholder={descriptionPlaceholder}
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={descriptionLabel}
        style={styles.description}
        multiline
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    block: {
      gap: Metrics.spacing.sm,
      marginBottom: Metrics.spacing.xl,
    },
    title: {
      ...Typography.display,
      color: colors.foreground,
      padding: 0,
    },
    description: {
      ...Typography.body,
      color: colors.foreground,
      padding: 0,
      textAlignVertical: 'top',
    },
  });
