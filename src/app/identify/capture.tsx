import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ImageIcon from 'lucide-react-native/icons/image';
import Scan from 'lucide-react-native/icons/scan';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import { Metrics, Overlays, useColors, type ThemeColors } from '@/theme';
import { OfflineBanner } from '@/components';
import { useAuth, useCreditCosts, useCreditsGate, useNetworkStatus } from '@/hooks';
import { diagnosePlant, identifyPlant, InsufficientCreditsError } from '@/services';
import type { PlantDiagnosis } from '@/types';
import { Alert, requireLogin, Toast } from '@/utils';
import { useTranslation } from '@/i18n';

const PLANT_SCANNING_ANIMATION = require('../../../assets/animations/plant-scanning.json');

type CaptureMode = 'identify' | 'diagnose';

function getModeCopy(
  t: (key: string, options?: Record<string, unknown>) => string
): Record<CaptureMode, { title: string; subtitle: string; loading: string; loginMessage: string }> {
  return {
    identify: {
      title: t('identifyTitle'),
      subtitle: t('identifySubtitle'),
      loading: t('identifyLoading'),
      loginMessage: t('identifyLoginMessage'),
    },
    diagnose: {
      title: t('diagnoseTitle'),
      subtitle: t('diagnoseSubtitle'),
      loading: t('diagnoseLoading'),
      loginMessage: t('diagnoseLoginMessage'),
    },
  };
}

type ModeToggleProps = {
  mode: CaptureMode;
  onChange: (mode: CaptureMode) => void;
};

function ModeToggle({ mode, onChange }: Readonly<ModeToggleProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('photo');
  return (
    <View style={styles.toggle}>
      <Pressable
        style={[styles.toggleOption, mode === 'identify' && styles.toggleOptionActive]}
        onPress={() => onChange('identify')}
      >
        <Scan size={15} color={mode === 'identify' ? colors.leaf : colors.white} strokeWidth={2} />
        <Text style={[styles.toggleText, mode === 'identify' && styles.toggleTextActive]}>{t('toggleIdentify')}</Text>
      </Pressable>
      <Pressable
        style={[styles.toggleOption, mode === 'diagnose' && styles.toggleOptionActive]}
        onPress={() => onChange('diagnose')}
      >
        <Stethoscope size={15} color={mode === 'diagnose' ? colors.leaf : colors.white} strokeWidth={2} />
        <Text style={[styles.toggleText, mode === 'diagnose' && styles.toggleTextActive]}>{t('toggleDiagnose')}</Text>
      </Pressable>
    </View>
  );
}

