/**
 * 뉴스 상세 화면
 * 이슈 #20: 동적 라우트 /news/[id]
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ExternalLink } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useNewsStore } from '../../store/useNewsStore';

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

const MARKETS = ['전체', 'US', 'KOSPI', 'KOSDAQ', 'CRYPTO'];

const MARKET_COLORS = {
  US: { bg: '#1a2a3a', text: '#007acc' },
  KOSPI: { bg: '#1a3a2a', text: '#089981' },
  KOSDAQ: { bg: '#1a3a2a', text: '#20c997' },
  CRYPTO: { bg: '#3a2a1a', text: '#e5c07b' },
};

const DIRECTION_MAP = {
  bullish: { icon: '📈', color: Colors.success },
  bearish: { icon: '📉', color: Colors.error },
  neutral: { icon: '➡️', color: Colors.textSecondary },
};

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

function MarketBadge({ market }) {
  const config = MARKET_COLORS[market] ?? { bg: Colors.bgTertiary, text: Colors.textSecondary };
  return (
    <View style={[styles.marketBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.marketBadgeText, { color: config.text }]}>
        {market}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// 종목 임팩트 아이템
// ─────────────────────────────────────────────

function StockImpactItem({ item }) {
  const dirConfig = DIRECTION_MAP[item.direction] ?? DIRECTION_MAP.neutral;
  const confidence = Math.min(Math.max(item.confidence ?? 0, 0), 1);
  const pct = Math.round(confidence * 100);

  return (
    <View style={styles.stockItem}>
      {/* 헤더: 티커 + 이름 + 마켓 배지 */}
      <View style={styles.stockHeader}>
        <Text style={styles.stockTicker}>{item.ticker}</Text>
        {item.name ? (
          <Text style={styles.stockName} numberOfLines={1}>
            {item.name}
          </Text>
        ) : null}
        <MarketBadge market={item.market} />
      </View>

      {/* 방향 + 이유 */}
      <View style={styles.stockDirectionRow}>
        <Text style={[styles.stockDirection, { color: dirConfig.color }]}>
          {dirConfig.icon}{' '}
          {item.direction === 'bullish'
            ? '상승'
            : item.direction === 'bearish'
            ? '하락'
            : '중립'}
        </Text>
      </View>

      {item.reason ? (
        <Text style={styles.stockReason} numberOfLines={3}>
          {item.reason}
        </Text>
      ) : null}

      {/* 신뢰도 바 */}
      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>신뢰도</Text>
        <View style={styles.confidenceBarBg}>
          <View
            style={[
              styles.confidenceBarFill,
              {
                width: `${pct}%`,
                backgroundColor:
                  dirConfig.color === Colors.success
                    ? Colors.success
                    : dirConfig.color === Colors.error
                    ? Colors.error
                    : Colors.textSecondary,
              },
            ]}
          />
        </View>
        <Text style={styles.confidencePct}>{pct}%</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// 필터 탭
// ─────────────────────────────────────────────

function FilterRow({ active, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContent}
    >
      {MARKETS.map((m) => (
        <TouchableOpacity
          key={m}
          style={[
            styles.filterChip,
            active === m && styles.filterChipActive,
          ]}
          onPress={() => onChange(m)}
        >
          <Text
            style={[
              styles.filterChipText,
              active === m && styles.filterChipTextActive,
            ]}
          >
            {m}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { items } = useNewsStore();
  const [marketFilter, setMarketFilter] = useState('전체');

  const newsItem = useMemo(
    () => items.find((n) => String(n.id) === String(id)),
    [items, id]
  );

  const filteredStocks = useMemo(() => {
    const stocks = newsItem?.news_stock_impact ?? [];
    if (marketFilter === '전체') return stocks;
    return stocks.filter((s) => s.market === marketFilter);
  }, [newsItem, marketFilter]);

  const handleOpenUrl = () => {
    if (newsItem?.url) {
      Linking.openURL(newsItem.url).catch(() => {});
    }
  };

  if (!newsItem) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={Colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>뉴스 상세</Text>
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.notFoundText}>뉴스를 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={Colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          뉴스 상세
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 제목 */}
        <Text style={styles.title}>{newsItem.title}</Text>

        {/* 메타: 소스 + 날짜 */}
        <View style={styles.metaRow}>
          {newsItem.source ? (
            <Text style={styles.metaText}>{newsItem.source}</Text>
          ) : null}
          {newsItem.published_at ? (
            <Text style={styles.metaText}>
              {new Date(newsItem.published_at).toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          ) : null}
        </View>

        {/* 마켓 임팩트 */}
        {newsItem.market_impact ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>시장 영향</Text>
            <Text style={styles.marketImpactText}>{newsItem.market_impact}</Text>
          </View>
        ) : null}

        {/* 원문 보기 버튼 */}
        {newsItem.url ? (
          <TouchableOpacity style={styles.urlButton} onPress={handleOpenUrl}>
            <ExternalLink color="#ffffff" size={16} />
            <Text style={styles.urlButtonText}>원문 보기</Text>
          </TouchableOpacity>
        ) : null}

        {/* 종목 임팩트 */}
        {(newsItem.news_stock_impact?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>종목 영향</Text>
            <FilterRow active={marketFilter} onChange={setMarketFilter} />

            {filteredStocks.length === 0 ? (
              <Text style={styles.emptyStocks}>
                해당 시장의 종목이 없습니다.
              </Text>
            ) : (
              filteredStocks.map((stock, idx) => (
                <StockImpactItem key={`${stock.ticker}-${idx}`} item={stock} />
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  marketImpactText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentBlue,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  urlButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // 필터
  filterScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterContent: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  filterChipActive: {
    backgroundColor: Colors.accentBlue,
    borderColor: Colors.accentBlue,
  },
  filterChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  // 종목 카드
  stockItem: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  stockTicker: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  stockName: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  marketBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  marketBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockDirectionRow: {
    marginBottom: 4,
  },
  stockDirection: {
    fontSize: 13,
    fontWeight: '600',
  },
  stockReason: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceLabel: {
    color: Colors.textDisabled,
    fontSize: 11,
    width: 36,
  },
  confidenceBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidencePct: {
    color: Colors.textDisabled,
    fontSize: 11,
    width: 32,
    textAlign: 'right',
  },
  emptyStocks: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
});
