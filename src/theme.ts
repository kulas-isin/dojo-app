/**
 * PawDojo 設計 Tokens — 薄荷汽水（復古電玩）
 * 淡薄荷綠底、番茄珊瑚主色、深松墨字，配復古汽水跳色。
 * 插畫用於 UI 裝飾與空狀態；寵物照片維持用戶真實上傳。
 */

export const colors = {
  // 底色與表面
  bg: '#E3F0DA', // 淡薄荷
  bgElevated: '#D7E8C9', // 次層背景（深一階薄荷）
  card: '#FBFDF4', // 奶白（帶一點暖）
  cardAlt: '#EAF3E0', // 卡內淡薄荷區塊
  border: '#C9DEB8',

  // 文字
  text: '#22392F', // 深松墨
  textDim: '#5E7A66',
  textMuted: '#93A896',
  onColor: '#FFFFFF',

  // 品牌 / 語意色
  primary: '#F26B54', // 番茄珊瑚
  primarySoft: '#FBDDD4', // 珊瑚粉彩底
  accent: '#2E5EAA', // 海軍藍（次要強調）
  accentSoft: '#D5E1F2',
  gold: '#C77F12', // 琥珀金（文字可讀）
  goldSoft: '#F7E6BC',
  danger: '#E23B3B',
  success: '#2FA46A',
};

/** 粉彩色塊：用於照片牆底、色塊 blob、標籤底等裝飾 */
export const tints = ['#FBDDD4', '#D5E1F2', '#D9EFD0', '#EFE1F6', '#F7E6BC'];

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
    shadowColor: '#1E4030',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
};
