import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Scan, Stethoscope } from 'lucide-react-native';
import { Colors, Metrics, Overlays } from '@/theme';
import { OfflineBanner } from '@/components';
import { useAuth, useCreditsGate, useNetworkStatus } from '@/hooks';
import { CREDIT_COSTS, diagnosePlant, identifyPlant, InsufficientCreditsError } from '@/services';
import type { PlantDiagnosis } from '@/types';
import { Alert, requireLogin } from '@/utils';

type CaptureMode = 'identify' | 'diagnose';

const MODE_COPY: Record<CaptureMode, { title: string; subtitle: string; loading: string; loginMessage: string }> = {
  identify: {
    title: 'Que planta é essa?',
    subtitle: 'Aponte a câmera pra folha ou flor da planta',
    loading: 'Identificando sua planta...',
    loginMessage: 'Você precisa de uma conta pra identificar plantas.',
  },
  diagnose: {
    title: 'Como está a sua planta?',
    subtitle: 'Aponte a câmera pra planta que você quer diagnosticar',
    loading: 'Analisando sua planta...',
    loginMessage: 'Você precisa de uma conta pra diagnosticar suas plantas.',
  },
};

type ModeToggleProps = {
  mode: CaptureMode;
  onChange: (mode: CaptureMode) => void;
};

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <View style={styles.toggle}>
      <Pressable
        style={[styles.toggleOption, mode === 'identify' && styles.toggleOptionActive]}
        onPress={() => onChange('identify')}
      >
        <Scan size={15} color={mode === 'identify' ? Colors.leaf : Colors.white} strokeWidth={2} />
        <Text style={[styles.toggleText, mode === 'identify' && styles.toggleTextActive]}>Identificar</Text>
      </Pressable>
      <Pressable
        style={[styles.toggleOption, mode === 'diagnose' && styles.toggleOptionActive]}
        onPress={() => onChange('diagnose')}
      >
        <Stethoscope size={15} color={mode === 'diagnose' ? Colors.leaf : Colors.white} strokeWidth={2} />
        <Text style={[styles.toggleText, mode === 'diagnose' && styles.toggleTextActive]}>Diagnosticar</Text>
      </Pressable>
    </View>
  );
}

export default function PhotoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const cameraRef = useRef<CameraView>(null);
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const { session, user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const { canAffordCost, applyCreditBalance } = useCreditsGate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CaptureMode>(params.mode === 'diagnose' ? 'diagnose' : 'identify');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (params.mode === 'diagnose' || params.mode === 'identify') {
        setMode(params.mode);
      }
    }, [params.mode])
  );

  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    if (!isFocused) return;

    const task = InteractionManager.runAfterInteractions(() => setIsCameraReady(true));
    return () => {
      task.cancel();
      setIsCameraReady(false);
    };
  }, [isFocused]);

  const copy = MODE_COPY[mode];
  const creditCost = mode === 'identify' ? CREDIT_COSTS.identification : CREDIT_COSTS.diagnosis;

  const showInsufficientCreditsAlert = () => {
    Alert.alert(
      'Créditos insuficientes',
      `Essa ação custa ${creditCost} créditos. Veja os planos pra continuar.`,
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Ver planos', onPress: () => router.push('/profile/plans') },
      ]
    );
  };

  const processPhoto = async (photoUri: string) => {
    setError(null);
    setIsProcessing(true);

    try {
      if (mode === 'identify') {
        const { candidates, newCreditBalance } = await identifyPlant(photoUri);
        applyCreditBalance(newCreditBalance);
        router.push({
          pathname: '/identify/result',
          params: { candidates: JSON.stringify(candidates) },
        });
      } else {
        if (!user?.id) return;
        const { diagnosis, newCreditBalance } = await diagnosePlant(user.id, photoUri);
        applyCreditBalance(newCreditBalance);
        if (diagnosis) {
          queryClient.setQueryData<PlantDiagnosis[]>(['diagnosis-history', user.id], (current = []) => [
            diagnosis,
            ...current,
          ]);
        }
        router.push({
          pathname: '/diagnose/result',
          params: diagnosis ? { diagnosis: JSON.stringify(diagnosis) } : {},
        });
      }
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        showInsufficientCreditsAlert();
      } else {
        setError(err instanceof Error ? err.message : 'Não foi possível processar a foto. Tente novamente.');
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
      setError('Precisamos de acesso às suas fotos pra isso.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      await processPhoto(result.assets[0].uri);
    }
  };

  if (isProcessing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
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
        <Text style={styles.subtitle}>Precisamos de acesso à câmera pra tirar a foto da sua planta.</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir câmera</Text>
        </Pressable>
        <Pressable onPress={handlePickFromGallery}>
          <Text style={styles.galleryLink}>Ou escolher da galeria</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
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

      <View style={styles.overlayTop}>
        <ModeToggle mode={mode} onChange={setMode} />
        <Text style={styles.overlayTitle}>{copy.title}</Text>
        <Text style={styles.overlaySubtitle}>{copy.subtitle}</Text>
        {isOffline ? (
          <View style={styles.offlineBanner}>
            <OfflineBanner message="Sem conexão — essa ação exige internet." />
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.galleryButton} onPress={handlePickFromGallery} disabled={isOffline}>
          <ImageIcon size={Metrics.icon.normal} color={Colors.white} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>

        <Pressable style={styles.captureButton} onPress={handleCapture} disabled={isOffline}>
          <View style={styles.captureButtonInner} />
        </Pressable>

        <View style={styles.controlsSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  camera: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Metrics.spacing.lg,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.mutedForeground,
    marginTop: Metrics.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.foreground,
    textAlign: 'center',
    marginTop: Metrics.spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Metrics.spacing.xs,
    marginBottom: Metrics.spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.md,
    paddingHorizontal: Metrics.spacing.xl,
  },
  permissionButtonText: {
    color: Colors.primaryForeground,
    fontWeight: '600',
    fontSize: 16,
  },
  galleryLink: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginTop: Metrics.spacing.lg,
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
    color: Colors.white,
    textAlign: 'center',
    marginTop: Metrics.spacing.md,
  },
  overlaySubtitle: {
    fontSize: 13,
    color: Colors.white,
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
    backgroundColor: Colors.white,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  toggleTextActive: {
    color: Colors.leaf,
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
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: Metrics.radius.full,
    backgroundColor: Colors.white,
  },
  controlsSpacer: {
    width: 48,
    height: 48,
  },
  error: {
    color: Colors.destructive,
    fontSize: 13,
    marginTop: Metrics.spacing.md,
    textAlign: 'center',
  },
});
