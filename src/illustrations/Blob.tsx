import Svg, { Path } from 'react-native-svg';

/**
 * 有機色塊，用於標頭與背景裝飾。純色柔形。
 */
interface Props {
  size?: number;
  color: string;
  opacity?: number;
  /** 0-3 四種形狀變化 */
  variant?: number;
}

const SHAPES = [
  'M44 8c14 3 24 14 22 30-2 15-16 24-32 22C18 58 6 48 8 32 10 16 28 4 44 8Z',
  'M40 6c16 0 30 12 28 30-2 18-14 30-30 28C20 62 6 46 8 30 10 14 24 6 40 6Z',
  'M42 10c15 4 24 16 20 32-4 15-18 22-33 18C16 56 8 42 10 28 12 14 27 6 42 10Z',
  'M38 8c17-2 30 10 30 28 0 17-12 30-30 30C20 66 6 50 8 32 10 16 22 10 38 8Z',
];

export function Blob({ size = 120, color, opacity = 1, variant = 0 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 76 76" opacity={opacity}>
      <Path d={SHAPES[variant % SHAPES.length]} fill={color} />
    </Svg>
  );
}
