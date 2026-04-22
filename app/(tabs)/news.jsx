/**
 * S&P 500 뉴스 분석 화면
 * - 상단: 주간 달력 (데이터 있는 날 점 표시)
 * - 하단: bullish 종목 리스트 (confidence 내림차순)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import {
  fetchSp500ActiveDates,
  fetchSp500MetaByDate,
  fetchSp500BullishByDate,
} from '../../lib/sp500Api';

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getSundayOfWeek(d) {
  const date = new Date(d);
  date.setDate(d.getDate() - d.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

// ─── 주간 달력 ────────────────────────────────────────────────────────────────

function WeekCalendar({ activeDates, selectedDate, onDateSelect }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [weekStart, setWeekStart] = useState(() => getSundayOfWeek(today));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const monthLabel = (() => {
    const months = weekDays.map((d) => d.getMonth() + 1);
    const unique = [...new Set(months)];
    return unique.map((m) => `${m}월`).join(' · ');
  })();

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    if (d <= today) setWeekStart(d);
  };

  const canGoNext = (() => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    return next <= today;
  })();

  return (
    <View style={calStyles.container}>
      <View style={calStyles.nav}>
        <TouchableOpacity onPress={prevWeek} hitSlop={12}>
          <Ionicons name="chevron-back" size={18} color={tdsDark.textPrimary} />
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextWeek} disabled={!canGoNext} hitSlop={12}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canGoNext ? tdsDark.textPrimary : tdsDark.border}
          />
        </TouchableOpacity>
      </View>

      <View style={calStyles.row}>
        {weekDays.map((d, i) => {
          const ds = toDateStr(d);
          const isSelected = ds === selectedDate;
          const hasData = activeDates.has(ds);
          const isFuture = d > today;
          const isSat = i === 6;
          const isSun = i === 0;

          return (
            <TouchableOpacity
              key={ds}
              style={calStyles.dayCol}
              onPress={() => !isFuture && onDateSelect(ds)}
              disabled={isFuture}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  calStyles.dayLabel,
                  isSun && { color: tdsColors.red500 },
                  isSat && { color: tdsColors.blue500 },
                  isFuture && { color: tdsDark.border },
                ]}
              >
                {DAY_LABELS[i]}
              </Text>
              <View style={[calStyles.dateCircle, isSelected && calStyles.dateCircleActive]}>
                <Text
                  style={[
                    calStyles.dateNum,
                    isSelected && calStyles.dateNumActive,
                    isFuture && { color: tdsDark.border },
                    !isSelected && isSun && { color: tdsColors.red500 },
                    !isSelected && isSat && { color: tdsColors.blue500 },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
              <View style={calStyles.dotRow}>
                {hasData && (
                  <View style={[calStyles.dot, isSelected && calStyles.dotActive]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── 메타 요약 카드 ───────────────────────────────────────────────────────────

function MetaSummaryCard({ meta }) {
  if (!meta) return null;
  const total = (meta.bullish_count ?? 0) + (meta.bearish_count ?? 0) + (meta.neutral_count ?? 0);
  const bullishPct = total > 0 ? ((meta.bullish_count / total) * 100).toFixed(0) : '0';
  const bearishPct = total > 0 ? ((meta.bearish_count / total) * 100).toFixed(0) : '0';

  return (
    <View style={styles.metaCard}>
      <View style={styles.metaRow}>
        <View style={styles.metaStat}>
          <Text style={styles.metaStatValue}>{meta.news_count ?? '-'}</Text>
          <Text style={styles.metaStatLabel}>수집 뉴스</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaStat}>
          <Text style={[styles.metaStatValue, { color: tdsColors.red500 }]}>
            {meta.bullish_count ?? 0}
            <Text style={styles.metaPct}> ({bullishPct}%)</Text>
          </Text>
          <Text style={styles.metaStatLabel}>📈 낙관</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaStat}>
          <Text style={[styles.metaStatValue, { color: tdsColors.blue500 }]}>
            {meta.bearish_count ?? 0}
            <Text style={styles.metaPct}> ({bearishPct}%)</Text>
          </Text>
          <Text style={styles.metaStatLabel}>📉 비관</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaStat}>
          <Text style={[styles.metaStatValue, { color: tdsDark.textTertiary }]}>
            {meta.neutral_count ?? 0}
          </Text>
          <Text style={styles.metaStatLabel}>➡️ 중립</Text>
        </View>
      </View>
    </View>
  );
}

// ─── 종목 카드 ────────────────────────────────────────────────────────────────

function StockCard({ item, rank }) {
  const [expanded, setExpanded] = useState(false);
  const confidencePct = Math.round((item.confidence ?? 0) * 100);

  // confidence 바 색상 (높을수록 진한 빨강)
  const barColor =
    confidencePct >= 80
      ? tdsColors.red500
      : confidencePct >= 60
      ? tdsColors.orange500
      : tdsColors.yellow500;

  return (
    <TouchableOpacity
      style={styles.stockCard}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      {/* 상단 행 */}
      <View style={styles.stockRow}>
        {/* 순위 */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>

        {/* 종목 정보 */}
        <View style={styles.stockInfo}>
          <View style={styles.stockTopRow}>
            <Text style={styles.stockTicker}>{item.ticker}</Text>
            <View style={styles.sectorBadge}>
              <Text style={styles.sectorText} numberOfLines={1}>
                {item.sector}
              </Text>
            </View>
          </View>
          <Text style={styles.stockName} numberOfLines={1}>
            {item.name}
          </Text>

          {/* confidence 바 */}
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${confidencePct}%`, backgroundColor: barColor }]} />
          </View>
        </View>

        {/* 신뢰도 % */}
        <View style={styles.confidenceBox}>
          <Text style={[styles.confidenceValue, { color: barColor }]}>{confidencePct}%</Text>
          <Text style={styles.confidenceLabel}>신뢰도</Text>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tdsDark.textTertiary}
          style={{ marginLeft: 4 }}
        />
      </View>

      {/* 펼쳐지는 이유 */}
      {expanded && (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText}>{item.reason || '분석 근거 없음'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────

export default function NewsScreen() {
  const today = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeDates, setActiveDates] = useState(new Set());
  const [meta, setMeta] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 활성 날짜 초기 로드
  useEffect(() => {
    (async () => {
      const { data } = await fetchSp500ActiveDates(60);
      if (data && data.length > 0) {
        setActiveDates(new Set(data));
        // 가장 최근 날짜를 기본 선택
        const latest = [...data].sort().reverse()[0];
        if (latest) setSelectedDate(latest);
      }
    })();
  }, []);

  // 날짜 선택 시 데이터 로드
  const loadData = useCallback(async (date) => {
    setLoading(true);
    try {
      const [metaRes, stocksRes] = await Promise.all([
        fetchSp500MetaByDate(date),
        fetchSp500BullishByDate(date),
      ]);
      setMeta(metaRes.data);
      setStocks(stocksRes.data || []);
    } catch {
      setMeta(null);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(selectedDate);
    setRefreshing(false);
  }, [selectedDate, loadData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>S&P 500 뉴스 분석</Text>
        <Text style={styles.headerSub}>뉴스 기반 낙관 종목 랭킹</Text>
      </View>

      {/* 주간 달력 */}
      <WeekCalendar
        activeDates={activeDates}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      {/* 컨텐츠 */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tdsColors.blue500} size="large" />
          <Text style={styles.loadingText}>분석 데이터 조회 중...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tdsColors.blue500}
            />
          }
        >
          {/* 요약 카드 */}
          <MetaSummaryCard meta={meta} />

          {/* 섹션 타이틀 */}
          {stocks.length > 0 && (
            <View style={styles.sectionHeader}>
              <View style={styles.bullishBadge}>
                <Text style={styles.bullishBadgeText}>📈 BULLISH</Text>
              </View>
              <Text style={styles.sectionTitle}>낙관 종목 {stocks.length}개</Text>
              <Text style={styles.sectionSub}>신뢰도 높은 순</Text>
            </View>
          )}

          {/* 종목 리스트 */}
          {stocks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>{selectedDate} 분석 데이터 없음</Text>
              <Text style={styles.emptyDesc}>
                매일 새벽 자동으로 분석이 실행됩니다{'\n'}달력에서 점이 표시된 날짜를 선택해 보세요
              </Text>
            </View>
          ) : (
            stocks.map((item, idx) => (
              <StockCard key={item.ticker} item={item} rank={idx + 1} />
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const calStyles = StyleSheet.create({
  container: {
    backgroundColor: tdsDark.bgCard,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tdsDark.border,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsDark.textPrimary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayCol: {
    alignItems: 'center',
    width: 40,
  },
  dayLabel: {
    fontSize: 11,
    color: tdsDark.textTertiary,
    marginBottom: 4,
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleActive: {
    backgroundColor: tdsColors.blue500,
  },
  dateNum: {
    fontSize: 14,
    fontWeight: '500',
    color: tdsDark.textPrimary,
  },
  dateNumActive: {
    color: tdsColors.white,
    fontWeight: '700',
  },
  dotRow: {
    marginTop: 3,
    height: 5,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: tdsColors.blue500,
  },
  dotActive: {
    backgroundColor: tdsColors.white,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tdsDark.bgPrimary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: tdsDark.bgCard,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: tdsDark.textTertiary,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: tdsDark.textTertiary,
  },
  content: {
    paddingBottom: 24,
  },
  // 메타 요약 카드
  metaCard: {
    backgroundColor: tdsDark.bgCard,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: tdsDark.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaStat: {
    flex: 1,
    alignItems: 'center',
  },
  metaStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  metaPct: {
    fontSize: 12,
    fontWeight: '400',
  },
  metaStatLabel: {
    fontSize: 11,
    color: tdsDark.textTertiary,
    marginTop: 3,
  },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: tdsDark.border,
  },
  // 섹션 헤더
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  bullishBadge: {
    backgroundColor: `${tdsColors.red500}15`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bullishBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: tdsColors.red500,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    flex: 1,
  },
  sectionSub: {
    fontSize: 12,
    color: tdsDark.textTertiary,
  },
  // 종목 카드
  stockCard: {
    backgroundColor: tdsDark.bgCard,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    shadowColor: tdsDark.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: tdsDark.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: tdsDark.textSecondary,
  },
  stockInfo: {
    flex: 1,
    marginRight: 8,
  },
  stockTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  stockTicker: {
    fontSize: 16,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  sectorBadge: {
    backgroundColor: `${tdsColors.blue500}12`,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    maxWidth: 120,
  },
  sectorText: {
    fontSize: 10,
    color: tdsColors.blue600,
    fontWeight: '600',
  },
  stockName: {
    fontSize: 12,
    color: tdsDark.textTertiary,
    marginBottom: 6,
  },
  barTrack: {
    height: 4,
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  confidenceBox: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  confidenceLabel: {
    fontSize: 10,
    color: tdsDark.textTertiary,
    marginTop: 1,
  },
  reasonBox: {
    marginTop: 10,
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 8,
    padding: 10,
  },
  reasonText: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    lineHeight: 19,
  },
  // 빈 상태
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: tdsDark.textSecondary,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: tdsDark.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
