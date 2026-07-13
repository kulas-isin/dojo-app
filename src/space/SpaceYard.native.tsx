import { Pressable, StyleSheet, View } from 'react-native';
import { AvatarView } from '../avatar/AvatarView';
import { DEFAULT_PET } from '../avatar/sprite';
import { colors, radius } from '../theme';
import type { SpaceYardProps } from './types';

/** 原生版簡化院子：靜態展示寵物（完整互動院子先在 web 體驗）。 */
export function SpaceYard({ pets, onPetTap }: SpaceYardProps) {
  return (
    <View style={styles.yard}>
      {pets.map((p) => (
        <Pressable key={p.id} onPress={() => onPetTap(p.id)}>
          <AvatarView size={56} pet={p.avatar ?? DEFAULT_PET} petType={p.petType} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  yard: {
    height: 150,
    borderRadius: radius.md,
    backgroundColor: '#74ab82',
    borderWidth: 3,
    borderColor: colors.text,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
});
