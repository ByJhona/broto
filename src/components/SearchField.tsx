import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus = false,
  autoCapitalize = 'none',
  autoCorrect = false,
  style,
}: Readonly<SearchFieldProps>) {
  const colors = useColors();
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.searchBar, style]}>
      <Search size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
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
        <Pressable accessibilityRole="button" accessibilityLabel={t('common:a11yClearSearch')} onPress={() => onChangeText('')} hitSlop={Metrics.hitSlop}>
          <X size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />
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
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
      borderRadius: Metrics.radius.full,
      paddingHorizontal: Metrics.spacing.md,
      marginHorizontal: Metrics.spacing.lg,
      marginTop: Metrics.spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Metrics.spacing.sm,
      ...Typography.input,
      color: colors.foreground,
    },
  });
