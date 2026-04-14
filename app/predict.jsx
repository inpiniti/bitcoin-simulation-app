/**
 * 예측 화면 — XGBoost 모델로 시장 예측
 * 모델 탭에서 모델을 선택하면 push (모델은 이미 선택된 상태)
 *
 * 기능:
 *  - 기간 선택: 7일 / 14일 / 30일 / 60일
 *  - 예측 대상: 티커 그룹 (KOSPI/KOSDAQ/NASDAQ/NYSE) | 단일 종목 입력
 *  - 임계값 설정 (선택): 매수/매도 임계값 지정 → 신호 필터링
 *  - 결과: 단일 → 확률 카드 / 그룹 → 요약 + 목록
 */
import { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../constants/tdsColors';
import { Button } from '../components/tds/Button';
import { Badge } from '../components/tds/Badge';
import { supabase } from '../lib/supabaseClient';
import { predictXgb } from '../lib/xgbApi';
import { samplePredictionResults } from '../lib/sampleData';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const PERIODS = [
  { key: 7, label: '7일' },
  { key: 14, label: '14일' },
  { key: 30, label: '30일' },
  { key: 60, label: '60일' },
];

const MARKETS = [
  { key: 'kospi', label: 'KOSPI' },
  { key: 'kosdaq', label: 'KOSDAQ' },
  { key: 'nasdaq', label: 'NASDAQ' },
  { key: 'nyse', label: 'NYSE' },
];

const BUY_THRESHOLDS = [
  { key: 0.50, label: '50%' },
  { key: 0.55, label: '55%' },
  { key: 0.60, label: '60%' },
  { key: 0.65, label: '65%' },
  { key: 0.70, label: '70%' },
];

const SELL_THRESHOLDS = [
  { key: 0.30, label: '30%' },
  { key: 0.35, label: '35%' },
  { key: 0.40, label: '40%' },
  { key: 0.45, label: '45%' },
  { key: 0.50, label: '50%' },
];


const BADGE_COLORS = [
  '#3182f6', '#f04452', '#03b26c',
  '#fe9800', '#8b5cf6', '#06b6d4',
];

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function resolveSignal(buyProb, buyThreshold, sellThreshold) {
  if (buyProb >= buyThreshold) return 'BUY';
  if (buyProb <= sellThreshold) return 'SELL';
  return 'HOLD';
}

function getLetterBg(str) {
  return BADGE_COLORS[(str?.charCodeAt(0) ?? 65) % BADGE_COLORS.length];
}

// ─── 공통 서브컴포넌트 ─────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function ChipRow({ options, value, onChange, disabled }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={String(opt.key)}
            onPress={() => !disabled && onChange(opt.key)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SignalBadge({ signal }) {
  const colorMap = { BUY: 'red', SELL: 'blue', HOLD: 'grey' };
  return (
    <Badge color={colorMap[signal] ?? 'grey'} size="small" variant="weak">
      {signal}
    </Badge>
  );
}

// 커스텀 토글 스위치
function ToggleSwitch({ value, onToggle }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={[styles.toggle, value && styles.toggleOn]}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
    </TouchableOpacity>
  );
}

// ─── 단일 종목 결과 카드 ──────────────────────────────────────────────────────

function SingleResultCard({ result, buyThreshold, sellThreshold }) {
  const buyProb = result.buy_probability ?? 0.5;
  const buyPct = Math.round(buyProb * 100);
  const sellPct = 100 - buyPct;
  const signal = resolveSignal(buyProb, buyThreshold, sellThreshold);

  const signalColor =
    signal === 'BUY' ? tdsColors.red500
    : signal === 'SELL' ? tdsColors.blue500
    : tdsDark.textTertiary;

  const signalLabelMap = { BUY: '매수 추천', SELL: '매도 추천', HOLD: '관망' };
  const letter = (result.name || result.ticker)?.[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.singleCard}>
      {/* 종목 정보 */}
      <View style={styles.singleCardHeader}>
        <View style={[styles.letterBadge, { backgroundColor: getLetterBg(result.ticker) }]}>
          <Text style={styles.letterBadgeText}>{letter}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.singleName}>{result.name || result.ticker}</Text>
          {result.name && (
            <Text style={styles.singleTicker}>{result.ticker}</Text>
          )}
        </View>
        <SignalBadge signal={signal} />
      </View>

      {/* 확률 대형 표시 */}
      <View style={styles.probHighlight}>
        <Text style={[styles.probBigNum, { color: signalColor }]}>{buyPct}%</Text>
        <Text style={styles.probBigDesc}>상승 확률</Text>
        <View style={[styles.signalPill, { borderColor: signalColor, backgroundColor: `${signalColor}18` }]}>
          <Text style={[styles.signalPillText, { color: signalColor }]}>
            {signalLabelMap[signal]}
          </Text>
        </View>
      </View>

      {/* 확률 바 */}
      <View style={styles.probBarWrap}>
        <View style={styles.probBarTrack}>
          <View style={[styles.probBarFill, { width: `${buyPct}%` }]} />
        </View>
        <View style={styles.probBarLabels}>
          <Text style={styles.probBuyLabel}>매수 {buyPct}%</Text>
          <Text style={styles.probSellLabel}>매도 {sellPct}%</Text>
        </View>
      </View>
    </View>
  );
}

