import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Metrics, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { registerActionSheetHandler, type AlertButton } from '@/utils';
import { BottomSheet } from './BottomSheet';

type ActionSheetState = {
  title: string;
  buttons: AlertButton[];
};

type ActionRowProps = {
  button: AlertButton;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
};

function ActionRow({ button, onPress, styles }: Readonly<ActionRowProps>) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <Text style={[styles.rowText, button.style === 'destructive' && styles.rowTextDestructive]}>{button.text}</Text>
    </Pressable>
  );
}

export function ActionSheetHost() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const [sheet, setSheet] = useState<ActionSheetState | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerActionSheetHandler((title, buttons) => {
      setSheet({ title, buttons });
      setVisible(true);
    });
    return () => registerActionSheetHandler(null);
  }, []);

  const actions = sheet?.buttons.filter((button) => button.style !== 'cancel') ?? [];
  const cancelButton = sheet?.buttons.find((button) => button.style === 'cancel');

  const handleSelect = (button: AlertButton) => {
    setVisible(false);
    button.onPress?.();
  };

  const handleDismiss = () => {
    setVisible(false);
    cancelButton?.onPress?.();
  };

  return (
    <BottomSheet visible={visible} onClose={handleDismiss} sheetStyle={styles.sheet}>
      {sheet ? <Text style={styles.title}>{sheet.title}</Text> : null}
      <ScrollView>
        {actions.map((button, index) => (
          <ActionRow key={`${button.text}-${index}`} button={button} onPress={() => handleSelect(button)} styles={styles} />
        ))}
      </ScrollView>
      <Pressable accessibilityRole="button" style={styles.cancel} onPress={handleDismiss}>
        <Text style={styles.cancelText}>{cancelButton?.text ?? t('cancel')}</Text>
      </Pressable>
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sheet: {
      maxHeight: '80%',
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      marginBottom: Metrics.spacing.sm,
    },
    row: {
      paddingVertical: Metrics.spacing.md,
      paddingHorizontal: Metrics.spacing.sm,
      marginHorizontal: -Metrics.spacing.sm,
      borderRadius: Metrics.radius.md,
    },
    rowPressed: {
      backgroundColor: colors.muted,
    },
    rowText: {
      ...Typography.headingMedium,
      color: colors.foreground,
    },
    rowTextDestructive: {
      color: colors.destructive,
    },
    cancel: {
      alignItems: 'center',
      paddingVertical: Metrics.spacing.md,
      marginTop: Metrics.spacing.sm,
      borderRadius: Metrics.radius.full,
      backgroundColor: colors.muted,
    },
    cancelText: {
      ...Typography.headingMedium,
      color: colors.foreground,
    },
  });
