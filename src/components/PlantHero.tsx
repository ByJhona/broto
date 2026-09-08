import type { PropsWithChildren } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { Colors, Metrics, Overlays } from '@/theme';

type PlantHeroProps = PropsWithChildren<{
  photoUrl: string;
  name: string;
  species?: string | null;
  onPress?: () => void;
  disabled?: boolean;
  onEditName?: () => void;
}>;

export function PlantHero({ photoUrl, name, species, onPress, disabled, onEditName, children }: PlantHeroProps) {
  const content = (
    <ImageBackground source={{ uri: photoUrl }} style={styles.hero}>
      <View style={styles.scrim}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          {onEditName ? (
            <Pressable onPress={onEditName} hitSlop={8} style={styles.editNameButton}>
              <Pencil size={16} color={Colors.white} strokeWidth={Metrics.icon.strokeWidth} />
            </Pressable>
          ) : null}
        </View>
        {species ? <Text style={styles.species}>{species}</Text> : null}
      </View>
      {children}
    </ImageBackground>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 340,
    justifyContent: 'flex-end',
    backgroundColor: Colors.muted,
  },
  scrim: {
    backgroundColor: Overlays.scrim,
    paddingHorizontal: Metrics.spacing.lg,
    paddingVertical: Metrics.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  editNameButton: {
    padding: 4,
  },
  species: {
    fontSize: 15,
    fontStyle: 'italic',
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
});
