import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ImagePlus from 'lucide-react-native/icons/image-plus';
import { Metrics, type ThemeColors, useColors, useThemedStyles, Typography } from '@/theme';
import { Avatar, FilterChipRow, FloatingScreenControls, IconButton } from '@/components';
import { ComposeFooter, COMPOSE_FOOTER_CLEARANCE } from '@/components/compose/ComposeFooter';
import { PostPhotoStrip } from '@/components/communityPost/PostPhotoStrip';
import { celebrateXpLevelUp, useActiveRestriction, useAuth } from '@/hooks';
import { addPostToFeeds, createPost, getPostById, getProfile, MAX_POST_PHOTOS } from '@/services';
import { COMMUNITY_POST_TYPE, type CommunityPostType } from '@/types';
import { communityPostTypeColor, communityPostTypes, pickPhoto, Toast } from '@/utils';
import { useTranslation } from '@/i18n';

const SHORT_POST_MAX_LENGTH = 120;

function initialPostType(type: string | undefined): CommunityPostType | null {
  return Object.values(COMMUNITY_POST_TYPE).find((value) => value === type) ?? null;
}

function PostAuthorRow() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('post');
  const { user } = useAuth();
  const { data: profile = null } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  return (
    <View style={styles.author}>
      <Avatar name={profile?.name ?? ''} url={profile?.avatar_url} size={Metrics.size.md} />
      <View style={styles.authorText}>
        <Text style={styles.authorName} numberOfLines={1}>
          {profile?.name ?? ''}
        </Text>
        <Text style={styles.authorCaption}>{t('postingTo')}</Text>
      </View>
    </View>
  );
}

export default function NewPostScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation(['post', 'community', 'common']);
  const [text, setText] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [postType, setPostType] = useState<CommunityPostType | null>(() => initialPostType(type));
  const [isPosting, setIsPosting] = useState(false);
  const restriction = useActiveRestriction();
  const canPost = text.trim().length > 0 || imageUris.length > 0;
  const canAddPhoto = imageUris.length < MAX_POST_PHOTOS && !isPosting;
  const isShortPost = text.length <= SHORT_POST_MAX_LENGTH;
  const postTypeOptions = communityPostTypes().map((option) => ({
    ...option,
    color: communityPostTypeColor(option.value, colors),
  }));

  const handleAddPhoto = async () => {
    const uri = await pickPhoto();
    if (uri) setImageUris((current) => [...current, uri]);
  };

  const handleRemovePhoto = (uri: string) => setImageUris((current) => current.filter((item) => item !== uri));

  const handleSelectPostType = (value: CommunityPostType) =>
    setPostType((current) => (current === value ? null : value));

  const handlePost = async () => {
    if (!user?.id || !canPost) return;
    setIsPosting(true);
    try {
      const postId = await createPost(user.id, text.trim(), imageUris, postType);
      const post = await getPostById(postId, user.id);
      if (post) addPostToFeeds(queryClient, post);
      await celebrateXpLevelUp(queryClient, user.id);
      router.back();
    } catch (err) {
      console.error(err);
      Toast.error(t('community:createPostError'));
    } finally {
      setIsPosting(false);
    }
  };

  const photoButton = (
    <IconButton
      accessibilityLabel={t('common:addPhoto')}
      size={Metrics.size.xl}
      disabled={!canAddPhoto}
      style={styles.photoButton}
      onPress={handleAddPhoto}
    >
      <ImagePlus
        size={Metrics.icon.normal}
        color={canAddPhoto ? colors.leaf : colors.mutedForeground}
        strokeWidth={Metrics.icon.stroke.regular}
      />
    </IconButton>
  );

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Metrics.spacing.sm,
          paddingBottom: insets.bottom + COMPOSE_FOOTER_CLEARANCE,
        }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={COMPOSE_FOOTER_CLEARANCE}
      >
        <View style={styles.content}>
          <PostAuthorRow />

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('community:composerPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel={t('postTextLabel')}
            editable={!isPosting}
            multiline
            autoFocus
            style={[styles.text, isShortPost ? styles.textShort : styles.textLong]}
          />

          <PostPhotoStrip photoUris={imageUris} onRemove={handleRemovePhoto} />

          <Text style={styles.typeLabel}>{t('postTypeLabel')}</Text>
          <FilterChipRow wrap options={postTypeOptions} selected={postType ? [postType] : []} onChange={handleSelectPostType} />
        </View>
      </KeyboardAwareScrollView>

      <ComposeFooter
        label={t('community:postButtonLabel')}
        onPress={handlePost}
        loading={isPosting}
        disabled={!canPost || restriction !== null}
        error={restriction}
        leading={photoButton}
      />
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
    author: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      marginLeft: Metrics.size.md,
      marginBottom: Metrics.spacing.xl,
    },
    authorText: {
      flex: 1,
    },
    authorName: {
      ...Typography.heading,
      color: colors.foreground,
    },
    authorCaption: {
      ...Typography.caption,
      color: colors.mutedForeground,
    },
    text: {
      color: colors.foreground,
      padding: 0,
      minHeight: Metrics.media.sm,
      textAlignVertical: 'top',
      marginBottom: Metrics.spacing.lg,
    },
    textShort: {
      ...Typography.headline,
    },
    textLong: {
      ...Typography.body,
    },
    typeLabel: {
      ...Typography.label,
      color: colors.mutedForeground,
      marginBottom: Metrics.spacing.sm,
    },
    photoButton: {
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
    },
  });
