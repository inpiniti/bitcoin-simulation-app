/**
 * LogoBadge — TradingView 로고를 원형으로 렌더링
 *
 * 방법:
 *  1. SVG 텍스트를 직접 fetch (ticker 당 1회, 캐시)
 *  2. SvgXml 로 원형 clipPath + preserveAspectRatio="xMidYMid meet" 적용
 *     → 원형 보장 / object-fit:contain / 비율 유지
 *  3. 로고 없거나 로드 실패 → 이니셜 배지 폴백
 */
/**
 * SvgUri + preserveAspectRatio="xMidYMid slice" (= cover)
 * + overflow:hidden View 원형 클립
 */
import { View, Text, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { getLogoUrl } from '../../lib/logoCache';

const BADGE_COLORS = [
  '#3182f6',
  '#f04452',
  '#03b26c',
  '#fe9800',
  '#8b5cf6',
  '#06b6d4',
];

export function LogoBadge({ name, ticker, size = 40 }) {
  const url = getLogoUrl(ticker);

  if (url) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: '#fff',
        }}
      >
        <SvgUri
          uri={url}
          width={size}
          height={size}
          preserveAspectRatio="xMidYMid slice"
        />
      </View>
    );
  }

  // 이니셜 배지 폴백 (로고 없음 또는 로딩 중)
  const display = name || ticker || '?';
  const letter  = display[0].toUpperCase();
  const bg      = BADGE_COLORS[display.charCodeAt(0) % BADGE_COLORS.length];

  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:  { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#fff', fontWeight: '700' },
});
