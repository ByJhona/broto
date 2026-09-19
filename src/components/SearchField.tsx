import { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors } from '@/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus = false,
  autoCapitalize = 'none',
  autoCorrect = false,
}: Readonly<SearchFieldProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.searchBar}>
      <Search size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        autoComplete="off"
        textContentType="none"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <X size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    searchBar: {
      ...Metrics.layout.centeredContent,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Metrics.radius.full,
      paddingHorizontal: Metrics.spacing.md,
      marginHorizontal: Metrics.spacing.lg,
      marginTop: Metrics.spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Metrics.spacing.sm,
      fontSize: 15,
      color: colors.foreground,
    },
  });
