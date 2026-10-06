import { StyleSheet } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { BottomSheet } from './BottomSheet';
import { FormError } from './FormError';
import { FormField } from './FormField';
import { Button } from './Button';
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
    <BottomSheet title={title} visible={visible} onClose={handleClose}>
      <FormField label={label} value={value} onChangeText={onChangeText} placeholder={placeholder} autoFocus />
      <FormError>{error ?? null}</FormError>
      <Button label={submitLabel} onPress={onSubmit} loading={isSubmitting} />
      <TextButton label={t('cancel')} onPress={handleClose} disabled={isSubmitting} style={styles.cancel} />
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    cancel: {
      marginTop: Metrics.spacing.sm,
    },
  });
