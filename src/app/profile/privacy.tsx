import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '@/i18n';

export default function PrivacyScreen() {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t('privacyTitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontWeight: 'bold' },
});
