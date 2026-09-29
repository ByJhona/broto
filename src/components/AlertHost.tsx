import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Metrics, Overlays, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { registerAlertHandler, type AlertButton } from '@/utils';

type AlertState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type Styles = ReturnType<typeof makeStyles>;

function buttonStyles(styles: Styles, button: AlertButton) {
  if (button.style === 'cancel') return { container: styles.buttonCancel, text: styles.buttonCancelText };
  if (button.style === 'destructive') return { container: styles.buttonDestructive, text: styles.buttonFilledText };
  return { container: styles.buttonPrimary, text: styles.buttonFilledText };
}

type AlertActionButtonProps = {
  button: AlertButton;
  isSideBySide: boolean;
  onPress: () => void;
  styles: Styles;
};

function AlertActionButton({ button, isSideBySide, onPress, styles }: Readonly<AlertActionButtonProps>) {
  const variant = buttonStyles(styles, button);
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, variant.container, isSideBySide && styles.buttonSideBySide, pressed && styles.buttonPressed]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, variant.text]}>{button.text}</Text>
    </Pressable>
  );
}

export function AlertHost() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerAlertHandler((title, message, buttons) => {
      setAlert({ title, message, buttons: buttons && buttons.length > 0 ? buttons : [{ text: t('ok') }] });
      setVisible(true);
    });
    return () => registerAlertHandler(null);
  }, [t]);

  const handlePress = (button: AlertButton) => {
    setVisible(false);
    button.onPress?.();
  };

  const dismiss = () => {
    const cancelButton = alert?.buttons.find((button) => button.style === 'cancel');
    setVisible(false);
    cancelButton?.onPress?.();
  };

  const isSideBySide = alert?.buttons.length === 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          {alert ? (
            <>
              <Text style={styles.title}>{alert.title}</Text>
              {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}
              <View style={[styles.buttons, isSideBySide && styles.buttonsSideBySide]}>
                {alert.buttons.map((button, index) => (
                  <AlertActionButton
                    key={`${button.text}-${index}`}
                    button={button}
                    isSideBySide={isSideBySide}
                    onPress={() => handlePress(button)}
                    styles={styles}
                  />
                ))}
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Overlays.scrim,
      padding: Metrics.spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.background,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.lg,
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      textAlign: 'center',
    },
    message: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: Metrics.spacing.sm,
    },
    buttons: {
      gap: Metrics.spacing.sm,
      marginTop: Metrics.spacing.lg,
    },
    buttonsSideBySide: {
      flexDirection: 'row',
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Metrics.spacing.md,
      paddingHorizontal: Metrics.spacing.sm,
      borderRadius: Metrics.radius.full,
    },
    buttonSideBySide: {
      flex: 1,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonDestructive: {
      backgroundColor: colors.destructive,
    },
    buttonCancel: {
      backgroundColor: colors.muted,
    },
    buttonText: {
      ...Typography.headingMedium,
      textAlign: 'center',
    },
    buttonFilledText: {
      color: colors.primaryForeground,
    },
    buttonCancelText: {
      color: colors.foreground,
    },
  });
