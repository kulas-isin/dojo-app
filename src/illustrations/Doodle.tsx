import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * 裝飾用手繪塗鴉。全部是純向量，之後可自由替換成自訂或開源插畫。
 * 用法：<Doodle name="paw" size={24} color={colors.primary} />
 */
export type DoodleName = 'paw' | 'heart' | 'sparkle' | 'star' | 'squiggle';

interface Props {
  name: DoodleName;
  size?: number;
  color?: string;
  opacity?: number;
}

export function Doodle({ name, size = 24, color = colors.primary, opacity = 1 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      {name === 'paw' && (
        <>
          <Circle cx="6" cy="10" r="2.4" fill={color} />
          <Circle cx="11" cy="7" r="2.4" fill={color} />
          <Circle cx="17" cy="9" r="2.4" fill={color} />
          <Path d="M7 15c0-3 3-4 5-4s5 1 5 4-3 4.5-5 4.5S7 18 7 15Z" fill={color} />
        </>
      )}
      {name === 'heart' && (
        <Path
          d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20Z"
          fill={color}
        />
      )}
      {name === 'sparkle' && (
        <Path
          d="M12 2c.6 4.8 2.6 6.8 7.4 7.4-4.8.6-6.8 2.6-7.4 7.4-.6-4.8-2.6-6.8-7.4-7.4C9.4 8.8 11.4 6.8 12 2Z"
          fill={color}
        />
      )}
      {name === 'star' && (
        <Path
          d="M12 3l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 21l-5.1 3 1.1-5.6-4.2-3.9 5.7-.7Z"
          fill={color}
        />
      )}
      {name === 'squiggle' && (
        <Path
          d="M2 14c2-4 4-4 6 0s4 4 6 0 4-4 6 0"
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}
