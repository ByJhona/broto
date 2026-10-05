import { StyleSheet, Text } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { BottomSheet } from './BottomSheet';
import { FormError } from './FormError';
import { FormField } from './FormField';
import { SubmitButton } from './SubmitButton';
import { TextButton } from './TextButton';

type PromptModalProps = {
  visible: boolean;
  title: string;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export function PromptModal({
  visible,
  title,
  label,
  value,
  onChangeText,
  placeholder,
  error,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: Readonly<PromptModalProps>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');

  const handleClose = () => {
    if (!isSubmitting) onCancel();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <Text style={styles.title}>{title}</Text>
      <FormField label={label} value={value} onChangeText={onChangeText} placeholder={placeholder} autoFocus />
      <FormError>{error ?? null}</FormError>
      <SubmitButton label={submitLabel} onPress={onSubmit} loading={isSubmitting} />
      <TextButton label={t('cancel')} onPress={handleClose} disabled={isSubmitting} style={styles.cancel} />
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...Typography.title,
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
    },
    cancel: {
      marginTop: Metrics.spacing.sm,
    },
  });
