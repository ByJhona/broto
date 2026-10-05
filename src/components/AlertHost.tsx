import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography, Opacity } from '@/theme';
import { useTranslation } from '@/i18n';
import { registerAlertHandler, type AlertButton } from '@/utils';
import { Dialog } from './Dialog';

type AlertState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  onDismiss?: () => void;
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
    registerAlertHandler((title, message, buttons, options) => {
      setAlert({ title, message, buttons: buttons && buttons.length > 0 ? buttons : [{ text: t('ok') }], onDismiss: options?.onDismiss });
      setVisible(true);
    });
    return () => registerAlertHandler(null);
  }, [t]);

  const handlePress = (button: AlertButton) => {
    setVisible(false);
    button.onPress?.();
  };

  const dismiss = () => {
    const onDismiss = alert?.onDismiss ?? alert?.buttons.find((button) => button.style === 'cancel')?.onPress;
    setVisible(false);
    onDismiss?.();
  };

  const isSideBySide = alert?.buttons.length === 2;

  return (
    <Dialog visible={visible} onClose={dismiss} cardStyle={styles.card}>
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
    </Dialog>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      alignItems: 'stretch',
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
      opacity: Opacity.pressed,
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
