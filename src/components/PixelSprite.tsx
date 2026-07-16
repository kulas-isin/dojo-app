import Svg, { Rect } from 'react-native-svg';

/** 一格像素 = [x, y, w, h, color]，座標在 8×8 網格上 */
type Px = [number, number, number, number, string];

const SPRITES: Record<string, Px[]> = {
  // 罐罐（貨幣）
  coin: [
    [2, 0, 4, 1, '#C98A1C'], [2, 7, 4, 1, '#C98A1C'], [1, 1, 1, 6, '#C98A1C'], [6, 1, 1, 6, '#C98A1C'],
    [2, 1, 4, 6, '#FFC94B'], [2, 1, 1, 2, '#FFE49A'],
    [3, 2, 2, 4, '#B37714'],
  ],
  // 星星
  star: [
    [3, 0, 2, 8, '#FFC22E'], [0, 3, 8, 2, '#FFC22E'], [2, 2, 4, 4, '#FFC22E'],
    [1, 2, 1, 1, '#FFC22E'], [6, 2, 1, 1, '#FFC22E'], [1, 5, 1, 1, '#FFC22E'], [6, 5, 1, 1, '#FFC22E'],
    [3, 2, 1, 1, '#FFF0A8'],
  ],
  // 愛心
  heart: [
    [1, 1, 2, 1, '#E8536A'], [5, 1, 2, 1, '#E8536A'], [0, 2, 8, 2, '#E8536A'],
    [1, 4, 6, 1, '#E8536A'], [2, 5, 4, 1, '#E8536A'], [3, 6, 2, 1, '#E8536A'],
    [1, 2, 1, 1, '#FF9BAA'],
  ],
  // 閃亮
  sparkle: [
    [3, 0, 2, 8, '#FFDD55'], [0, 3, 8, 2, '#FFDD55'], [2, 2, 4, 4, '#FFF0A8'],
  ],
  // 爪印
  paw: [
    [2, 4, 4, 3, '#7A5A3A'], [1, 1, 2, 2, '#7A5A3A'], [3, 0, 2, 2, '#7A5A3A'], [5, 1, 2, 2, '#7A5A3A'],
    [6, 4, 1, 2, '#7A5A3A'], [1, 4, 1, 2, '#7A5A3A'],
  ],
};

export function PixelSprite({ name, size = 18 }: { name: keyof typeof SPRITES | string; size?: number }) {
  const px = SPRITES[name] ?? SPRITES.coin;
  const u = size / 8;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {px.map(([x, y, w, h, c], i) => (
        <Rect key={i} x={x * u} y={y * u} width={w * u} height={h * u} fill={c} />
      ))}
    </Svg>
  );
}
