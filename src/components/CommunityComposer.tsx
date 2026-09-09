import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ImagePlus from 'lucide-react-native/icons/image-plus';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { CommunityPostType } from '@/types';
import { COMMUNITY_POST_TYPES } from '@/utils';

type CommunityComposerProps = {
  onPost: (text: string, imageUri: string | null, postType: CommunityPostType | null) => void;
};

export function CommunityComposer({ onPost }: Readonly<CommunityComposerProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [postType, setPostType] = useState<CommunityPostType | null>(null);
  const canPost = text.trim().length > 0 || imageUri != null;

  const handleAttachPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = () => {
    if (!canPost) return;
    onPost(text.trim(), imageUri, postType);
    setText('');
    setImageUri(null);
    setPostType(null);
  };

  return (
    <View style={styles.card}>
      <View style={styles.typeRow}>
        {COMMUNITY_POST_TYPES.map((type) => {
          const selected = postType === type.value;
          const Icon = type.icon;
          return (
            <Pressable
              key={type.value}
              style={[styles.typeChip, selected && styles.typeChipActive]}
              onPress={() => setPostType(selected ? null : type.value)}
            >
              <Icon
                size={14}
                color={selected ? colors.primaryForeground : colors.primary}
                strokeWidth={Metrics.icon.strokeWidth}
              />
              <Text style={[styles.typeChipText, selected && styles.typeChipTextActive]}>{type.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="No que você está pensando, jardineiro?"
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
        />
      </View>

      {imageUri ? (
        <View style={styles.preview}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <Pressable style={styles.previewRemove} onPress={() => setImageUri(null)}>
            <X size={Metrics.icon.small} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.attachButton} onPress={handleAttachPhoto}>
          <ImagePlus size={Metrics.icon.normal} color={colors.primary} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.attachButtonText}>Foto</Text>
        </Pressable>

        <Pressable
          style={[styles.postButton, !canPost && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!canPost}
        >
          <Text style={styles.postButtonText}>Publicar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: Metrics.spacing.md,
    marginBottom: Metrics.spacing.lg,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Metrics.spacing.xs,
    marginBottom: Metrics.spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}14`,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.xs,
    paddingHorizontal: Metrics.spacing.sm,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  typeChipTextActive: {
    color: colors.primaryForeground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 72,
    backgroundColor: `${colors.primary}0D`,
    borderRadius: Metrics.radius.lg,
    paddingHorizontal: Metrics.spacing.md,
    paddingVertical: Metrics.spacing.sm,
    fontSize: 14,
    color: colors.foreground,
  },
  preview: {
    marginTop: Metrics.spacing.sm,
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 96,
    height: 96,
    borderRadius: Metrics.radius.md,
    backgroundColor: colors.muted,
  },
  previewRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.destructive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Metrics.spacing.sm,
    paddingTop: Metrics.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
  },
  attachButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  postButton: {
    backgroundColor: colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.lg,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontSize: 14,
  },
  });
