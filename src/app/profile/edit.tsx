import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Camera from 'lucide-react-native/icons/camera';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { Avatar, FloatingScreenControls, FormField, IconBadge, ScreenHeader, SkeletonBlock, useScreenTopInset } from '@/components';
import { ComposeFooter, COMPOSE_FOOTER_CLEARANCE } from '@/components/compose/ComposeFooter';
import { useAuth } from '@/hooks';
import { getProfile, updateProfile, uploadAvatar, UsernameTakenError } from '@/services';
import { normalizeUsername, Toast, validateUsername } from '@/utils';

function EditProfileSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.skeleton}>
      <SkeletonBlock width={Metrics.size.hero} height={Metrics.size.hero} radius={Metrics.radius.full} />
      <SkeletonBlock height={Metrics.size.xl} radius={Metrics.radius.md} />
      <SkeletonBlock height={Metrics.size.xl} radius={Metrics.radius.md} />
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = useScreenTopInset();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const profile = await getProfile(user.id);
        if (profile) {
          setName(profile.name || '');
          setUsername(profile.username || '');
          setAvatarUrl(profile.avatar_url || null);
        } else {
          setName(user.user_metadata?.full_name || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.error(t('galleryPermissionError'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  };

  const validate = (): string | null => {
    if (!name.trim()) return t('nameRequiredError');
    return validateUsername(username);
  };

  const handleSave = async () => {
    if (!user) return;

    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setSaving(true);
    try {
      const finalAvatarUrl = localAvatarUri ? await uploadAvatar(user.id, localAvatarUri) : avatarUrl;
      const updated = await updateProfile(user.id, {
        name: name.trim(),
        username: normalizeUsername(username),
        avatar_url: finalAvatarUrl,
      });
      queryClient.setQueryData(['profile', user.id], updated);
      Toast.success(t('profileUpdatedSuccess'));
      router.back();
    } catch (err) {
      console.error(err);
      setError(err instanceof UsernameTakenError ? err.message : t('profileUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: insets.bottom + COMPOSE_FOOTER_CLEARANCE }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={COMPOSE_FOOTER_CLEARANCE}
      >
        <ScreenHeader title={t('editProfileTitle')} />

        {loading ? (
          <EditProfileSkeleton />
        ) : (
          <View>
            <Pressable
              style={styles.avatarSection}
              onPress={handlePickImage}
              accessibilityRole="button"
              accessibilityLabel={t('changePhotoHint')}
            >
              <View>
                <Avatar name={name || user?.email || ''} url={localAvatarUri || avatarUrl} size={Metrics.size.hero} />
                <IconBadge backgroundColor={colors.primary} style={styles.cameraBadge}>
                  <Camera size={Metrics.icon.small} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
                </IconBadge>
              </View>
              <Text style={styles.avatarHint}>{t('changePhotoHint')}</Text>
            </Pressable>

            <FormField
              label={t('displayNameLabel')}
              value={name}
              onChangeText={setName}
              placeholder={t('displayNamePlaceholder')}
              autoCorrect={false}
            />

            <View>
              <FormField
                label={t('usernameLabel')}
                value={username}
                onChangeText={setUsername}
                placeholder={t('usernamePlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>{t('usernameHint')}</Text>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      <ComposeFooter label={t('saveChanges')} onPress={handleSave} loading={saving} disabled={loading} error={error} />
      <FloatingScreenControls />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
    },
    avatarSection: {
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      marginBottom: Metrics.spacing.lg,
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      borderWidth: 2,
      borderColor: colors.background,
    },
    avatarHint: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
    },
    hint: {
      ...Typography.caption,
      color: colors.mutedForeground,
      marginTop: -Metrics.spacing.sm,
    },
    skeleton: {
      alignItems: 'center',
      gap: Metrics.spacing.lg,
    },
  });
