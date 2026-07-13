import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import type { PetType } from '../types';
import { AvatarView } from './AvatarView';
import {
  PET_CONTROLS,
  TRAINER_CONTROLS,
  randomPet,
  randomTrainer,
  type Control,
  type PetAvatar,
  type TrainerAvatar,
} from './sprite';

type TrainerProps = {
  kind: 'trainer';
  value: TrainerAvatar;
  onChange: (v: TrainerAvatar) => void;
  petType?: undefined;
};
type PetProps = {
  kind: 'pet';
  value: PetAvatar;
  onChange: (v: PetAvatar) => void;
  petType: PetType;
};

/** 捏臉編輯器：即時預覽 + 切換部位／換色。訓練家與寵物共用。 */
export function AvatarEditor(props: TrainerProps | PetProps) {
  const controls: Control[] = props.kind === 'trainer' ? TRAINER_CONTROLS : PET_CONTROLS;
  const value = props.value as unknown as Record<string, number>;

  const setKey = (k: string, v: number) => props.onChange({ ...(props.value as any), [k]: v });
  const randomize = () =>
    props.kind === 'trainer'
      ? (props.onChange as (v: TrainerAvatar) => void)(randomTrainer())
      : (props.onChange as (v: PetAvatar) => void)(randomPet());

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <View style={styles.preview}>
          {props.kind === 'trainer' ? (
            <AvatarView size={150} trainer={props.value} />
          ) : (
            <AvatarView size={150} pet={props.value} petType={props.petType} />
          )}
        </View>
        <Pressable style={styles.dice} onPress={randomize}>
          <Text style={styles.diceText}>🎲</Text>
        </Pressable>
      </View>

      <View style={styles.rows}>
        {controls.map((ctrl) => (
          <View key={ctrl.k} style={styles.row}>
            <Text style={styles.rowLabel}>{ctrl.lab}</Text>
            {ctrl.type === 'pick' ? (
              <View style={styles.pick}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => setKey(ctrl.k, (value[ctrl.k] - 1 + ctrl.opt.length) % ctrl.opt.length)}
                >
                  <Text style={styles.stepText}>◀</Text>
                </Pressable>
                <Text style={styles.pickVal}>{ctrl.opt[value[ctrl.k]]}</Text>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => setKey(ctrl.k, (value[ctrl.k] + 1) % ctrl.opt.length)}
                >
                  <Text style={styles.stepText}>▶</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.swatches}>
                {ctrl.pal.map((col, i) => (
                  <Pressable
                    key={col}
                    onPress={() => setKey(ctrl.k, i)}
                    style={[styles.sw, { backgroundColor: col }, value[ctrl.k] === i && styles.swOn]}
                  />
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  stage: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  preview: {
    width: 176,
    height: 176,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.text,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dice: {
    position: 'absolute',
    top: 8,
    right: '50%',
    marginRight: -84,
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceText: { fontSize: 18 },
  rows: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowLabel: { width: 44, color: colors.textDim, fontWeight: font.weight.bold, fontSize: font.size.sm },
  pick: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontWeight: font.weight.heavy, fontSize: 13 },
  pickVal: { minWidth: 52, textAlign: 'center', color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.sm },
  swatches: { marginLeft: 'auto', flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', flex: 1 },
  sw: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(0,0,0,.25)' },
  swOn: { borderWidth: 3, borderColor: colors.text },
});
