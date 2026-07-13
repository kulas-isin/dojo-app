import Svg, { Rect } from 'react-native-svg';
import type { PetType } from '../types';
import {
  AVATAR_VIEWBOX,
  petRects,
  trainerRects,
  type PetAvatar,
  type TrainerAvatar,
} from './sprite';

interface Props {
  size?: number;
  /** 訓練家造型 */
  trainer?: TrainerAvatar;
  /** 寵物造型（需搭配 petType 決定貓/狗外型）*/
  pet?: PetAvatar;
  petType?: PetType;
}

/** 用 SVG 畫像素角色，web 與原生皆可用（對戰、個人頁、編輯預覽共用）。 */
export function AvatarView({ size = 120, trainer, pet, petType = 'cat' }: Props) {
  const rects = trainer ? trainerRects(trainer) : pet ? petRects(pet, petType) : [];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${AVATAR_VIEWBOX} ${AVATAR_VIEWBOX}`}>
      {rects.map((r, i) => (
        <Rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} />
      ))}
    </Svg>
  );
}
