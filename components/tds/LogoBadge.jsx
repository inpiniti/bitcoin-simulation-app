/**
 * LogoBadge — TradingView 로고를 원형으로 렌더링
 *
 * SvgUri를 View의 overflow:hidden으로 클리핑하면 Android에서 동작하지 않음.
 * 대신 SvgXml로 SVG를 직접 조립:
 *  - <circle> 흰 배경 → 원형 보장
 *  - <image preserveAspectRatio="xMidYMid meet"> → object-fit: contain
 *  - 로고 없으면 이니셜 배지 폴백
 */
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { getLogoUrl } from '../../lib/logoCache';

const BADGE_COLORS = [
  '#3182f6',
  '#f04452',
  '#03b26c',
  '#fe9800',
  '#8b5cf6',
  '#06b6d4',
];

const PAD = 4; // 원 테두리 ~ 로고 간격 (px)

export function LogoBadge({ name, ticker, size = 40 }) {
  const logoUrl = getLogoUrl(ticker);
  const display  = name || ticker || '?';
  const letter   = display[0].toUpperCase();
  const bg       = BADGE_COLORS[display.charCodeAt(0) % BADGE_COLORS.length];
  const cx       = size / 2;
  const imgSize  = size - PAD * 2;

  if (logoUrl) {
    // SVG 안에서 circle 배경 + image(contain) 로 완전한 원형 클리핑
    const xml =
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
      ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<circle cx="${cx}" cy="${cx}" r="${cx}" fill="white"/>` +
      `<image xlink:href="${logoUrl}" x="${PAD}" y="${PAD}"` +
      ` width="${imgSize}" height="${imgSize}"` +
      ` preserveAspectRatio="xMidYMid meet"/>` +
      `</svg>`;

    return <SvgXml xml={xml} width={size} height={size} />;
  }

  // 로고 없음 → 이니셜 배지 폴백
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
