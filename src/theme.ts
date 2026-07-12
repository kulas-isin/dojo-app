/**
 * PawDojo 設計 Tokens — Claude 溫暖亮色系
 * 暖象牙底、珊瑚主色、深墨文字、留白多。
 * 所有 UI 都應該走這裡的 tokens，不要寫死色碼。
 */

export const colors = {
  // 底色與表面
  bg: '#FAF9F5', // 暖象牙
  bgElevated: '#F2EFE6', // 次層背景
  card: '#FFFFFF', // 卡片
  cardAlt: '#F5F2EA', // 卡片內的淡色區塊
  border: '#E7E2D6', // 邊框

  // 文字
  text: '#1F1E1C', // 近墨黑
  textDim: '#77726A', // 次要文字
  textMuted: '#A8A296', // 更淡的說明文字
  onColor: '#FFFFFF', // 疊在彩色上的文字

  // 品牌 / 語意色
  primary: '#D97757', // 珊瑚（挑戰、主要按鈕）
  primarySoft: '#F6E1D7', // 珊瑚的淡底
  accent: '#2F6F5B', // 深沙綠（衛冕、成功、次要）
  accentSoft: '#DCEAE3',
  gold: '#B8842B', // 琥珀金（冠軍、頭銜）
  goldSoft: '#F1E6CC',
  danger: '#C0453B',
  success: '#2F6F5B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
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

/** 卡片預設陰影（亮色系用很淡的柔和陰影） */
export const shadow = {
  card: {
    shadowColor: '#1F1E1C',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
