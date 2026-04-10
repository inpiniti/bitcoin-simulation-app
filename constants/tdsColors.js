// TDS Mobile 색상 토큰
// Toss Design System 기반 라이트 테마 시맨틱 토큰

export const tdsColors = {
  // Grey
  grey50: '#f9fafb',
  grey100: '#f2f4f6',
  grey200: '#e5e8eb',
  grey300: '#d1d6db',
  grey400: '#b0b8c1',
  grey500: '#8b95a1',
  grey600: '#6b7684',
  grey700: '#4e5968',
  grey800: '#333d4b',
  grey900: '#191f28',

  // Blue
  blue50: '#e8f3ff',
  blue100: '#c9e2ff',
  blue200: '#90c2ff',
  blue300: '#64a8ff',
  blue400: '#4593fc',
  blue500: '#3182f6',
  blue600: '#2272eb',
  blue700: '#1b64da',
  blue800: '#1957c2',
  blue900: '#194aa6',

  // Red
  red50: '#ffeeee',
  red500: '#f04452',
  red600: '#e42939',

  // Green
  green50: '#f0faf6',
  green400: '#15c47e',
  green500: '#03b26c',

  // Orange
  orange500: '#fe9800',

  // Yellow
  yellow500: '#ffc342',

  // Static
  white: '#ffffff',
  black: '#000000',
};

// 기존 import 호환을 위해 이름은 유지하고 값만 라이트 톤으로 맞춘다.
export const tdsDark = {
  bgPrimary: '#f7f9fc',
  bgSecondary: '#eef2f6',
  bgCard: '#ffffff',
  textPrimary: '#191f28',
  textSecondary: '#4e5968',
  textTertiary: '#8b95a1',
  border: '#e5e8eb',
  accent: '#3182f6',
  // 주가 색상 (한국 관행: 상승=빨강, 하락=초록)
  priceUp: '#f04452',
  priceDown: '#3182f6',
  priceFlat: '#8b95a1',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

export default tdsDark;
