import type { PropsWithChildren } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Metrics, Overlays } from '@/theme';

type PlantHeroProps = PropsWithChildren<{
  photoUrl: string;
  name: string;
  species?: string | null;
  onPress?: () => void;
  disabled?: boolean;
}>;

export function PlantHero({ photoUrl, name, species, onPress, disabled, children }: PlantHeroProps) {
  const content = (
    <ImageBackground source={{ uri: photoUrl }} style={styles.hero}>
      <View style={styles.scrim}>
        <Text style={styles.name}>{name}</Text>
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
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  species: {
    fontSize: 15,
    fontStyle: 'italic',
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
});
