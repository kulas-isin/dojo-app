import { ResizeMode, Video } from 'expo-av';
import { Image, StyleSheet, View } from 'react-native';
import type { MediaType } from '../types';
import { colors } from '../theme';

interface Props {
  uri: string;
  type: MediaType;
  height?: number;
  rounded?: number;
  muted?: boolean;
}

export function PetMedia({ uri, type, height = 220, rounded = 0, muted = true }: Props) {
  if (type === 'video') {
    return (
      <Video
        source={{ uri }}
        style={[styles.media, { height, borderRadius: rounded }]}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted={muted}
        shouldPlay
        useNativeControls={false}
      />
    );
  }
  return (
    <View style={[styles.media, { height, borderRadius: rounded, overflow: 'hidden' }]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  media: {
    width: '100%',
    backgroundColor: colors.cardAlt,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
