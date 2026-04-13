import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
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
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [url]);

  if (url && !loadFailed) {
    return (
      <View style={[styles.logoWrap, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image
          source={{ uri: url }}
          style={styles.logoImage}
          contentFit="cover"
          onError={() => setLoadFailed(true)}
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
  logoWrap: {
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  badge:  { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#fff', fontWeight: '700' },
});
