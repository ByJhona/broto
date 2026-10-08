import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Metrics, type ThemeColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { acceptTerms, getProfile } from '@/services';
import type { UserProfile } from '@/types';
import { Toast } from '@/utils';
import { Button } from './Button';
import { LegalDocument, LegalDocumentFooter } from './LegalDocument';

export function TermsGate({ userId }: Readonly<{ userId: string }>) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('moderation');
  const queryClient = useQueryClient();
  const [isAccepting, setIsAccepting] = useState(false);
  const { data: profile } = useQuery({ queryKey: ['profile', userId], queryFn: () => getProfile(userId) });

  if (!profile || profile.terms_accepted_at) return null;

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const acceptedAt = await acceptTerms(userId);
      queryClient.setQueryData<UserProfile | null>(['profile', userId], (current) =>
        current ? { ...current, terms_accepted_at: acceptedAt } : current
      );
    } catch (err) {
      console.error(err);
      Toast.error(t('termsAcceptError'));
      setIsAccepting(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <LegalDocument
        namespace="terms"
        title={t('termsGateTitle')}
        lead={t('termsGateIntro')}
        topInset={insets.top + Metrics.spacing.lg}
        bottomInset={Metrics.spacing.lg}
      />
      <LegalDocumentFooter>
        <View style={{ paddingBottom: insets.bottom + Metrics.spacing.md }}>
          <Button label={t('termsAccept')} onPress={handleAccept} loading={isAccepting} />
        </View>
      </LegalDocumentFooter>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.background,
    },
  });
