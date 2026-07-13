/**
 * 圖示集中管理 — 使用 Lucide 開源圖示（MIT 授權）取代 emoji。
 * 需要新圖示時，從 lucide-react-native 匯入後在這裡集中對應。
 */
import {
  Bike,
  Bone,
  Castle,
  Cat,
  ChevronLeft,
  Dog,
  Building2,
  Camera,
  Check,
  Crown,
  FerrisWheel,
  Flag,
  Heart,
  HeartHandshake,
  ImagePlus,
  MapPin,
  MessageCircle,
  Mountain,
  Palette,
  PawPrint,
  Plus,
  RotateCcw,
  Shield,
  Swords,
  Trees,
  Trophy,
  Umbrella,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from '../theme';

export type GymIconKey =
  | 'castle'
  | 'trees'
  | 'city'
  | 'bike'
  | 'fountain'
  | 'beach'
  | 'mountain'
  | 'ferris'
  | 'paw'
  | 'bone';

/** 建立道館時可挑選的圖示 */
export const GYM_ICON_KEYS: GymIconKey[] = [
  'castle',
  'trees',
  'city',
  'bike',
  'fountain',
  'beach',
  'mountain',
  'ferris',
  'paw',
  'bone',
];

const GYM_ICONS: Record<GymIconKey, LucideIcon> = {
  castle: Castle,
  trees: Trees,
  city: Building2,
  bike: Bike,
  fountain: Waves,
  beach: Umbrella,
  mountain: Mountain,
  ferris: FerrisWheel,
  paw: PawPrint,
  bone: Bone,
};

const PET_ICONS = {
  cat: Cat,
  dog: Dog,
  other: PawPrint,
} as const;

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function GymIcon({
  name,
  size = 24,
  color = colors.text,
  strokeWidth = 2,
}: IconProps & { name: string }) {
  const Cmp = GYM_ICONS[name as GymIconKey] ?? Castle;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}

export function PetIcon({
  type,
  size = 18,
  color = colors.textDim,
  strokeWidth = 2,
}: IconProps & { type: string }) {
  const Cmp = PET_ICONS[type as keyof typeof PET_ICONS] ?? PawPrint;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}

// 常用圖示轉出，方便各畫面直接使用
export {
  Camera,
  Castle,
  Check,
  ChevronLeft,
  Crown,
  Flag,
  Heart,
  HeartHandshake,
  ImagePlus,
  MapPin,
  MessageCircle,
  Palette,
  PawPrint,
  Plus,
  RotateCcw,
  Shield,
  Swords,
  Trophy,
};