// ─── 그룹 요약 ────────────────────────────────────────────────────────────────

function GroupSummary({ results, buyThreshold, sellThreshold }) {
  const buy = results.filter(
    (r) => resolveSignal(r.buy_probability ?? 0.5, buyThreshold, sellThreshold) === 'BUY',
  ).length;
  const sell = results.filter(
    (r) => resolveSignal(r.buy_probability ?? 0.5, buyThreshold, sellThreshold) === 'SELL',
  ).length;
  const hold = results.length - buy - sell;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: tdsColors.red500 }]}>{buy}</Text>
        <Text style={styles.summaryLabel}>매수</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: tdsDark.textTertiary }]}>{hold}</Text>
        <Text style={styles.summaryLabel}>관망</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: tdsColors.blue500 }]}>{sell}</Text>
        <Text style={styles.summaryLabel}>매도</Text>
      </View>
    </View>
  );
}

// ─── 그룹 예측 행 ─────────────────────────────────────────────────────────────

function PredictRow({ r, buyThreshold, sellThreshold, isLast }) {
  const displayName = r.name || r.ticker;
  const letter = displayName[0]?.toUpperCase() ?? '?';
  const bg = getLetterBg(displayName);
  const buyProb = r.buy_probability ?? 0.5;
  const buyPct = Math.round(buyProb * 100);
  const sellPct = 100 - buyPct;
  const signal = resolveSignal(buyProb, buyThreshold, sellThreshold);

  return (
    <View style={[styles.predictRow, !isLast && styles.predictRowBorder]}>
      <View style={[styles.letterBadge, { backgroundColor: bg }]}>
        <Text style={styles.letterBadgeText}>{letter}</Text>
      </View>
      <View style={styles.predictInfo}>
        <View style={styles.predictNameRow}>
          <Text style={styles.predictName}>{displayName}</Text>
          {r.name && <Text style={styles.predictCode}>{r.ticker}</Text>}
        </View>
        <View style={styles.probTrack}>
          <View style={[styles.probFillBuy, { width: `${buyPct}%` }]} />
        </View>
        <View style={styles.probLabels}>
          <Text style={styles.probBuyLabel}>매수 {buyPct}%</Text>
          <Text style={styles.probSellLabel}>매도 {sellPct}%</Text>
        </View>
      </View>
      <SignalBadge signal={signal} />
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────

export default function PredictScreen() {
  const router = useRouter();
  const { modelId: paramModelId, modelName } = useLocalSearchParams();

  // 기간
  const [period, setPeriod] = useState(30);

  // 예측 대상
  const [targetMode, setTargetMode] = useState('group'); // 'group' | 'single'
  const [market, setMarket] = useState('kospi');
  const [singleTicker, setSingleTicker] = useState('');

  // 임계값
  const [useThreshold, setUseThreshold] = useState(false);
  const [buyThreshold, setBuyThreshold] = useState(0.60);
  const [sellThreshold, setSellThreshold] = useState(0.40);

  // 결과
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [notice, setNotice] = useState(null);

  // 임계값 미사용 시 기본 50% 기준
  const effectiveBuyThreshold = useThreshold ? buyThreshold : 0.505;
  const effectiveSellThreshold = useThreshold ? sellThreshold : 0.495;

  const isSingle = targetMode === 'single';
  const canRun = !loading && (isSingle ? singleTicker.trim().length > 0 : true);

  const handlePredict = useCallback(async () => {
    if (isSingle && !singleTicker.trim()) return;

    setLoading(true);
    setNotice(null);
    setResults([]);
    setRan(false);

    try {
      let modelId = paramModelId;
      if (!modelId) {
        const { data: models } = await supabase
          .from('ml_models')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1);
        modelId = models?.[0]?.id;
      }
      if (!modelId) throw new Error('학습된 모델이 없습니다.');

      if (isSingle) {
        const ticker = singleTicker.trim().toUpperCase();
        const data = await predictXgb({ modelId, ticker });
        setResults([{ ticker, ...data }]);
      } else {
        const { data: tickerRows } = await supabase
          .from('ticker_group')
          .select('ticker, name')
          .limit(20);

        const tickers = tickerRows ?? [];
        if (tickers.length === 0) throw new Error('티커 목록이 없습니다.');

        const predictions = [];
        for (const { ticker, name } of tickers) {
          try {
            const data = await predictXgb({ modelId, ticker });
            predictions.push({ ticker, name, ...data });
          } catch (_) {}
        }
        if (predictions.length === 0) throw new Error('예측 결과가 없습니다.');
        setResults(predictions);
      }

      setNotice('예측이 완료됐어요.');
    } catch (_) {
      if (!isSingle) {
        const fallback =
          samplePredictionResults[market] ?? samplePredictionResults.kospi;
        setResults(fallback);
        setNotice('샘플 데이터로 보여드리고 있어요.');
      } else {
        setNotice('예측 중 오류가 발생했어요. 티커를 확인해 주세요.');
      }
    } finally {
      setLoading(false);
      setRan(true);
    }
  }, [isSingle, singleTicker, market, period, paramModelId]);

  const thresholdSummary = useThreshold
    ? `매수 ${Math.round(buyThreshold * 100)}% 이상 · 매도 ${Math.round(sellThreshold * 100)}% 미만`
    : '설정하지 않음 (기본 50%)';

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={tdsDark.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>예측</Text>
          {modelName ? (
            <Text style={styles.headerSub} numberOfLines={1}>{modelName}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 알림 배너 */}
        {notice && (
          <View
            style={[
              styles.noticeBanner,
              notice.includes('오류') && styles.noticeBannerError,
            ]}
          >
            <Ionicons
              name={notice.includes('오류') ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={15}
              color={notice.includes('오류') ? tdsColors.red600 : tdsColors.blue700}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.noticeText,
                notice.includes('오류') && styles.noticeTextError,
              ]}
            >
              {notice}
            </Text>
          </View>
        )}

        {/* 기간 */}
        <View style={styles.card}>
          <SectionLabel>기간</SectionLabel>
          <ChipRow
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            disabled={loading}
          />
        </View>

        {/* 예측 대상 */}
        <View style={styles.card}>
          <SectionLabel>예측 대상</SectionLabel>

          {/* 모드 토글 */}
          <View style={styles.modeToggleWrap}>
            <TouchableOpacity
              style={[styles.modeToggleBtn, !isSingle && styles.modeToggleBtnActive]}
              onPress={() => setTargetMode('group')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeToggleText, !isSingle && styles.modeToggleTextActive]}>
                티커 그룹
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleBtn, isSingle && styles.modeToggleBtnActive]}
              onPress={() => setTargetMode('single')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeToggleText, isSingle && styles.modeToggleTextActive]}>
                단일 종목
              </Text>
            </TouchableOpacity>
          </View>

          {isSingle ? (
            <TextInput
              style={styles.tickerInput}
              value={singleTicker}
              onChangeText={setSingleTicker}
              placeholder="티커 입력  (예: AAPL, 005930)"
              placeholderTextColor={tdsDark.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
          ) : (
            <ChipRow
              options={MARKETS}
              value={market}
              onChange={setMarket}
              disabled={loading}
            />
          )}
        </View>

        {/* 임계값 설정 */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.thresholdRow}
            onPress={() => setUseThreshold((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <SectionLabel>임계값 설정</SectionLabel>
              <Text style={styles.thresholdSub}>{thresholdSummary}</Text>
            </View>
            <ToggleSwitch
              value={useThreshold}
              onToggle={() => setUseThreshold((v) => !v)}
            />
          </TouchableOpacity>

          {useThreshold && (
            <View style={styles.thresholdBody}>
              <View style={styles.thresholdDivider} />
              <Text style={styles.thresholdFieldLabel}>매수 조건 (이상)</Text>
              <ChipRow
                options={BUY_THRESHOLDS}
                value={buyThreshold}
                onChange={setBuyThreshold}
                disabled={loading}
              />
              <Text style={[styles.thresholdFieldLabel, { marginTop: 14 }]}>
                매도 조건 (미만)
              </Text>
              <ChipRow
                options={SELL_THRESHOLDS}
                value={sellThreshold}
                onChange={setSellThreshold}
                disabled={loading}
              />
            </View>
          )}
        </View>

        {/* 예측 실행 */}
        <Button
          onPress={handlePredict}
          display="full"
          loading={loading}
          disabled={!canRun}
          style={{ marginBottom: 4 }}
        >
          {ran ? '다시 예측하기' : '예측 실행'}
        </Button>

        {/* 로딩 */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={tdsColors.blue500} />
            <Text style={styles.loadingText}>예측 중이에요...</Text>
          </View>
        )}

        {/* 결과 */}
        {!loading && results.length > 0 && (
          <View style={styles.resultsWrap}>
            {isSingle ? (
              <SingleResultCard
                result={results[0]}
                buyThreshold={effectiveBuyThreshold}
                sellThreshold={effectiveSellThreshold}
              />
            ) : (
              <>
                <GroupSummary
                  results={results}
                  buyThreshold={effectiveBuyThreshold}
                  sellThreshold={effectiveSellThreshold}
                />
                <View style={styles.listCard}>
                  <Text style={styles.listCardTitle}>예측 결과</Text>
                  {results.map((r, i) => (
                    <PredictRow
                      key={r.ticker}
                      r={r}
                      buyThreshold={effectiveBuyThreshold}
                      sellThreshold={effectiveSellThreshold}
                      isLast={i === results.length - 1}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: tdsDark.textPrimary },
  headerSub: { fontSize: 11, color: tdsDark.textTertiary, marginTop: 1 },
  headerRight: { width: 40 },

  // 스크롤 컨텐츠
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },

  // 알림 배너
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: tdsColors.blue50,
    borderRadius: 12,
  },
  noticeBannerError: { backgroundColor: tdsColors.red50 },
  noticeText: { fontSize: 13, color: tdsColors.blue700, flex: 1 },
  noticeTextError: { color: tdsColors.red600 },

  // 카드 (섹션)
  card: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    padding: 18,
    shadowColor: tdsDark.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // 섹션 레이블
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: tdsDark.textSecondary,
    marginBottom: 12,
  },

  // 칩 셀렉터
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tdsDark.border,
    backgroundColor: tdsDark.bgPrimary,
  },
  chipActive: {
    borderColor: tdsColors.blue500,
    backgroundColor: tdsColors.blue50,
  },
  chipText: { fontSize: 13, color: tdsDark.textSecondary },
  chipTextActive: { color: tdsColors.blue500, fontWeight: '700' },

  // 예측 대상 모드 토글
  modeToggleWrap: {
    flexDirection: 'row',
    backgroundColor: tdsDark.bgPrimary,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeToggleBtnActive: { backgroundColor: tdsColors.blue500 },
  modeToggleText: { fontSize: 13, fontWeight: '500', color: tdsDark.textSecondary },
  modeToggleTextActive: { color: '#fff', fontWeight: '700' },

  // 단일 종목 입력
  tickerInput: {
    borderWidth: 1,
    borderColor: tdsDark.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: tdsDark.textPrimary,
    backgroundColor: tdsDark.bgPrimary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // 임계값 토글 행
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thresholdSub: { fontSize: 12, color: tdsDark.textTertiary, marginTop: 2 },
  thresholdBody: { marginTop: 4 },
  thresholdDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: tdsDark.border,
    marginVertical: 14,
  },
  thresholdFieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: tdsDark.textTertiary,
    marginBottom: 10,
  },

  // 커스텀 토글 스위치
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: tdsDark.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: tdsColors.blue500 },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // 로딩
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: { fontSize: 13, color: tdsDark.textTertiary },

  // 결과 래퍼
  resultsWrap: { gap: 12 },

  // 단일 종목 카드
  singleCard: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    padding: 20,
    shadowColor: tdsDark.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  singleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  singleName: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary },
  singleTicker: { fontSize: 12, color: tdsDark.textTertiary, marginTop: 2 },

  // 확률 대형 표시
  probHighlight: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  probBigNum: { fontSize: 52, fontWeight: '800', letterSpacing: -1.5 },
  probBigDesc: { fontSize: 13, color: tdsDark.textTertiary },
  signalPill: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  signalPillText: { fontSize: 14, fontWeight: '700' },

  // 확률 바 (단일)
  probBarWrap: { marginTop: 16 },
  probBarTrack: {
    height: 6,
    backgroundColor: tdsColors.grey200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  probBarFill: {
    height: '100%',
    backgroundColor: tdsColors.red500,
    borderRadius: 3,
  },
  probBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  probBuyLabel: { fontSize: 12, color: tdsColors.red500, fontWeight: '600' },
  probSellLabel: { fontSize: 12, color: tdsColors.blue500, fontWeight: '600' },

  // 그룹 요약 카드
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    paddingVertical: 18,
    shadowColor: tdsDark.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryCount: { fontSize: 26, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: tdsDark.textTertiary },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: tdsDark.border,
    alignSelf: 'stretch',
    marginVertical: 8,
  },

  // 그룹 목록 카드
  listCard: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 16,
    shadowColor: tdsDark.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  listCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsDark.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  predictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  predictRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  predictInfo: { flex: 1, gap: 5 },
  predictNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  predictName: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
  predictCode: { fontSize: 11, color: tdsDark.textTertiary },
  probTrack: {
    height: 4,
    backgroundColor: tdsColors.grey200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  probFillBuy: { height: '100%', backgroundColor: tdsColors.red500, borderRadius: 2 },
  probLabels: { flexDirection: 'row', justifyContent: 'space-between' },

  // 공통 레터 배지
  letterBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letterBadgeText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
