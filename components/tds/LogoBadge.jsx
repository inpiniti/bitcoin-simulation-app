/**
 * LogoBadge — TradingView 로고 이미지 또는 InitialBadge 폴백
 */
import { useState } from 'react';
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
  const [svgError, setSvgError] = useState(false);
  const logoUrl = getLogoUrl(ticker);
  const display = name || ticker || '?';
  const letter = display[0].toUpperCase();
  const bg = BADGE_COLORS[display.charCodeAt(0) % BADGE_COLORS.length];
  const radius = size / 2;

  if (logoUrl && !svgError) {
    return (
      <View
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: radius, backgroundColor: '#fff' },
        ]}
      >
        <SvgUri
          width={size - 10}
          height={size - 10}
          uri={logoUrl}
          onError={() => setSvgError(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: radius, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: { color: '#fff', fontWeight: '700' },
});
