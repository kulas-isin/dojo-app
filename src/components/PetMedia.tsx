import { ResizeMode, Video } from 'expo-av';
import { DimensionValue, Image, StyleSheet, View } from 'react-native';
import type { MediaType } from '../types';
import { colors } from '../theme';

interface Props {
  uri: string;
  type: MediaType;
  height?: number;
  /** 寬度，預設撐滿容器；列表縮圖請傳固定數值（例如與 height 相同做成正方形） */
  width?: DimensionValue;
  rounded?: number;
  muted?: boolean;
}

export function PetMedia({
  uri,
  type,
  height = 220,
  width = '100%',
  rounded = 0,
  muted = true,
}: Props) {
  if (type === 'video') {
    return (
      <Video
        source={{ uri }}
        style={[styles.media, { width, height, borderRadius: rounded }]}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted={muted}
        shouldPlay
        useNativeControls={false}
      />
    );
  }
  return (
    <View style={[styles.media, { width, height, borderRadius: rounded, overflow: 'hidden' }]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  media: {
    backgroundColor: colors.cardAlt,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
