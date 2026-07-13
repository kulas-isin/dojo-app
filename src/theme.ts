/**
 * PawDojo 設計 Tokens — 插畫風暖色系
 * 暖奶油底、珊瑚主色、沙綠與奶油黃、粉彩色塊。
 * 插畫用於 UI 裝飾與空狀態；寵物照片維持用戶真實上傳。
 */

export const colors = {
  // 底色與表面
  bg: '#FBF6EE', // 暖奶油
  bgElevated: '#F3E9DA', // 次層背景
  card: '#FFFFFF',
  cardAlt: '#F5EFE4', // 卡內淡色區塊
  border: '#EAE0D0',

  // 文字
  text: '#2E2A26', // 暖墨
  textDim: '#6E6558',
  textMuted: '#A89E8C',
  onColor: '#FFFFFF',

  // 品牌 / 語意色
  primary: '#E8805C', // 珊瑚
  primarySoft: '#FBE1D2', // 珊瑚粉彩底
  accent: '#5E9B7E', // 沙綠
  accentSoft: '#DDEBDF',
  gold: '#C0872E', // 琥珀金（文字可讀）
  goldSoft: '#F6E7C4',
  danger: '#C0453B',
  success: '#5E9B7E',
};

/** 粉彩色塊：用於照片牆底、色塊 blob、標籤底等裝飾 */
export const tints = ['#FBE1D2', '#DDEBDF', '#D9E8EC', '#EADFF0', '#F6E7C4'];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
};

export const font = {
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  weight: {
    regular: '500' as const,
    semibold: '700' as const,
    bold: '800' as const,
    heavy: '900' as const,
  },
};

/** 卡片預設陰影（暖色柔和陰影） */
export const shadow = {
  card: {
    shadowColor: '#5A3A1A',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
};
