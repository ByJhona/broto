import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Camera from 'lucide-react-native/icons/camera';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { Avatar, LoadingScreen, ScreenContent } from '@/components';
import { useAuth } from '@/hooks';
import { getProfile, updateProfile, uploadAvatar } from '@/services';
import { normalizeUsername, Toast, validateUsername } from '@/utils';

export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!user) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Toast.error(t('nameRequiredError'));
      return;
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      Toast.error(usernameError);
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;

      if (localAvatarUri) {
        setUploadingAvatar(true);
        finalAvatarUrl = await uploadAvatar(user.id, localAvatarUri);
        setUploadingAvatar(false);
      }

      const updated = await updateProfile(user.id, {
        name: trimmedName,
        username: normalizeUsername(username),
        avatar_url: finalAvatarUrl,
      });
      queryClient.setQueryData(['profile', user.id], updated);
      Toast.success(t('profileUpdatedSuccess'));
      router.back();
    } catch (err: any) {
      Toast.error(err.message || t('profileUpdateError'));
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return <LoadingScreen size="large" />;
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Metrics.spacing.xl }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={Metrics.spacing.lg}
    >
      <ScreenContent style={styles.form}>
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarContainer} onPress={handlePickImage}>
            <Avatar 
              name={name || user?.email || 'User'} 
              url={localAvatarUri || avatarUrl} 
              size={Metrics.size.hero} 
            />
            <View style={styles.cameraBadge}>
              <Camera size={Metrics.icon.small} color={colors.white} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>{t('changePhotoHint')}</Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('displayNameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('displayNamePlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('usernameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder={t('usernamePlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>{t('usernameHint')}</Text>
        </View>

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving || uploadingAvatar ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
          )}
        </Pressable>
      </ScreenContent>
    </KeyboardAwareScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  form: {
    gap: Metrics.spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Metrics.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Metrics.spacing.sm,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: Metrics.size.md,
    height: Metrics.size.md,
    borderRadius: Metrics.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  avatarHint: {
    ...Typography.bodySmall,
    color: colors.mutedForeground,
  },
  inputGroup: {
    gap: Metrics.spacing.sm,
  },
  label: {
    ...Typography.label,
    color: colors.foreground,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Metrics.radius.md,
    paddingHorizontal: Metrics.spacing.md,
    paddingVertical: Metrics.spacing.md,
    ...Typography.input,
    color: colors.foreground,
  },
  hint: {
    ...Typography.caption,
    color: colors.mutedForeground,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Metrics.spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...Typography.heading,
    color: colors.white,
  },
  });
