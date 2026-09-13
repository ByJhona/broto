import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { FormError } from './FormError';
import { FormField } from './FormField';
import { SubmitButton } from './SubmitButton';

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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAwareScrollView
        style={styles.backdrop}
        contentContainerStyle={styles.backdropContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <FormField label={label} value={value} onChangeText={onChangeText} placeholder={placeholder} autoFocus />
          <FormError>{error ?? null}</FormError>
          <SubmitButton label={submitLabel} onPress={onSubmit} loading={isSubmitting} />
          <Pressable style={styles.cancel} onPress={onCancel} disabled={isSubmitting}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: Overlays.scrim,
    },
    backdropContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Metrics.spacing.lg,
    },
    card: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.lg,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: Metrics.spacing.md,
    },
    cancel: {
      alignItems: 'center',
      marginTop: Metrics.spacing.sm,
      padding: Metrics.spacing.sm,
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
  });
