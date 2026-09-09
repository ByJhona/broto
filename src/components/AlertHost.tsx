import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { registerAlertHandler, type AlertButton } from '@/utils';

type AlertState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

export function AlertHost() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [state, setState] = useState<AlertState | null>(null);

  useEffect(() => {
    registerAlertHandler((title, message, buttons) => {
      setState({ title, message, buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }] });
    });
    return () => registerAlertHandler(null);
  }, []);

  const handlePress = (button: AlertButton) => {
    setState(null);
    button.onPress?.();
  };

  const dismiss = () => {
    const cancelButton = state?.buttons.find((button) => button.style === 'cancel');
    setState(null);
    cancelButton?.onPress?.();
  };

  return (
    <Modal visible={!!state} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          {state ? (
            <>
              <Text style={styles.title}>{state.title}</Text>
              {state.message ? <Text style={styles.message}>{state.message}</Text> : null}
              <View style={[styles.buttons, state.buttons.length === 2 && styles.buttonsHorizontal]}>
                {state.buttons.map((button, index) => (
                  <Pressable
                    key={`${button.text}-${index}`}
                    style={[
                      styles.button,
                      state.buttons.length === 2 && styles.buttonHorizontal,
                      state.buttons.length === 2 && index === 1 && styles.buttonHorizontalDivider,
                    ]}
                    onPress={() => handlePress(button)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        button.style === 'destructive' && styles.destructiveText,
                        button.style === 'cancel' && styles.cancelText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </Pressable>
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
      maxWidth: 340,
      backgroundColor: colors.background,
      borderRadius: Metrics.radius.lg,
      paddingTop: Metrics.spacing.lg,
      paddingHorizontal: Metrics.spacing.lg,
      overflow: 'hidden',
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: Metrics.spacing.xs,
    },
    buttons: {
      marginTop: Metrics.spacing.lg,
      marginHorizontal: -Metrics.spacing.lg,
    },
    buttonsHorizontal: {
      flexDirection: 'row',
    },
    button: {
      paddingVertical: Metrics.spacing.md,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    buttonHorizontal: {
      flex: 1,
    },
    buttonHorizontalDivider: {
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    destructiveText: {
      color: colors.destructive,
    },
    cancelText: {
      color: colors.mutedForeground,
    },
  });
