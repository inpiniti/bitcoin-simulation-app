/**
 * 뉴스 탭 화면
 * 이슈 #19: 날짜 선택기 + 뉴스 카드 목록
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useNewsStore } from '../../store/useNewsStore';

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

/**
 * YYYY-MM-DD 날짜를 n일 이동한 문자열 반환
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
 */
function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * published_at ISO 문자열을 "HH:MM" 형식으로 변환 (KST)
 */
function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ─────────────────────────────────────────────
// 임팩트 배지
// ─────────────────────────────────────────────

function ImpactBadge({ level }) {
  const map = {
    HIGH: { emoji: '🔴', label: 'HIGH', bg: '#3a1515', text: '#f23645' },
    MEDIUM: { emoji: '🟡', label: 'MEDIUM', bg: '#3a3015', text: '#e5c07b' },
    LOW: { emoji: '🟢', label: 'LOW', bg: '#153a26', text: '#089981' },
  };
  const config = map[level] ?? map.LOW;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>
        {config.emoji} {config.label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// 뉴스 카드
// ─────────────────────────────────────────────

function NewsCard({ item, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {/* 헤더: 소스 + 시간 + 배지 */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardSource} numberOfLines={1}>
          {item.source ?? ''}
          {item.published_at ? `  ·  ${formatTime(item.published_at)}` : ''}
        </Text>
        <ImpactBadge level={item.impact_level} />
      </View>

      {/* 제목 */}
      <Text style={styles.cardTitle} numberOfLines={3}>
        {item.title}
      </Text>

      {/* 마켓 임팩트 요약 */}
      {item.market_impact ? (
        <Text style={styles.cardSummary} numberOfLines={2}>
          {item.market_impact}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// 날짜 선택기
// ─────────────────────────────────────────────

function DateSelector({ date, onPrev, onNext }) {
  return (
    <View style={styles.dateSelectorRow}>
      <TouchableOpacity
        onPress={onPrev}
        style={styles.arrowButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronLeft color={Colors.textPrimary} size={20} />
      </TouchableOpacity>

      <Text style={styles.dateText}>{date}</Text>

      <TouchableOpacity
        onPress={onNext}
        style={styles.arrowButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronRight color={Colors.textPrimary} size={20} />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

export default function NewsScreen() {
  const router = useRouter();
  const { items, selectedDate, isLoading, error, fetchNews, setSelectedDate } =
    useNewsStore();

  useEffect(() => {
    fetchNews(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handlePrev = useCallback(() => {
    const prev = shiftDate(selectedDate, -1);
    setSelectedDate(prev);
  }, [selectedDate, setSelectedDate]);

  const handleNext = useCallback(() => {
    const next = shiftDate(selectedDate, 1);
    setSelectedDate(next);
  }, [selectedDate, setSelectedDate]);

  const handleCardPress = useCallback(
    (item) => {
      router.push(`/news/${item.id}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }) => <NewsCard item={item} onPress={handleCardPress} />,
    [handleCardPress]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <View style={styles.container}>
      {/* 날짜 선택기 */}
      <DateSelector
        date={selectedDate}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* 로딩 */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.accentBlue} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchNews(selectedDate)}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={
            items.length === 0 ? styles.emptyList : styles.list
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>
                해당 날짜의 뉴스가 없습니다.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
    gap: 16,
  },
  arrowButton: {
    padding: 4,
  },
  dateText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'center',
  },
  list: {
    padding: 12,
    gap: 10,
  },
  emptyList: {
    flex: 1,
    padding: 12,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: Colors.accentBlue,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // 카드
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  cardSource: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  cardSummary: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  // 배지
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
