import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { MAX_POST_PHOTOS } from '@/services';
import type { CommunityPostType } from '@/types';
import { COMMUNITY_POST_TYPES, pickPhoto } from '@/utils';
import { Card } from './Card';
import { PhotoGrid } from './PhotoGrid';

type CommunityComposerProps = {
  onPost: (text: string, imageUris: string[], postType: CommunityPostType | null) => Promise<void>;
};

export function CommunityComposer({ onPost }: Readonly<CommunityComposerProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [text, setText] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [postType, setPostType] = useState<CommunityPostType | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const canPost = (text.trim().length > 0 || imageUris.length > 0) && !isPosting;

  const handleAttachPhoto = async () => {
    const uri = await pickPhoto();
    if (uri) setImageUris((current) => [...current, uri]);
  };

  const handleRemovePhoto = (uri: string) => {
    setImageUris((current) => current.filter((item) => item !== uri));
  };

  const handlePost = async () => {
    if (!canPost) return;
    setIsPosting(true);
    try {
      await onPost(text.trim(), imageUris, postType);
      setText('');
      setImageUris([]);
      setPostType(null);
    } catch {
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card style={styles.card}>
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
          editable={!isPosting}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.photoGrid}>
        <PhotoGrid photoUrls={imageUris} onAdd={handleAttachPhoto} onRemove={handleRemovePhoto} max={MAX_POST_PHOTOS} disabled={isPosting} />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.postButton, !canPost && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!canPost}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.postButtonText}>Publicar</Text>
          )}
        </Pressable>
      </View>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.primary,
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
  photoGrid: {
    marginTop: Metrics.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Metrics.spacing.sm,
    paddingTop: Metrics.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
  },
  postButton: {
    backgroundColor: colors.primary,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.lg,
    minWidth: 84,
    alignItems: 'center',
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