export default function CaptureScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ mode?: string }>();
  const cameraRef = useRef<CameraView>(null);
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  const [permission, requestPermission] = useCameraPermissions();
  const { session, user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const { canAffordCost, applyCreditBalance } = useCreditsGate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('photo');
  const [mode, setMode] = useState<CaptureMode>(params.mode === 'diagnose' ? 'diagnose' : 'identify');
  const [isProcessing, setIsProcessing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (params.mode === 'diagnose' || params.mode === 'identify') {
        setMode(params.mode);
      }
    }, [params.mode])
  );

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    if (!isFocused) return;

    const immediate = setImmediate(() => setIsCameraReady(true));
    return () => {
      clearImmediate(immediate);
      setIsCameraReady(false);
    };
  }, [isFocused]);

  const copy = getModeCopy(t)[mode];
  const creditCosts = useCreditCosts();
  const creditCost = mode === 'identify' ? creditCosts.identification : creditCosts.diagnosis;

  const showInsufficientCreditsAlert = () => {
    Alert.alert(t('insufficientCreditsTitle'), t('insufficientCreditsMessage', { cost: creditCost }), [
      { text: t('notNowOption'), style: 'cancel' },
      { text: t('seePlansOption'), onPress: () => router.push('/profile/plans') },
    ]);
  };

  const navigateIfFocused = (href: Href) => {
    if (isFocusedRef.current) router.replace(href);
  };

  const processIdentify = async (photoUri: string) => {
    const { candidates, newCreditBalance } = await identifyPlant(photoUri);
    applyCreditBalance(newCreditBalance);
    navigateIfFocused({ pathname: '/identify/result', params: { candidates: JSON.stringify(candidates) } });
  };

  const processDiagnose = async (photoUri: string) => {
    if (!user?.id) return;
    const { diagnosis, newCreditBalance } = await diagnosePlant(user.id, photoUri);
    applyCreditBalance(newCreditBalance);
    if (diagnosis) {
      queryClient.setQueryData<PlantDiagnosis[]>(['diagnosis-history', user.id], (current = []) => [diagnosis, ...current]);
    }
    navigateIfFocused({ pathname: '/diagnose/result', params: diagnosis ? { diagnosis: JSON.stringify(diagnosis) } : {} });
  };

  const processPhoto = async (photoUri: string) => {
    setIsProcessing(true);

    try {
      await (mode === 'identify' ? processIdentify(photoUri) : processDiagnose(photoUri));
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        if (isFocusedRef.current) showInsufficientCreditsAlert();
      } else {
        Toast.error(err instanceof Error ? err.message : t('processPhotoError'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const hasCredits = () => {
    if (!canAffordCost(creditCost)) {
      showInsufficientCreditsAlert();
      return false;
    }
    return true;
  };

  const handleCapture = async () => {
    if (isOffline) return;
    if (!requireLogin(router, !!session, copy.loginMessage)) return;
    if (!hasCredits()) return;

    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      await processPhoto(photo.uri);
    }
  };

  const handlePickFromGallery = async () => {
    if (isOffline) return;
    if (!requireLogin(router, !!session, copy.loginMessage)) return;
    if (!hasCredits()) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Toast.error(t('galleryPermissionError'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      await processPhoto(result.assets[0].uri);
    }
  };

  const backButton = (
    <Pressable style={[styles.backButton, { top: insets.top + Metrics.spacing.sm }]} onPress={() => router.back()} hitSlop={8}>
      <ArrowLeft size={Metrics.icon.normal} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
    </Pressable>
  );

  if (isProcessing) {
    return (
      <View style={styles.centered}>
        <LottieView source={PLANT_SCANNING_ANIMATION} autoPlay loop style={styles.loadingAnimation} />
        <Text style={styles.loadingText}>{copy.loading}</Text>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.centered} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <ModeToggle mode={mode} onChange={setMode} />
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{t('cameraPermissionMessage')}</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>{t('allowCameraCta')}</Text>
        </Pressable>
        <Pressable onPress={handlePickFromGallery}>
          <Text style={styles.galleryLink}>{t('chooseFromGalleryCta')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isCameraReady ? (
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      ) : (
        <View style={styles.camera} />
      )}

      {backButton}

      <View style={styles.overlayTop}>
        <ModeToggle mode={mode} onChange={setMode} />
        <Text style={styles.overlayTitle}>{copy.title}</Text>
        <Text style={styles.overlaySubtitle}>{copy.subtitle}</Text>
        {isOffline ? (
          <View style={styles.offlineBanner}>
            <OfflineBanner message={t('offlineMessage')} />
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.galleryButton} onPress={handlePickFromGallery} disabled={isOffline}>
          <ImageIcon size={Metrics.icon.normal} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>

        <Pressable style={styles.captureButton} onPress={handleCapture} disabled={isOffline}>
          <View style={styles.captureButtonInner} />
        </Pressable>

        <View style={styles.controlsSpacer} />
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  centered: {
    ...Metrics.layout.centeredContent,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: Metrics.spacing.lg,
  },
  loadingAnimation: {
    width: 220,
    height: 220,
  },
  loadingText: {
    fontSize: 15,
    color: colors.mutedForeground,
    marginTop: Metrics.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.foreground,
    textAlign: 'center',
    marginTop: Metrics.spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: Metrics.spacing.xs,
    marginBottom: Metrics.spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.md,
    paddingHorizontal: Metrics.spacing.xl,
  },
  permissionButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    fontSize: 16,
  },
  galleryLink: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginTop: Metrics.spacing.lg,
  },
  backButton: {
    position: 'absolute',
    left: Metrics.spacing.lg,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: Metrics.radius.full,
    backgroundColor: Overlays.scrimLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Metrics.spacing.lg,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginTop: Metrics.spacing.md,
  },
  overlaySubtitle: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: Metrics.spacing.xs,
  },
  offlineBanner: {
    marginTop: Metrics.spacing.md,
    marginHorizontal: -Metrics.spacing.lg,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Overlays.scrimLight,
    borderRadius: Metrics.radius.full,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Metrics.radius.full,
  },
  toggleOptionActive: {
    backgroundColor: colors.white,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  toggleTextActive: {
    color: colors.leaf,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Metrics.spacing.xl,
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: Metrics.radius.full,
    backgroundColor: Overlays.whiteTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: Metrics.radius.full,
    borderWidth: 4,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.white,
  },
  controlsSpacer: {
    width: 48,
    height: 48,
  },
  });
