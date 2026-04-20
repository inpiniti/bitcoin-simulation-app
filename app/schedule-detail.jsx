/**
 * 예약 상세 화면
 * - 헤더: 뒤로가기 / 설정 이름 / 수정
 * - 탭: 로그 | 상위 10개 종목
 * - 주간 달력 (Toss 스타일) + 선택 날짜별 콘텐츠
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../constants/tdsColors';
import { Badge } from '../components/tds/Badge';
import { SegmentControl } from '../components/tds/SegmentControl';
import {
  fetchSettings,
  updateSetting,
  fetchDlTradeLogsByDate,
  fetchTopTickersByDate,
  fetchDlTradeLogs,
  fetchTopTickersLog,
  backfillTimesFM,
} from '../lib/tradingApi';
import { fetchAllTickerCloses, fetchGroupIndexByDate } from '../lib/priceApi';
import {
  sampleSettings,
  sampleDlTradeLogs,
  sampleTopTickers,
} from '../lib/sampleData';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const TABS = [
  { key: 'tickers', label: '상위 10개 종목' },
  { key: 'logs', label: '로그' },
];

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────────

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
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
      {/* 월 네비게이션 */}
      <View style={calStyles.nav}>
        <TouchableOpacity onPress={prevWeek} hitSlop={12}>
          <Ionicons name="chevron-back" size={18} color={tdsDark.textPrimary} />
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextWeek} disabled={!canGoNext} hitSlop={12}>
          <Ionicons name="chevron-forward" size={18} color={canGoNext ? tdsDark.textPrimary : tdsDark.border} />
        </TouchableOpacity>
      </View>

      {/* 요일 + 날짜 행 */}
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
              <Text style={[
                calStyles.dayLabel,
                isSun && { color: tdsColors.red500 },
                isSat && { color: tdsColors.blue500 },
                isFuture && { color: tdsDark.border },
              ]}>
                {DAY_LABELS[i]}
              </Text>
              <View style={[calStyles.dateCircle, isSelected && calStyles.dateCircleActive]}>
                <Text style={[
                  calStyles.dateNum,
                  isSelected && calStyles.dateNumActive,
                  isFuture && { color: tdsDark.border },
                  !isSelected && isSun && { color: tdsColors.red500 },
                  !isSelected && isSat && { color: tdsColors.blue500 },
                ]}>
                  {d.getDate()}
                </Text>
              </View>
              <View style={calStyles.dotRow}>
                {hasData && <View style={[calStyles.dot, isSelected && calStyles.dotActive]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── 로그 탭 ──────────────────────────────────────────────────────────────────

function LogsTab({ settingId, settingName, activeDates, onActiveDatesChange }) {
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useSample, setUseSample] = useState(false);

  // 초기화: 활성 날짜 집합 로드
  useEffect(() => {
    (async () => {
      try {
        const { data } = await fetchDlTradeLogs(settingId, 60);
        if (data && data.length > 0) {
          const dates = new Set(data.map((l) => l.date).filter(Boolean));
          onActiveDatesChange(dates);
          const latest = [...dates].sort().reverse()[0];
          if (latest) setSelectedDate(latest);
        } else {
          // fallback: 샘플
          const sampleFiltered = sampleDlTradeLogs.filter(
            (l) => !settingName || l.setting_name === settingName
          );
          const dates = new Set(sampleFiltered.map((l) => l.date));
          onActiveDatesChange(dates);
          const latest = [...dates].sort().reverse()[0];
          if (latest) setSelectedDate(latest);
          setUseSample(true);
        }
      } catch {
        const sampleFiltered = sampleDlTradeLogs.filter(
          (l) => !settingName || l.setting_name === settingName
        );
        const dates = new Set(sampleFiltered.map((l) => l.date));
        onActiveDatesChange(dates);
        setUseSample(true);
      }
    })();
  }, [settingId]);

  // 날짜 선택 시 로그 로드
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    (async () => {
      try {
        if (useSample) {
          const filtered = sampleDlTradeLogs.filter(
            (l) => l.date === selectedDate && (!settingName || l.setting_name === settingName)
          );
          setLogs(filtered);
        } else {
          const { data } = await fetchDlTradeLogsByDate(selectedDate, settingId);
          if (data && data.length > 0) {
            setLogs(data);
          } else {
            // fallback: 샘플
            const filtered = sampleDlTradeLogs.filter(
              (l) => l.date === selectedDate && (!settingName || l.setting_name === settingName)
            );
            setLogs(filtered);
          }
        }
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate, settingId, useSample]);

  return (
    <View style={{ flex: 1 }}>
      <WeekCalendar
        activeDates={activeDates}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tdsColors.blue500} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.tabContent}>
          {useSample && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>샘플 데이터로 표시 중입니다.</Text>
            </View>
          )}

          {logs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>{selectedDate} 실행 기록 없음</Text>
            </View>
          ) : (
            logs.map((log, idx) => (
              <LogCard key={log.id ?? idx} log={log} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function LogCard({ log }) {
  const [expanded, setExpanded] = useState(false);
  const isError = !!log.error;

  return (
    <View style={styles.logCard}>
      {/* 요약 헤더 */}
      <TouchableOpacity
        style={styles.logCardHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={styles.logCardLeft}>
          <View style={styles.logCardBadgeRow}>
            <Badge
              color={isError ? 'red' : log.is_test ? 'grey' : 'orange'}
              size="small"
              variant="fill"
            >
              {isError ? '오류' : log.is_test ? '모의매매' : '실매매'}
            </Badge>
            {log.target_group && (
              <Text style={styles.logGroupLabel}>{log.target_group}</Text>
            )}
          </View>
          <View style={styles.logStatRow}>
            <StatChip label="보유" value={log.holdings_count ?? '-'} />
            <StatChip label="매수신호" value={log.buy_signals ?? '-'} color={tdsColors.red500} />
            <StatChip label="매도신호" value={log.sell_signals ?? '-'} color={tdsColors.blue500} />
            <StatChip label="매수주문" value={log.buy_orders ?? '-'} bold />
            <StatChip label="매도주문" value={log.sell_orders ?? '-'} bold />
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={tdsDark.textTertiary}
        />
      </TouchableOpacity>

      {/* 상세 로그 */}
      {expanded && (
        <View style={styles.logDetail}>
          {isError ? (
            <Text style={styles.logErrorText}>{log.error}</Text>
          ) : (
            (log.logs || []).map((line, i) => (
              <Text key={i} style={styles.logLine}>{line}</Text>
            ))
          )}
        </View>
      )}
    </View>
  );
}

function StatChip({ label, value, color, bold }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color && { color }, bold && { fontWeight: '700' }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── 상위 10개 종목 탭 ────────────────────────────────────────────────────────

const SUPPORTED_INDEX_GROUPS = new Set(['sp500', 'qqq', 'nasdaq100', 'kospi', 'kosdaq']);

function TickersTab({ settingId, settingName, tickerGroupKey, activeDates, onActiveDatesChange }) {
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [tickerData, setTickerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useSample, setUseSample] = useState(false);
  const [prices, setPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [marketIndex, setMarketIndex] = useState(null);

  // 초기화: 활성 날짜 로드
  useEffect(() => {
    (async () => {
      try {
        const { data } = await fetchTopTickersLog(settingId, 60, settingName);
        if (data && data.length > 0) {
          const dates = new Set(data.map((l) => l.trade_date).filter(Boolean));
          onActiveDatesChange(dates);
          const latest = [...dates].sort().reverse()[0];
          if (latest) setSelectedDate(latest);
        } else {
          const sampleFiltered = sampleTopTickers.filter(
            (l) => !settingName || l.setting_name === settingName
          );
          const dates = new Set(sampleFiltered.map((l) => l.trade_date));
          onActiveDatesChange(dates);
          const latest = [...dates].sort().reverse()[0];
          if (latest) setSelectedDate(latest);
          setUseSample(true);
        }
      } catch {
        setUseSample(true);
      }
    })();
  }, [settingId]);

  // 날짜 선택 시 조회
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    (async () => {
      try {
        if (useSample) {
          const found = sampleTopTickers.find(
            (l) => l.trade_date === selectedDate && (!settingName || l.setting_name === settingName)
          );
          setTickerData(found ?? null);
        } else {
          const { data } = await fetchTopTickersByDate(selectedDate, settingId, settingName);
          if (data && data.length > 0) {
            setTickerData(data[0]);
          } else {
            const found = sampleTopTickers.find(
              (l) => l.trade_date === selectedDate && (!settingName || l.setting_name === settingName)
            );
            setTickerData(found ?? null);
          }
        }
      } catch {
        setTickerData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate, settingId, useSample, refreshKey]);

  const handleBackfill = async () => {
    if (!tickerData?.id) return;
    setBackfilling(true);
    try {
      const { error } = await backfillTimesFM(String(tickerData.id), selectedDate);
      if (error) {
        Alert.alert('오류', `TimesFM 보정 실패: ${error.message}`);
      } else {
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setBackfilling(false);
    }
  };

  // 종가 조회: tickerData 또는 selectedDate 변경 시
  useEffect(() => {
    if (!tickerData || !selectedDate) {
      setPrices({});
      return;
    }
    const rawTickers = tickerData.tickers ?? [];
    const tickers = (typeof rawTickers === 'string' ? JSON.parse(rawTickers) : rawTickers)
      .map((t) => t.ticker)
      .filter(Boolean);
    if (tickers.length === 0) return;

    setPrices({});
    setPricesLoading(true);
    fetchAllTickerCloses(tickers, selectedDate)
      .then((map) => setPrices(map))
      .catch(() => setPrices({}))
      .finally(() => setPricesLoading(false));
  }, [tickerData, selectedDate]);

  // 시장 지수 조회: 지원 그룹인 경우 선택 날짜의 지수 등락 조회
  useEffect(() => {
    if (!selectedDate || !SUPPORTED_INDEX_GROUPS.has(tickerGroupKey)) {
      setMarketIndex(null);
      return;
    }
    setMarketIndex(null);
    fetchGroupIndexByDate(tickerGroupKey, selectedDate)
      .then((data) => setMarketIndex(data))
      .catch(() => setMarketIndex(null));
  }, [selectedDate, tickerGroupKey]);

  return (
    <View style={{ flex: 1 }}>
      <WeekCalendar
        activeDates={activeDates}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tdsColors.blue500} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.tickersTabContent}>
          {useSample && (
            <View style={[styles.noticeBox, { marginHorizontal: 16 }]}>
              <Text style={styles.noticeText}>샘플 데이터로 표시 중입니다.</Text>
            </View>
          )}

          {!tickerData ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📈</Text>
              <Text style={styles.emptyTitle}>{selectedDate} 종목 데이터 없음</Text>
              <Text style={styles.emptyDesc}>자동매매 실행 후 TOP20이 저장됩니다</Text>
            </View>
          ) : (
            <TickerCard
              data={tickerData}
              prices={prices}
              pricesLoading={pricesLoading}
              marketIndex={marketIndex}
              onBackfill={handleBackfill}
              backfilling={backfilling}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function TickerCard({ data, prices, pricesLoading, marketIndex, onBackfill, backfilling }) {
  const threshold = data.buy_threshold ?? 0.6;
  const rawTickers = data.tickers ?? [];
  const tickers = typeof rawTickers === 'string' ? JSON.parse(rawTickers) : rawTickers;
  const hasMissingTimesFM = tickers.some((t) => t.timesfm_signal == null);

  // ── 통계 계산 ──────────────────────────────────────────────
  const getChangePct = (t) => {
    const p = prices[t.ticker];
    if (p?.tradeClose == null || p?.nextClose == null) return null;
    return ((p.nextClose - p.tradeClose) / p.tradeClose) * 100;
  };

  const withPrice = tickers.filter(t => getChangePct(t) !== null);
  const allChanges = withPrice.map(t => getChangePct(t));
  const avgAll = allChanges.length > 0
    ? allChanges.reduce((a, b) => a + b, 0) / allChanges.length : null;
  const upAll = allChanges.filter(v => v > 0).length;
  const upRatioAll = allChanges.length > 0 ? (upAll / allChanges.length) * 100 : null;

  const tfUpTickers = withPrice.filter(t => t.timesfm_signal === 'up');
  const tfChanges = tfUpTickers.map(t => getChangePct(t));
  const avgTf = tfChanges.length > 0
    ? tfChanges.reduce((a, b) => a + b, 0) / tfChanges.length : null;
  const upTf = tfChanges.filter(v => v > 0).length;
  const upRatioTf = tfChanges.length > 0 ? (upTf / tfChanges.length) * 100 : null;

  const hasStats = !pricesLoading && allChanges.length > 0;

  return (
    <View>
      {/* 요약 카드 */}
      <View style={[styles.tickerSummary, { marginHorizontal: 16 }]}>
        <Text style={styles.tickerSummaryDesc}>
          전체 {data.total_scanned ?? '-'}종목 스캔 · TOP{tickers.length}
        </Text>

        {/* 통계 블록 */}
        {hasStats && (
          <View style={styles.tickerStatsRow}>
            {/* 1. 지수 변화율 */}
            {marketIndex ? (
              <>
                <View style={styles.tickerStatBlock}>
                  <Text style={styles.tickerStatLabel}>{marketIndex.label} (지수)</Text>
                  {marketIndex.changePct !== null ? (
                    <Text style={[
                      styles.tickerStatValue,
                      marketIndex.changePct > 0 ? { color: tdsColors.red500 } : { color: tdsColors.blue500 },
                    ]}>
                      {marketIndex.changePct > 0 ? '+' : ''}{marketIndex.changePct.toFixed(1)}%
                    </Text>
                  ) : (
                    <Text style={styles.tickerStatSub}>데이터 없음</Text>
                  )}
                </View>
                <View style={styles.tickerStatDivider} />
              </>
            ) : null}

            {/* 2. 우리가 만든 모델 평균 */}
            <View style={styles.tickerStatBlock}>
              <Text style={styles.tickerStatLabel}>우리가 만든 모델 평균</Text>
              <Text style={[
                styles.tickerStatValue,
                avgAll > 0 ? { color: tdsColors.red500 } : { color: tdsColors.blue500 },
              ]}>
                {avgAll > 0 ? '+' : ''}{avgAll.toFixed(1)}%
              </Text>
              <Text style={styles.tickerStatSub}>
                적중 {upRatioAll.toFixed(0)}%{'\n'}{upAll}/{allChanges.length}종목
              </Text>
            </View>

            <View style={styles.tickerStatDivider} />

            {/* 3. TimesFM 평균 */}
            <View style={styles.tickerStatBlock}>
              <Text style={[styles.tickerStatLabel, { color: tdsColors.red500 }]}>TimesFM 평균</Text>
              {avgTf !== null ? (
                <>
                  <Text style={[
                    styles.tickerStatValue,
                    avgTf > 0 ? { color: tdsColors.red500 } : { color: tdsColors.blue500 },
                  ]}>
                    {avgTf > 0 ? '+' : ''}{avgTf.toFixed(1)}%
                  </Text>
                  <Text style={styles.tickerStatSub}>
                    적중 {upRatioTf.toFixed(0)}%{'\n'}{upTf}/{tfChanges.length}종목
                  </Text>
                </>
              ) : (
                <Text style={styles.tickerStatSub}>데이터 없음</Text>
              )}
            </View>
          </View>
        )}

        {/* TimesFM 보정 버튼 */}
        {hasMissingTimesFM && (
          <TouchableOpacity
            style={styles.backfillButton}
            onPress={onBackfill}
            disabled={backfilling}
          >
            {backfilling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.backfillButtonText}>▲ TimesFM 보정 실행</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── 종목 목록 (full-width) ── */}
      {tickers.map((t, i) => {
        const aboveThreshold = t.buy_prob >= threshold;
        const probPct = (t.buy_prob * 100).toFixed(1);
        const priceInfo = prices[t.ticker];
        const tradeClose = priceInfo?.tradeClose ?? null;
        const nextClose = priceInfo?.nextClose ?? null;
        const changePct = tradeClose && nextClose
          ? ((nextClose - tradeClose) / tradeClose) * 100
          : null;
        const isUp = changePct !== null && changePct > 0;
        const isDown = changePct !== null && changePct < 0;

        return (
          <View key={t.ticker ?? i} style={styles.tickerRow}>
            {/* 순위 */}
            <View style={styles.tickerRank}>
              <Text style={styles.tickerRankNum}>{t.rank ?? i + 1}</Text>
            </View>

            {/* 종목명 + 확률 */}
            <View style={styles.tickerInfo}>
              <View style={styles.tickerTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.tickerSymbol}>{t.ticker}</Text>
                  {/* TimesFM 방향 신호 뱃지 */}
                  {t.timesfm_signal === 'up' && (
                    <View style={styles.timesfmUp}>
                      <Text style={styles.timesfmUpText}>▲ TimesFM</Text>
                    </View>
                  )}
                  {t.timesfm_signal === 'down' && (
                    <View style={styles.timesfmDown}>
                      <Text style={styles.timesfmDownText}>▼ TimesFM</Text>
                    </View>
                  )}
                </View>
                <View style={styles.tickerRight}>
                  <Text style={[styles.tickerProb, aboveThreshold && { color: tdsColors.red500 }]}>
                    {probPct}%
                  </Text>
                  {aboveThreshold && (
                    <Ionicons name="checkmark-circle" size={14} color={tdsColors.green400} />
                  )}
                </View>
              </View>
              <Text style={styles.tickerName} numberOfLines={1}>{t.name || '-'}</Text>

              {/* 종가 행 */}
              <View style={styles.tickerPriceRow}>
                {pricesLoading && !priceInfo ? (
                  <Text style={styles.tickerPriceLoading}>조회 중...</Text>
                ) : (
                  <>
                    <Text style={styles.tickerPriceValue}>
                      {tradeClose != null ? `$${tradeClose.toFixed(2)}` : '-'}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={11}
                      color={tdsDark.textTertiary}
                      style={{ marginHorizontal: 4 }}
                    />
                    <Text style={[
                      styles.tickerPriceValue,
                      nextClose == null && { color: tdsDark.textTertiary },
                    ]}>
                      {nextClose != null ? `$${nextClose.toFixed(2)}` : '-'}
                    </Text>
                    {changePct !== null && (
                      <View style={[
                        styles.tickerChangeBadge,
                        isUp && { backgroundColor: `${tdsColors.red500}20` },
                        isDown && { backgroundColor: `${tdsColors.blue500}20` },
                      ]}>
                        <Text style={[
                          styles.tickerChangeText,
                          isUp && { color: tdsColors.red500 },
                          isDown && { color: tdsColors.blue500 },
                        ]}>
                          {isUp ? '+' : ''}{changePct.toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function ScheduleDetailScreen() {
  const {
    settingId, settingName, targetGroup,
    execution_time, ticker_group_key,
    ai_model_key,
    buy_condition, sell_condition,
    is_active, trade_enabled,
  } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('tickers');
  const [logActiveDates, setLogActiveDates] = useState(new Set());
  const [tickerActiveDates, setTickerActiveDates] = useState(new Set());

  // 현재 탭의 활성 날짜
  const activeDates = activeTab === 'logs' ? logActiveDates : tickerActiveDates;

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={tdsDark.textPrimary} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {settingName || '설정'}
        </Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push({
            pathname: '/schedule-form',
            params: {
              settingId,
              settingName,
              execution_time,
              ticker_group_key,
              ai_model_key,
              buy_condition,
              sell_condition,
              is_active,
              trade_enabled,
            },
          })}
          hitSlop={8}
        >
          <Text style={styles.editText}>수정</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <SegmentControl
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 콘텐츠 */}
      <View style={{ flex: 1 }}>
        {activeTab === 'logs' ? (
          <LogsTab
            settingId={settingId}
            settingName={settingName}
            activeDates={activeDates}
            onActiveDatesChange={setLogActiveDates}
          />
        ) : (
          <TickersTab
            settingId={settingId}
            settingName={settingName}
            tickerGroupKey={ticker_group_key}
            activeDates={activeDates}
            onActiveDatesChange={setTickerActiveDates}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60 },
  backText: { fontSize: 15, color: tdsDark.textPrimary },
  headerTitle: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary, flex: 1, textAlign: 'center' },
  editBtn: { minWidth: 60, alignItems: 'flex-end' },
  editText: { fontSize: 15, color: tdsColors.blue500 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  tabContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32 },
  tickersTabContent: { paddingVertical: 12, paddingBottom: 32 },

  noticeBox: {
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tdsColors.blue50,
    borderRadius: 12,
  },
  noticeText: { fontSize: 12, color: tdsColors.blue700 },

  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
  emptyDesc: { fontSize: 12, color: tdsDark.textSecondary },

  // 로그 카드
  logCard: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  logCardLeft: { flex: 1, gap: 8 },
  logCardBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logGroupLabel: { fontSize: 12, color: tdsDark.textTertiary, fontWeight: '500' },
  logStatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statChip: { alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 10, color: tdsDark.textTertiary },
  statValue: { fontSize: 13, color: tdsDark.textPrimary },

  logDetail: {
    backgroundColor: '#1a1a2e',
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tdsDark.border,
  },
  logLine: { fontSize: 11, color: '#a8dadc', fontFamily: 'monospace', lineHeight: 18 },
  logErrorText: { fontSize: 12, color: tdsColors.red500, lineHeight: 18 },

  // 티커 카드
  tickerSummary: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  tickerSummaryDesc: { fontSize: 12, color: tdsDark.textSecondary, marginBottom: 10 },
  backfillButton: {
    backgroundColor: tdsColors.red500,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  backfillButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // 통계 블록
  tickerStatsRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 0,
  },
  tickerStatBlock: {
    flex: 1,
    gap: 3,
  },
  tickerStatDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: tdsDark.border,
    marginHorizontal: 12,
  },
  tickerStatLabel: { fontSize: 11, color: tdsDark.textTertiary, fontWeight: '600' },
  tickerStatValue: { fontSize: 18, fontWeight: '700', color: tdsDark.textPrimary },
  tickerStatSub: { fontSize: 11, color: tdsDark.textTertiary, lineHeight: 16 },

  tickerPriceHeader: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tdsDark.border,
  },
  tickerPriceHeaderLabel: { fontSize: 10, color: tdsDark.textTertiary, flex: 1, textAlign: 'center' },

  tickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: tdsDark.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  tickerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tdsDark.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  tickerRankNum: { fontSize: 12, fontWeight: '700', color: tdsDark.textSecondary },
  tickerInfo: { flex: 1, gap: 2 },
  tickerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tickerSymbol: { fontSize: 14, fontWeight: '700', color: tdsDark.textPrimary },
  tickerName: { fontSize: 11, color: tdsDark.textTertiary },
  tickerRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tickerProb: { fontSize: 14, fontWeight: '600', color: tdsDark.textSecondary },

  tickerPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    flexWrap: 'wrap',
    gap: 2,
  },
  tickerPriceLoading: { fontSize: 11, color: tdsDark.textTertiary },
  tickerPriceValue: { fontSize: 12, fontWeight: '500', color: tdsDark.textSecondary },
  tickerChangeBadge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: tdsDark.bgSecondary,
  },
  tickerChangeText: { fontSize: 11, fontWeight: '600', color: tdsDark.textSecondary },

  // TimesFM 방향 신호 뱃지
  timesfmUp: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: `${tdsColors.red500}22`,
  },
  timesfmUpText: { fontSize: 10, fontWeight: '700', color: tdsColors.red500 },
  timesfmDown: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: `${tdsColors.blue500}22`,
  },
  timesfmDownText: { fontSize: 10, fontWeight: '700', color: tdsColors.blue500 },
});

// ─── 달력 Styles ──────────────────────────────────────────────────────────────

const calStyles = StyleSheet.create({
  container: {
    backgroundColor: tdsDark.bgCard,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  monthLabel: { fontSize: 15, fontWeight: '700', color: tdsDark.textPrimary, minWidth: 80, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 4 },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dayLabel: { fontSize: 11, color: tdsDark.textTertiary, fontWeight: '500' },
  dateCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleActive: { backgroundColor: tdsColors.blue500 },
  dateNum: { fontSize: 14, color: tdsDark.textPrimary, fontWeight: '500' },
  dateNumActive: { color: tdsColors.white, fontWeight: '700' },
  dotRow: { height: 6, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: tdsDark.border },
  dotActive: { backgroundColor: tdsColors.white },
});
