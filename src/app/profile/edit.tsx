import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { Avatar, LoadingScreen } from '@/components';
import { useAuth } from '@/hooks';
import { getProfile, updateProfile, uploadAvatar } from '@/services';
import { normalizeUsername, Toast, validateUsername } from '@/utils';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
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
      Toast.error('Precisamos de acesso à sua galeria para escolher uma foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
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
      Toast.error('Digite seu nome.');
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

      await updateProfile(user.id, {
        name: trimmedName,
        username: normalizeUsername(username),
        avatar_url: finalAvatarUrl,
      });
      Toast.success('Perfil atualizado com sucesso!');
      router.back();
    } catch (err: any) {
      Toast.error(err.message || 'Não foi possível atualizar o perfil.');
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return <LoadingScreen size="large" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarContainer} onPress={handlePickImage}>
            <Avatar 
              name={name || user?.email || 'User'} 
              url={localAvatarUri || avatarUrl} 
              size={100} 
            />
            <View style={styles.cameraBadge}>
              <Camera size={20} color={Colors.white} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Toque para alterar a foto</Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome de exibição</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor={Colors.mutedForeground}
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome de usuário (Username)</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="seunome"
            placeholderTextColor={Colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Único no sistema. Só letras minúsculas, números e underline, começando com uma letra. De 3 a 20
            caracteres, sem espaços.
          </Text>
        </View>

        <Pressable 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving || uploadingAvatar ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Salvar alterações</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  form: {
    padding: Metrics.spacing.lg,
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
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  avatarHint: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  inputGroup: {
    gap: Metrics.spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Metrics.radius.md,
    paddingHorizontal: Metrics.spacing.md,
    paddingVertical: Metrics.spacing.md,
    fontSize: 16,
    color: Colors.foreground,
  },
  hint: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  saveButton: {
    backgroundColor: Colors.primary,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
});
