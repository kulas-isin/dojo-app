import type { Coordinate, Gym } from '../types';

export interface GymMapProps {
  gyms: Gym[];
  userLocation: Coordinate | null;
  center: Coordinate;
  /** 點選某個道館圖釘 */
  onSelectGym: (gymId: string) => void;
  /** 長按地圖空白處以新增道館 */
  onPickLocation: (coordinate: Coordinate) => void;
}
