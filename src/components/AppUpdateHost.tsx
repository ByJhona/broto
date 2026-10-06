import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Sprout from 'lucide-react-native/icons/sprout';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { checkForAppUpdate } from '@/services/appVersion';
import { BottomSheet } from './BottomSheet';
import { IconBadge } from './IconBadge';
import { Button } from './Button';
import { TextButton } from './TextButton';

export function AppUpdateHost() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('nav');
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkForAppUpdate().then((result) => {
      if (!result?.updateAvailable) return;
      setStoreUrl(result.storeUrl);
      setVisible(true);
    });
  }, []);

  const handleClose = () => setVisible(false);

  const handleUpdate = () => {
    setVisible(false);
    if (storeUrl) Linking.openURL(storeUrl);
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={styles.header}>
        <IconBadge size={Metrics.size.hero} backgroundColor={`${colors.leaf}1F`}>
          <Sprout size={Metrics.icon.xl} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
        </IconBadge>
        <Text style={styles.title}>{t('updateAvailableTitle')}</Text>
        <Text style={styles.message}>{t('updateAvailableMessage')}</Text>
      </View>
      <Button label={t('updateNow')} onPress={handleUpdate} />
      <TextButton label={t('updateLater')} onPress={handleClose} style={styles.later} />
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      marginBottom: Metrics.spacing.lg,
    },
    title: {
      ...Typography.title,
      color: colors.foreground,
      textAlign: 'center',
      marginTop: Metrics.spacing.sm,
    },
    message: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    later: {
      marginTop: Metrics.spacing.sm,
    },
  });
