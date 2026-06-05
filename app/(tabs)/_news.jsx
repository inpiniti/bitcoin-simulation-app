/**
 * S&P 500 뉴스 분석 화면
 *
 * [TDS 규칙 적용]
 * - 제이콥 법칙: 계좌 탭과 동일한 ScreenHeader + listCard 구조 사용
 * - 도허티 임계: 스켈레톤 로딩
 * - 밀러 법칙: reason 항상 노출, confidence 50% 이상 필터
 * - 피크엔드: 빈 상태 이모지 + 해요체 메시지
 * - 심미적 사용성: 계좌 탭과 동일한 그림자·컬러·타이포그래피
 * - 폰 레스토프 효과: XGBoost/RL/TimesFM/Chronos/Moirai 신호 컬러 뱃지로 차별화
 */
import { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { MiniSparkline } from '../../components/tds/MiniSparkline';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { Button } from '../../components/tds/Button';
import {
  fetchSp500ActiveDates,
  fetchSp500MetaByDate,
  fetchSp500ActionableByDate,
  fetchSp500HourlyByDate,
} from '../../lib/sp500Api';
import { fetchTickerWeeklyCloses } from '../../lib/priceApi';
import { fetchSettings } from '../../lib/tradingApi';

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getMarketFromExchange(exchange) {
  if (!exchange) return 'NAS'; // 기본값
  const upperEx = exchange.toUpperCase();
  if (upperEx.includes('NYSE') || upperEx === 'NYS') return 'NYS';
  if (upperEx.includes('NASDAQ') || upperEx === 'NAS') return 'NAS';
  return 'NAS'; // 기본값
}

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

// ─── 화면 헤더 (계좌 탭과 동일 패턴) ─────────────────────────────────────────

function ScreenHeader() {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  const handleSettingsPress = () => {
    router.push('/news-settings');
  };

  return (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.headerEyebrow}>S&P 500 · 뉴스 분석</Text>
            <Text style={styles.headerTitle}>시장 심리</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={handleSettingsPress}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color={tdsDark.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>{today} 기준으로 분석해요</Text>
      </View>
    </View>
  );
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

// ─── 요약 카드 (계좌 탭 portfolioCard 패턴) ──────────────────────────────────

function MetaSummaryCard({ meta }) {
  if (!meta) return null;
  const total = (meta.bullish_count ?? 0) + (meta.bearish_count ?? 0) + (meta.neutral_count ?? 0);

  return (
    <View style={styles.portfolioCard}>
      <View style={styles.portfolioTopRow}>
        <Text style={styles.portfolioTitle}>
          {meta.news_count ?? '-'}건 뉴스 분석
        </Text>
        <View style={styles.portfolioMetaRight}>
          <Text style={[styles.portfolioAvgRate, { color: tdsColors.red500 }]}>
            📈 낙관 {meta.bullish_count ?? 0}종목
          </Text>
          <Text style={[styles.portfolioProfit, { color: tdsDark.textTertiary }]}>
            전체 {total}종목 분석
          </Text>
        </View>
      </View>

      <View style={styles.portfolioChips}>
        <View style={[styles.portfolioChip, { backgroundColor: `${tdsColors.red500}15` }]}>
          <Text style={[styles.portfolioChipName, { color: tdsColors.red500 }]}>📈 낙관</Text>
          <Text style={[styles.portfolioChipRate, { color: tdsColors.red500 }]}>
            {meta.bullish_count ?? 0}
          </Text>
        </View>
        <View style={[styles.portfolioChip, { backgroundColor: `${tdsColors.blue500}15` }]}>
          <Text style={[styles.portfolioChipName, { color: tdsColors.blue500 }]}>📉 비관</Text>
          <Text style={[styles.portfolioChipRate, { color: tdsColors.blue500 }]}>
            {meta.bearish_count ?? 0}
          </Text>
        </View>
        <View style={styles.portfolioChip}>
          <Text style={styles.portfolioChipName}>➡️ 중립</Text>
          <Text style={styles.portfolioChipRate}>{meta.neutral_count ?? 0}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── 모델 신호 뱃지 ───────────────────────────────────────────────────────────

/**
 * 신호값을 뱃지 텍스트 + 색상으로 변환
 * - XGBoost: xgb_prob (0~1) → up/down %
 * - RL: rl_signal (BUY/HOLD/SELL)
 * - TimesFM/Chronos/Moirai: signal (up/down)
 */
function SignalBadge({ label, value, type, iconUrl }) {
  if (value == null || value === undefined) return null;

  let badgeText = '';
  let badgeBg = tdsDark.bgSecondary;
  let badgeColor = tdsDark.textSecondary;
  let displayLabel = label;

  if (type === 'xgb') {
    const pct = Math.round(value * 100);
    badgeText = `XGB ${pct}%`;
    if (pct >= 70) { badgeBg = `${tdsColors.red500}18`; badgeColor = tdsColors.red500; }
    else if (pct >= 55) { badgeBg = `${tdsColors.orange500}18`; badgeColor = tdsColors.orange500; }
    else { badgeBg = `${tdsDark.textTertiary}18`; badgeColor = tdsDark.textTertiary; }
  } else if (type === 'rl') {
    if (value === 'BUY') { badgeText = '🤖 BUY'; badgeBg = `${tdsColors.red500}18`; badgeColor = tdsColors.red500; }
    else if (value === 'SELL') { badgeText = '🤖 SELL'; badgeBg = `${tdsColors.blue500}18`; badgeColor = tdsColors.blue500; }
    else { badgeText = '🤖 HOLD'; badgeBg = `${tdsDark.textTertiary}18`; badgeColor = tdsDark.textTertiary; }
  } else if (type === 'rumors') {
    const conf = Math.round(value * 100);
    const emoji = label === 'BUY' ? '📈' : label === 'SELL' ? '📉' : '➡️';
    badgeText = `${emoji} 소문 ${label} ${conf}%`;
    if (label === 'BUY') { badgeBg = `${tdsColors.red500}18`; badgeColor = tdsColors.red500; }
    else if (label === 'SELL') { badgeBg = `${tdsColors.blue500}18`; badgeColor = tdsColors.blue500; }
    else { badgeBg = `${tdsDark.textTertiary}18`; badgeColor = tdsDark.textTertiary; }
  } else {
    // TimesFM / Chronos / Moirai - 모델 풀네임 표시
    const modelNames = {
      'timesfm': 'google/TimesFM',
      'chronos': 'amazon/Chronos',
      'moirai': 'salesforce/Moirai',
    };
    displayLabel = modelNames[type] || label;

    if (value === 'up') {
      badgeText = `▲ ${displayLabel}`;
      badgeBg = `${tdsColors.red500}18`;
      badgeColor = tdsColors.red500;
    } else {
      badgeText = `▼ ${displayLabel}`;
      badgeBg = `${tdsColors.blue500}18`;
      badgeColor = tdsColors.blue500;
    }
  }

  return (
    <View style={signalStyles.badgeContainer}>
      {iconUrl && (
        <Image
          source={{ uri: iconUrl }}
          style={signalStyles.badgeIcon}
        />
      )}
      <View style={[signalStyles.badge, { backgroundColor: badgeBg }]}>
        <Text style={[signalStyles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
      </View>
    </View>
  );
}

const signalStyles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  signalCompactRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  signalCompactText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

// ─── 스켈레톤 (도허티 임계 법칙) ─────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '40%' }]} />
        <View style={[styles.skeletonLine, { width: '70%', marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '90%', marginTop: 6 }]} />
        {/* 모델 신호 스켈레톤 */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          <View style={[styles.skeletonLine, { width: 52, height: 22, borderRadius: 6 }]} />
          <View style={[styles.skeletonLine, { width: 52, height: 22, borderRadius: 6 }]} />
          <View style={[styles.skeletonLine, { width: 60, height: 22, borderRadius: 6 }]} />
        </View>
      </View>
      <View style={styles.skeletonRight}>
        <View style={[styles.skeletonLine, { width: 44 }]} />
      </View>
    </View>
  );
}

// ─── 종목 행 ─────────────────────────────────────────────────────────────────

function StockRow({ item, rank, isLast, selectedDate, onPress }) {
  const [weeklyData, setWeeklyData] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // 7일 차트 데이터 조회
  useEffect(() => {
    setWeeklyLoading(true);
    fetchTickerWeeklyCloses(item.ticker, selectedDate)
      .then(setWeeklyData)
      .catch(() => setWeeklyData([]))
      .finally(() => setWeeklyLoading(false));
  }, [selectedDate, item.ticker]);

  // 7일 경과 여부 판단
  const isWithinWeek = weeklyData && weeklyData.length > 0
    ? (() => {
        const lastDate = weeklyData[weeklyData.length - 1]?.dateStr;
        const selectedD = new Date(selectedDate);
        const lastD = new Date(lastDate);
        const daysElapsed = Math.floor((selectedD - lastD) / (1000 * 60 * 60 * 24));
        return daysElapsed < 7;
      })()
    : true;

  const confidencePct = Math.round((item.confidence ?? 0) * 100);
  const isBullish = item.direction === 'bullish';
  const barColor = isBullish
    ? (confidencePct >= 80 ? tdsColors.red500 : confidencePct >= 65 ? tdsColors.orange500 : tdsColors.yellow500)
    : (confidencePct >= 80 ? tdsColors.blue500 : confidencePct >= 65 ? tdsColors.blue300 : tdsColors.blue200);

  // 모델 신호 추출 유틸
  const isUp = (val, type) => {
    if (type === 'xgb') return val > 0.55;
    if (type === 'rl') return val === 'BUY';
    return val === 'up';
  };
  const isDown = (val, type) => {
    if (type === 'xgb') return val < 0.45;
    if (type === 'rl') return val === 'SELL';
    return val === 'down';
  };

  const signalCount = [
    isUp(item.xgb_prob, 'xgb') ? 1 : 0,
    isUp(item.rl_signal, 'rl') ? 1 : 0,
    isUp(item.timesfm_signal, 'timesfm') ? 1 : 0,
    isUp(item.chronos_signal, 'chronos') ? 1 : 0,
    isUp(item.moirai_signal, 'moirai') ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const bearishCount = [
    isDown(item.xgb_prob, 'xgb') ? 1 : 0,
    isDown(item.rl_signal, 'rl') ? 1 : 0,
    isDown(item.timesfm_signal, 'timesfm') ? 1 : 0,
    isDown(item.chronos_signal, 'chronos') ? 1 : 0,
    isDown(item.moirai_signal, 'moirai') ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const consensusCount = isBullish ? signalCount : bearishCount;

  // 모델 신호 존재 여부 (소문 포함)
  const hasSignals = item.xgb_prob != null || item.rl_signal != null ||
    item.timesfm_signal != null || item.chronos_signal != null || item.moirai_signal != null ||
    item.rumors_signal != null;

  // 그림2 기준 — 1줄 compact 시그널 items
  const signalItems = [];
  if (item.xgb_prob != null) {
    const up = item.xgb_prob > 0.55;
    const down = item.xgb_prob < 0.45;
    signalItems.push({ key: 'xgb', up, down, label: 'xgb' });
  }
  if (item.rl_signal != null) {
    const up = item.rl_signal === 'BUY';
    const down = item.rl_signal === 'SELL';
    signalItems.push({ key: 'rl', up, down, label: 'rl' });
  }
  if (item.timesfm_signal != null) {
    const up = item.timesfm_signal === 'up';
    signalItems.push({ key: 'times', up, down: !up, label: 'times' });
  }
  if (item.chronos_signal != null) {
    const up = item.chronos_signal === 'up';
    signalItems.push({ key: 'chrono', up, down: !up, label: 'chrono' });
  }
  if (item.moirai_signal != null) {
    const up = item.moirai_signal === 'up';
    signalItems.push({ key: 'moirai', up, down: !up, label: 'moirai' });
  }
  if (item.rumors_signal != null) {
    const up = item.rumors_signal === 'BUY';
    const down = item.rumors_signal === 'SELL';
    signalItems.push({ key: 'rumors', up, down, label: 'rumors' });
  }

  return (
    <TouchableOpacity
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.stockRow}>
        {/* 좌: 순위 아바타 */}
        <View style={styles.rankAvatar}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>

        {/* 중: 종목 정보 */}
        <View style={styles.stockBody}>
          {/* 티커 + 섹터 + 동의 수 */}
          <View style={styles.stockTopRow}>
            <Text style={styles.stockTicker}>{item.ticker}</Text>
            <View style={styles.sectorChip}>
              <Text style={styles.sectorText} numberOfLines={1}>{item.sector}</Text>
            </View>
            {hasSignals && consensusCount >= 3 && (
              <View style={[styles.consensusChip, !isBullish && { backgroundColor: `${tdsColors.blue500}12` }]}>
                <Text style={[styles.consensusText, !isBullish && { color: tdsColors.blue500 }]}>
                  동의 {consensusCount}/5
                </Text>
              </View>
            )}
          </View>

          {/* reason */}
          <Text style={styles.reasonText} numberOfLines={2}>
            {item.reason || '분석 근거 없음'}
          </Text>

          {/* 소문 이유 */}
          {item.rumors_signal && item.rumors_reason && (
            <Text style={styles.rumorsReasonText}>
              💭 소문 {item.rumors_signal} · {item.rumors_reason}
            </Text>
          )}

          {/* 그림2: 모델 시그널 1줄 compact — ▲/▼ xgb · ▲/▼ rl · ▲/▼ times ... */}
          {signalItems.length > 0 && (
            <View style={styles.compactSignalRow}>
              {signalItems.map((s, i) => (
                <Text
                  key={s.key}
                  style={[
                    styles.compactSignalItem,
                    { color: s.up ? tdsColors.red500 : s.down ? tdsDark.priceDown : tdsDark.textTertiary },
                    i > 0 && { marginLeft: 8 },
                  ]}
                >
                  {s.up ? '▲' : s.down ? '▼' : '–'} {s.label}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* 우: 신뢰도 % */}
        <View style={styles.rightBlock}>
          <Text style={[styles.confidencePct, { color: barColor }]}>{confidencePct}%</Text>
          <Text style={styles.confidenceLabel}>신뢰도</Text>
        </View>
      </View>

      {/* 차트 — 좌우 여백 없이 전체폭, 구분선은 차트 아래 */}
      <View style={styles.chartRow}>
        {weeklyLoading ? (
          <ActivityIndicator size="small" color={tdsDark.textTertiary} />
        ) : weeklyData && weeklyData.length > 0 ? (
          <MiniSparkline
            data={weeklyData}
            tradeDate={selectedDate}
            prediction={isBullish ? 'up' : 'down'}
            width={SCREEN_WIDTH}
            height={60}
          />
        ) : (
          <View style={{ height: 60 }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── 섹션 헤더 ────────────────────────────────────────────────────────────────

function SectionHeader({ title, count, subtitle }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title} · {count}개</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>
    </View>
  );
}

// ─── 시간대 탭 (Option 2: 수평 스크롤) ─────────────────────────────────────────

function HourlyTimeTabs({ times, selectedTime, onSelectTime, loading }) {
  if (!times || times.length === 0) return null;

  return (
    <View style={hourlyTabStyles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={hourlyTabStyles.scrollContent}
      >
        {times.map((time) => {
          const isSelected = time === selectedTime;
          return (
            <TouchableOpacity
              key={time}
              onPress={() => !loading && onSelectTime(time)}
              style={[
                hourlyTabStyles.tab,
                isSelected && hourlyTabStyles.tabActive,
              ]}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  hourlyTabStyles.tabText,
                  isSelected && hourlyTabStyles.tabTextActive,
                ]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────

export default function NewsScreen() {
  const today = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeDates, setActiveDates] = useState(new Set());
  const [meta, setMeta] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  // 시간대별 조회 (Option 2)
  const [hourlyTimes, setHourlyTimes] = useState([]);
  const [hourlyByTime, setHourlyByTime] = useState({});
  const [selectedTime, setSelectedTime] = useState(null);
  const [hourlyLoading, setHourlyLoading] = useState(false);

  // 활성 날짜 초기 로드
  useEffect(() => {
    (async () => {
      const { data } = await fetchSp500ActiveDates(60);
      if (data && data.length > 0) {
        setActiveDates(new Set(data));
        const latest = [...data].sort().reverse()[0];
        if (latest) setSelectedDate(latest);
      }
    })();
  }, []);

  // 날짜 변경 시 데이터 로드 (daily + hourly)
  const loadData = useCallback(async (date) => {
    setLoading(true);
    setHourlyLoading(true);
    try {
      // Daily 데이터
      const [metaRes, stocksRes] = await Promise.all([
        fetchSp500MetaByDate(date),
        fetchSp500ActionableByDate(date),
      ]);
      setMeta(metaRes.data);
      setStocks(stocksRes.data || []);

      // Hourly 데이터
      const hourlyRes = await fetchSp500HourlyByDate(date);
      console.log('[Hourly] Date:', date, 'Times:', hourlyRes.times, 'Error:', hourlyRes.error);
      setHourlyTimes(hourlyRes.times || []);
      setHourlyByTime(hourlyRes.by_time || {});

      // 가장 최근 시간 자동 선택
      const times = hourlyRes.times || [];
      if (times.length > 0) {
        const latestTime = times[times.length - 1];
        setSelectedTime(latestTime);
      } else {
        setSelectedTime(null);
      }
    } catch {
      setMeta(null);
      setStocks([]);
      setHourlyTimes([]);
      setHourlyByTime({});
      setSelectedTime(null);
    } finally {
      setLoading(false);
      setHourlyLoading(false);
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
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tdsColors.blue500}
          />
        }
      >
        {/* 화면 헤더 */}
        <ScreenHeader />

        {/* 주간 달력 */}
        <WeekCalendar
          activeDates={activeDates}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        {/* 시간대 탭 (Option 2: 수평 스크롤) */}
        {hourlyTimes.length > 0 && (
          <HourlyTimeTabs
            times={hourlyTimes}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
            loading={hourlyLoading}
          />
        )}

        {/* 요약 카드 */}
        <MetaSummaryCard meta={meta} />

        {/* 종목 리스트 섹션 */}
        {loading || hourlyLoading ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.skeletonLine, { width: 120, height: 14, marginTop: 0 }]} />
            </View>
            <View style={styles.listCard}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </View>
          </>
        ) : (() => {
          // 시간 선택이 있으면 hourly 데이터 사용, 없으면 daily 데이터 사용
          const displayStocks = selectedTime && hourlyByTime[selectedTime]
            ? hourlyByTime[selectedTime]
            : stocks;

          return displayStocks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>
                {selectedTime
                  ? `${selectedDate} ${selectedTime}에 분석된 종목이 없어요`
                  : `${selectedDate}에 분석된 종목이 없어요`
                }
              </Text>
              <Text style={styles.emptyDesc}>
                달력에서 점이 표시된 날짜를 선택해 보세요{'\n'}
                매시간 정각에 자동으로 분석이 실행돼요
              </Text>
            </View>
          ) : (
            <>
              {/* 낙관 섹션 */}
              {displayStocks.filter(s => s.direction === 'bullish').length > 0 && (
                <>
                  <SectionHeader
                    title="📈 낙관 종목"
                    count={displayStocks.filter(s => s.direction === 'bullish').length}
                    subtitle="매수 타이밍을 노려보세요"
                  />
                  <View style={styles.listCard}>
                    {displayStocks.filter(s => s.direction === 'bullish').map((item, idx) => (
                      <StockRow
                        key={item.ticker}
                        item={item}
                        rank={idx + 1}
                        isLast={idx === displayStocks.filter(s => s.direction === 'bullish').length - 1}
                        selectedDate={selectedDate}
                        onPress={(stock) => {
                          setSelectedStock(stock);
                          setShowActionSheet(true);
                        }}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* 비관 섹션 */}
              {displayStocks.filter(s => s.direction === 'bearish').length > 0 && (
                <>
                  <SectionHeader
                    title="📉 비관 종목"
                    count={displayStocks.filter(s => s.direction === 'bearish').length}
                    subtitle="매도 또는 보류가 필요해요"
                  />
                  <View style={[styles.listCard, { marginTop: 8 }]}>
                    {displayStocks.filter(s => s.direction === 'bearish').map((item, idx) => (
                      <StockRow
                        key={item.ticker}
                        item={item}
                        rank={idx + 1}
                        isLast={idx === displayStocks.filter(s => s.direction === 'bearish').length - 1}
                        selectedDate={selectedDate}
                        onPress={(stock) => {
                          setSelectedStock(stock);
                          setShowActionSheet(true);
                        }}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          );
        })()}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 액션 시트 */}
      <BottomSheet
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title={selectedStock?.ticker || ''}
        cta={
          <View style={styles.sheetCtaRow}>
            <Button onPress={() => setShowActionSheet(false)} variant="weak" style={{ flex: 1 }}>닫기</Button>
            <Button
              onPress={() => {
                setShowActionSheet(false);
                if (selectedStock) {
                  const market = getMarketFromExchange(selectedStock.exchange);
                  router.push({
                    pathname: '/realtime-form',
                    params: {
                      ticker: selectedStock.ticker,
                      market: market,
                      auto_fetch_price: 'true',
                    },
                  });
                }
              }}
              style={{ flex: 1 }}
            >
              실시간 등록
            </Button>
          </View>
        }
      >
        {selectedStock && (
          <View style={{ paddingBottom: 20 }}>
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                setShowActionSheet(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-down-circle-outline" size={20} color={tdsColors.blue500} />
              <Text style={styles.actionOptionText}>매수</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                setShowActionSheet(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-up-circle-outline" size={20} color={tdsColors.red500} />
              <Text style={[styles.actionOptionText, { color: tdsColors.red500 }]}>매도</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

// ─── 달력 스타일 ──────────────────────────────────────────────────────────────

const calStyles = StyleSheet.create({
  container: {
    backgroundColor: tdsDark.bgCard,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  dayCol: { alignItems: 'center', width: 40 },
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
  dateCircleActive: { backgroundColor: tdsColors.blue500 },
  dateNum: {
    fontSize: 14,
    fontWeight: '500',
    color: tdsDark.textPrimary,
  },
  dateNumActive: { color: '#fff', fontWeight: '700' },
  dotRow: { marginTop: 3, height: 5, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: tdsColors.blue500 },
  dotActive: { backgroundColor: '#fff' },
});

// ─── 메인 스타일 (계좌 탭과 동일 패턴 + 신호 뱃지 추가) ─────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  scroll: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 32 },

  // ── 헤더 (account.jsx 완전 동일) ──
  screenHeader: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  settingsBtn: {
    padding: 4,
    marginRight: -4,
  },
  headerEyebrow: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 2 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 13, color: tdsDark.textSecondary, marginTop: 2 },
  headerPill: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: tdsColors.blue50,
    borderWidth: 1,
    borderColor: `${tdsColors.blue500}33`,
  },
  headerPillText: { fontSize: 12, color: tdsColors.blue700, fontWeight: '600' },

  // ── 요약 카드 (account.jsx portfolioCard 완전 동일) ──
  portfolioCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: tdsDark.bgCard,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  portfolioTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  portfolioTitle: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
  portfolioAvgRate: { fontSize: 16, fontWeight: '700' },
  portfolioMetaRight: { alignItems: 'flex-end', gap: 4 },
  portfolioProfit: { fontSize: 13, fontWeight: '600' },
  portfolioChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portfolioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  portfolioChipName: { fontSize: 13, color: tdsDark.textSecondary },
  portfolioChipRate: { fontSize: 13, fontWeight: '600', color: tdsDark.textPrimary },

  // ── 섹션 헤더 (account.jsx sectionTitle 패턴) ──
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    fontWeight: '600',
  },
  sectionSub: {
    fontSize: 12,
    color: tdsDark.textTertiary,
  },

  // ── 리스트 카드 (account.jsx listCard 완전 동일) ──
  listCard: {
    marginTop: 4,
    backgroundColor: tdsDark.bgCard,
  },

  // ── 종목 행 ──
  stockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stockRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  rankAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tdsDark.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: tdsDark.textSecondary,
  },
  stockBody: { flex: 1, marginRight: 12 },
  stockTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  stockTicker: {
    fontSize: 15,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  sectorChip: {
    backgroundColor: `${tdsColors.blue500}12`,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    maxWidth: 110,
  },
  sectorText: {
    fontSize: 10,
    color: tdsColors.blue600,
    fontWeight: '600',
  },
  consensusChip: {
    backgroundColor: `${tdsColors.red500}12`,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  consensusText: {
    fontSize: 10,
    color: tdsColors.red500,
    fontWeight: '700',
  },
  // reason — 항상 노출, 가장 중요한 정보
  reasonText: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    lineHeight: 19,
    marginBottom: 6,
  },
  // 소문 이유
  rumorsReasonText: {
    fontSize: 12,
    color: tdsDark.textTertiary,
    lineHeight: 17,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  barTrack: {
    height: 3,
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: { height: 3, borderRadius: 2 },

  // ── 그림2 기준: 모델 시그널 1줄 compact ──
  compactSignalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  compactSignalItem: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── 우측 신뢰도 ──
  rightBlock: { alignItems: 'flex-end', minWidth: 48 },
  confidencePct: { fontSize: 15, fontWeight: '700' },
  confidenceLabel: { fontSize: 11, color: tdsDark.textTertiary, marginTop: 2 },

  // ── 스켈레톤 (account.jsx 동일) ──
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8ecef',
    marginRight: 12,
  },
  skeletonBody: { flex: 1 },
  skeletonRight: { alignItems: 'flex-end' },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e8ecef',
  },

  // ── 빈 상태 (피크엔드 법칙: 이모지 + 해요체) ──
  emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: tdsDark.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── 차트 행 — 좌우 여백 없음, 구분선은 차트 아래 ──
  chartRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },

  // ── 액션 시트 ──
  sheetCtaRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  actionOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: tdsColors.blue500,
  },
});

// ─── 시간대 탭 스타일 ──────────────────────────────────────────────────────────

const hourlyTabStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 0,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: tdsDark.bgSecondary,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: tdsColors.blue500,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: tdsDark.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
});
