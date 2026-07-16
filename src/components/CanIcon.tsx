import Svg, { Path, Rect } from 'react-native-svg';

/** 罐罐貨幣圖示（lucide 沒有現成的，自製一個對齊線性風格）。 */
export function CanIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  const w = size * 2.2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={6} y={8} width={12} height={12} rx={2} />
      <Path d="M6 11.5h12" />
      <Path d="M9 8l1-4h4l1 4" />
    </Svg>
  );
}
