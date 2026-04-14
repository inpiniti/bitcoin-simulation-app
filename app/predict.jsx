/**
 * 예측 화면 — XGBoost 모델로 시장 예측
 * 모델 탭에서 모델을 선택하면 push (모델은 이미 선택된 상태)
 *
 * 웹 DeepLearningPanel 예측 탭과 동일한 동작:
 *  - 단일 종목 | 티커 그룹 선택
 *  - 전체 과거 내역 예측 (Trend Backtesting) 토글
 *  - 예측 실행 → probability / prediction (1=BUY, 0=SELL) 응답
 *  - 결과: 최신 예측 확률 카드 + 백테스팅 결과 테이블
 *  - AI 최적 범위 자동 추천 + 수동 임계값 조절
 */
import { useState, useCallback, useMemo } from 'react';
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

// 그룹 선택지 (웹과 동일)
const TICKER_GROUPS = [
  { key: 'sp500',         label: 'S&P 500' },
  { key: 'qqq',           label: 'QQQ (나스닥100)' },
  { key: 'superinvestor', label: '슈퍼인베스터' },
  { key: 'kospi',         label: 'KOSPI' },
  { key: 'kosdaq',        label: 'KOSDAQ' },
  { key: 'myholdings',    label: '내 관심 종목' },
];

// 그룹별 하드코딩 티커 (yfinance 호환, 웹 그룹 데이터 기반)
const GROUP_TICKERS = {
  sp500: [
    { ticker: 'AAPL', name: '애플' },
    { ticker: 'MSFT', name: '마이크로소프트' },
    { ticker: 'NVDA', name: '엔비디아' },
    { ticker: 'AMZN', name: '아마존' },
    { ticker: 'GOOGL', name: '알파벳' },
    { ticker: 'META', name: '메타' },
    { ticker: 'TSLA', name: '테슬라' },
    { ticker: 'AVGO', name: '브로드컴' },
    { ticker: 'JPM', name: 'JP모건' },
    { ticker: 'LLY', name: '일라이릴리' },
    { ticker: 'UNH', name: '유나이티드헬스' },
    { ticker: 'V', name: '비자' },
    { ticker: 'XOM', name: '엑슨모빌' },
    { ticker: 'MA', name: '마스터카드' },
    { ticker: 'COST', name: '코스트코' },
    { ticker: 'HD', name: '홈디포' },
    { ticker: 'PG', name: 'P&G' },
    { ticker: 'JNJ', name: '존슨앤존슨' },
    { ticker: 'WMT', name: '월마트' },
    { ticker: 'BAC', name: '뱅크오브아메리카' },
  ],
  qqq: [
    { ticker: 'AAPL', name: '애플' },
    { ticker: 'MSFT', name: '마이크로소프트' },
    { ticker: 'NVDA', name: '엔비디아' },
    { ticker: 'AMZN', name: '아마존' },
    { ticker: 'META', name: '메타' },
    { ticker: 'TSLA', name: '테슬라' },
    { ticker: 'AVGO', name: '브로드컴' },
    { ticker: 'COST', name: '코스트코' },
    { ticker: 'NFLX', name: '넷플릭스' },
    { ticker: 'GOOGL', name: '알파벳' },
    { ticker: 'AMD', name: 'AMD' },
    { ticker: 'ADBE', name: '어도비' },
    { ticker: 'QCOM', name: '퀄컴' },
    { ticker: 'INTC', name: '인텔' },
    { ticker: 'INTU', name: '인튜이트' },
    { ticker: 'AMAT', name: '어플라이드머티리얼즈' },
    { ticker: 'MU', name: '마이크론' },
    { ticker: 'LRCX', name: '램리서치' },
    { ticker: 'PANW', name: '팔로알토' },
    { ticker: 'KLAC', name: 'KLA코퍼레이션' },
  ],
  superinvestor: [
    { ticker: 'AAPL', name: '애플' },
    { ticker: 'BRK-B', name: '버크셔해서웨이' },
    { ticker: 'KO', name: '코카콜라' },
    { ticker: 'AMZN', name: '아마존' },
    { ticker: 'BAC', name: '뱅크오브아메리카' },
    { ticker: 'CVX', name: '셰브런' },
    { ticker: 'OXY', name: '옥시덴탈페트롤리엄' },
    { ticker: 'MCO', name: '무디스' },
    { ticker: 'AXP', name: '아메리칸익스프레스' },
    { ticker: 'HPQ', name: 'HP' },
    { ticker: 'V', name: '비자' },
    { ticker: 'MA', name: '마스터카드' },
    { ticker: 'JNJ', name: '존슨앤존슨' },
    { ticker: 'WFC', name: '웰스파고' },
    { ticker: 'USB', name: 'US뱅코프' },
    { ticker: 'DVA', name: '다비타' },
    { ticker: 'ALLY', name: '알라이파이낸셜' },
    { ticker: 'PARA', name: '파라마운트' },
    { ticker: 'LSXMA', name: '리버티미디어' },
    { ticker: 'GM', name: '제너럴모터스' },
  ],
  kospi: [
    { ticker: '005930.KS', name: '삼성전자' },
    { ticker: '000660.KS', name: 'SK하이닉스' },
    { ticker: '005380.KS', name: '현대차' },
    { ticker: '000270.KS', name: '기아' },
    { ticker: '051910.KS', name: 'LG화학' },
    { ticker: '006400.KS', name: '삼성SDI' },
    { ticker: '035420.KS', name: 'NAVER' },
    { ticker: '035720.KS', name: '카카오' },
    { ticker: '068270.KS', name: '셀트리온' },
    { ticker: '105560.KS', name: 'KB금융' },
    { ticker: '055550.KS', name: '신한지주' },
    { ticker: '003550.KS', name: 'LG' },
    { ticker: '066570.KS', name: 'LG전자' },
    { ticker: '028260.KS', name: '삼성물산' },
    { ticker: '012330.KS', name: '현대모비스' },
  ],
  kosdaq: [
    { ticker: '247540.KQ', name: '에코프로비엠' },
    { ticker: '086520.KQ', name: '에코프로' },
    { ticker: '196170.KQ', name: '알테오젠' },
    { ticker: '091990.KQ', name: '셀트리온헬스케어' },
    { ticker: '263750.KQ', name: '펄어비스' },
    { ticker: '293490.KQ', name: '카카오게임즈' },
    { ticker: '112040.KQ', name: '위메이드' },
    { ticker: '041510.KQ', name: '에스엠' },
    { ticker: '035900.KQ', name: 'JYP Ent' },
    { ticker: '352820.KQ', name: '하이브' },
  ],
};

const BUY_STEPS  = [50, 55, 60, 65, 70, 75, 80];
const SELL_STEPS = [20, 25, 30, 35, 40, 45, 50];

const BADGE_COLORS = [
  '#3182f6', '#f04452', '#03b26c',
  '#fe9800', '#8b5cf6', '#06b6d4',
];

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function resolveSignal(prob, buyThr, sellThr) {
  if (prob * 100 >= buyThr) return 'BUY';
  if (prob * 100 < sellThr) return 'SELL';
  return 'HOLD';
}

function getLetterBg(str) {
  return BADGE_COLORS[(str?.charCodeAt(0) ?? 65) % BADGE_COLORS.length];
}

function fmtPct(v, digits = 1) {
  if (v == null) return '-';
  const s = v.toFixed(digits);
  return v >= 0 ? `+${s}%` : `${s}%`;
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── 공통 서브컴포넌트 ─────────────────────────────────────────────────────────

function SectionLabel({ children, style }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

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

function SignalBadge({ signal }) {
  const colorMap = { BUY: 'red', SELL: 'blue', HOLD: 'grey' };
  return (
    <Badge color={colorMap[signal] ?? 'grey'} size="small" variant="weak">
      {signal}
    </Badge>
  );
}

// 단계 칩 선택기 (숫자 배열)
function StepChips({ steps, value, onChange, disabled, suffix = '%', color }) {
  return (
    <View style={styles.chipRow}>
      {steps.map((s) => {
        const active = s === value;
        return (
          <TouchableOpacity
            key={s}
            onPress={() => !disabled && onChange(s)}
            style={[
              styles.chip,
              active && { borderColor: color, backgroundColor: `${color}18` },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && { color, fontWeight: '700' }]}>
              {s}{suffix}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── 최신 예측 결과 카드 ──────────────────────────────────────────────────────

function LatestResultCard({ result, buyThreshold, sellThreshold }) {
  const prob    = result.probability ?? 0.5;
  const probPct = Math.round(prob * 100);
  const signal  = resolveSignal(prob, buyThreshold, sellThreshold);

  const signalColor = signal === 'BUY' ? tdsColors.red500
    : signal === 'SELL' ? tdsColors.blue500
    : tdsDark.textTertiary;

  const signalLabel = { BUY: '매수 추천', SELL: '매도 / 관망', HOLD: '관망' }[signal];

  return (
    <View style={styles.card}>
      {/* Target Date */}
      {result.date && (
        <View style={styles.targetDateWrap}>
          <Text style={styles.targetDateLabel}>Target Date</Text>
          <Text style={styles.targetDateValue}>{fmtDate(result.date)}의 다음 날</Text>
        </View>
      )}

      {/* 확률 대형 표시 */}
      <View style={styles.probCenter}>
        {/* 원형 게이지 대용 — 반원 바 */}
        <View style={styles.gaugeWrap}>
          <View style={styles.gaugeTrack}>
            <View style={[
              styles.gaugeFill,
              { width: `${probPct}%`, backgroundColor: signalColor },
            ]} />
          </View>
        </View>
        <Text style={[styles.probBigNum, { color: signalColor }]}>{probPct}%</Text>
        <Text style={styles.riseLabel}>RISE PROB.</Text>
        <View style={[styles.signalPill, { borderColor: signalColor, backgroundColor: `${signalColor}18` }]}>
          <Text style={[styles.signalPillText, { color: signalColor }]}>{signalLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── 그룹 요약 ────────────────────────────────────────────────────────────────

function GroupSummary({ results, buyThreshold, sellThreshold }) {
  const buy  = results.filter(r => resolveSignal(r.probability ?? 0.5, buyThreshold, sellThreshold) === 'BUY').length;
  const sell = results.filter(r => resolveSignal(r.probability ?? 0.5, buyThreshold, sellThreshold) === 'SELL').length;
  const hold = results.length - buy - sell;
  return (
    <View style={styles.summaryCard}>
      {[
        { label: '매수', count: buy,  color: tdsColors.red500 },
        { label: '관망', count: hold, color: tdsDark.textTertiary },
        { label: '매도', count: sell, color: tdsColors.blue500 },
      ].map((item, i) => (
        <View key={item.label} style={{ flex: 1, flexDirection: 'row' }}>
          {i > 0 && <View style={styles.summaryDivider} />}
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color: item.color }]}>{item.count}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── 그룹 예측 행 ─────────────────────────────────────────────────────────────

function PredictRow({ r, buyThreshold, sellThreshold, isLast }) {
  const displayName = r.name || r.ticker;
  const prob    = r.probability ?? 0.5;
  const probPct = Math.round(prob * 100);
  const signal  = resolveSignal(prob, buyThreshold, sellThreshold);

  return (
    <View style={[styles.predictRow, !isLast && styles.predictRowBorder]}>
      <View style={[styles.letterBadge, { backgroundColor: getLetterBg(displayName) }]}>
        <Text style={styles.letterBadgeText}>{displayName[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.predictInfo}>
        <View style={styles.predictNameRow}>
          <Text style={styles.predictName}>{displayName}</Text>
          {r.name && <Text style={styles.predictCode}>{r.ticker}</Text>}
        </View>
        <View style={styles.probTrack}>
          <View style={[styles.probFill, { width: `${probPct}%` }]} />
        </View>
        <View style={styles.probLabels}>
          <Text style={styles.probBuyLabel}>매수 {probPct}%</Text>
          <Text style={styles.probSellLabel}>매도 {100 - probPct}%</Text>
        </View>
      </View>
      <SignalBadge signal={signal} />
    </View>
  );
}

// ─── AI 최적 범위 계산 ────────────────────────────────────────────────────────

function useOptimalRange(allResults) {
  return useMemo(() => {
    const valid = allResults.filter(r => r.actual != null);
    if (valid.length < 5) return null;

    let best = null, bestScore = -Infinity;
    for (let bt = 50; bt <= 90; bt += 5) {
      for (let st = 10; st <= 50; st += 5) {
        const buys  = valid.filter(r => r.probability * 100 >= bt);
        const sells = valid.filter(r => r.probability * 100 < st);
        if (!buys.length || !sells.length) continue;
        const buyAvg  = buys.reduce((s, r)  => s + r.actual, 0) / buys.length;
        const sellAvg = sells.reduce((s, r) => s + r.actual, 0) / sells.length;
        const w = Math.log10(Math.min(buys.length, sells.length) + 1);
        const score = (buyAvg - sellAvg) * w;
        if (score > bestScore) {
          bestScore = score;
          best = {
            buyThreshold: bt, sellThreshold: st,
            buyCount: buys.length, buyAvg,
            buySum: buys.reduce((s, r) => s + r.actual, 0),
            sellCount: sells.length, sellAvg,
            sellSum: sells.reduce((s, r) => s + r.actual, 0),
          };
        }
      }
    }
    return best;
  }, [allResults]);
}

// ─── AI 최적 범위 카드 ────────────────────────────────────────────────────────

function OptimalRangeCard({ optimal, onApply }) {
  if (!optimal) return null;
  return (
    <View style={[styles.card, styles.optimalCard]}>
      <View style={styles.optimalHeader}>
        <Ionicons name="flash" size={16} color={tdsColors.orange500} />
        <Text style={styles.optimalTitle}>AI 최적 범위 추천</Text>
      </View>
      <Text style={styles.optimalDesc}>
        백테스팅 데이터를 분석하여 최적의 매수/매도 임계값을 자동 계산합니다.
      </Text>
      <View style={styles.optimalGrid}>
        <View style={[styles.optimalItem, styles.optimalBuy]}>
          <View style={styles.optimalItemHeader}>
            <Ionicons name="trending-up" size={14} color={tdsColors.red500} />
            <Text style={[styles.optimalItemLabel, { color: tdsColors.red500 }]}>매수 범위</Text>
          </View>
          <Text style={[styles.optimalThreshold, { color: tdsColors.red500 }]}>
            {optimal.buyThreshold}% 이상
          </Text>
          <Text style={[styles.optimalAvg, { color: tdsColors.red500 }]}>
            평균: {fmtPct(optimal.buyAvg)}
          </Text>
          <Text style={styles.optimalCount}>
            {optimal.buyCount}건 (합계 {fmtPct(optimal.buySum, 1)})
          </Text>
        </View>
        <View style={[styles.optimalItem, styles.optimalSell]}>
          <View style={styles.optimalItemHeader}>
            <Ionicons name="trending-down" size={14} color={tdsColors.blue500} />
            <Text style={[styles.optimalItemLabel, { color: tdsColors.blue500 }]}>매도 범위</Text>
          </View>
          <Text style={[styles.optimalThreshold, { color: tdsColors.blue500 }]}>
            {optimal.sellThreshold}% 미만
          </Text>
          <Text style={[styles.optimalAvg, { color: tdsColors.blue500 }]}>
            평균: {fmtPct(optimal.sellAvg)}
          </Text>
          <Text style={styles.optimalCount}>
            {optimal.sellCount}건 (합계 {fmtPct(optimal.sellSum, 1)})
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.applyBtn} onPress={onApply} activeOpacity={0.7}>
        <Ionicons name="checkmark-circle-outline" size={15} color={tdsColors.orange500} />
        <Text style={styles.applyBtnText}>최적값 적용하기</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 수동 임계값 조절 카드 ────────────────────────────────────────────────────

function ThresholdCard({
  buyThreshold, setBuyThreshold,
  sellThreshold, setSellThreshold,
  currentStats,
  disabled,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.thresholdCardHeader}>
        <Ionicons name="options-outline" size={16} color={tdsDark.textSecondary} />
        <Text style={styles.thresholdCardTitle}>수동 범위 조절</Text>
      </View>
      <Text style={styles.optimalDesc}>슬라이더 대신 단계 선택으로 매수/매도 임계값을 조정하세요.</Text>

      <View style={styles.thresholdSection}>
        <View style={styles.thresholdLabelRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="trending-up" size={13} color={tdsColors.red500} />
            <Text style={styles.thresholdFieldLabel}>매수 범위</Text>
          </View>
          <Text style={[styles.thresholdValue, { color: tdsColors.red500 }]}>
            {buyThreshold}% 이상
          </Text>
        </View>
        <StepChips
          steps={BUY_STEPS}
          value={buyThreshold}
          onChange={setBuyThreshold}
          disabled={disabled}
          color={tdsColors.red500}
        />
      </View>

      <View style={[styles.thresholdSection, { marginTop: 16 }]}>
        <View style={styles.thresholdLabelRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="trending-down" size={13} color={tdsColors.blue500} />
            <Text style={styles.thresholdFieldLabel}>매도 범위</Text>
          </View>
          <Text style={[styles.thresholdValue, { color: tdsColors.blue500 }]}>
            {sellThreshold}% 미만
          </Text>
        </View>
        <StepChips
          steps={SELL_STEPS}
          value={sellThreshold}
          onChange={setSellThreshold}
          disabled={disabled}
          color={tdsColors.blue500}
        />
      </View>

      {currentStats && (
        <View style={styles.currentStatsRow}>
          <View style={[styles.statBox, { backgroundColor: `${tdsColors.red500}12` }]}>
            <Text style={styles.statBoxLabel}>매수 시 평균</Text>
            <Text style={[styles.statBoxValue, {
              color: currentStats.buyAvg >= 0 ? tdsColors.red500 : tdsColors.blue500,
            }]}>
              {fmtPct(currentStats.buyAvg)}
            </Text>
            <Text style={styles.statBoxSub}>{currentStats.buyCount}건 (합 {fmtPct(currentStats.buySum, 0)})</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: `${tdsColors.blue500}12` }]}>
            <Text style={styles.statBoxLabel}>매도 시 평균</Text>
            <Text style={[styles.statBoxValue, {
              color: currentStats.sellAvg >= 0 ? tdsColors.red500 : tdsColors.blue500,
            }]}>
              {fmtPct(currentStats.sellAvg)}
            </Text>
            <Text style={styles.statBoxSub}>{currentStats.sellCount}건 (합 {fmtPct(currentStats.sellSum, 0)})</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── 백테스팅 결과 테이블 ─────────────────────────────────────────────────────

function BacktestTable({ results }) {
  const shown = results.slice(0, 200);
  return (
    <View style={styles.card}>
      <Text style={styles.backtestTitle}>
        백테스팅 결과 ({results.length.toLocaleString()}건)
      </Text>
      <Text style={styles.backtestDesc}>
        과거 데이터에 대한 예측 결과와 실제 변동률을 비교합니다.
      </Text>

      {/* 헤더 */}
      <View style={styles.tableHeader}>
        <Text style={[styles.thCell, { flex: 2 }]}>날짜</Text>
        <Text style={[styles.thCell, { flex: 1.2 }]}>연속일</Text>
        <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>30일%</Text>
        <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>1일%</Text>
        <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>예측</Text>
        <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>실제</Text>
        <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>적중</Text>
      </View>

      {shown.map((r, i) => {
        const isHit = r.actual != null && (
          (r.prediction === 1 && r.actual >= 2) ||
          (r.prediction === 0 && r.actual < 2)
        );
        const probPct = Math.round((r.probability ?? 0) * 100);
        return (
          <View
            key={i}
            style={[styles.tableRow, i < shown.length - 1 && styles.tableRowBorder]}
          >
            <Text style={[styles.tdCell, { flex: 2, color: tdsDark.textPrimary }]}>
              {fmtDate(r.date)}
            </Text>
            <Text style={[
              styles.tdCell, { flex: 1.2 },
              r.consecutiveDays > 0 ? styles.tdUp : r.consecutiveDays < 0 ? styles.tdDown : null,
            ]}>
              {r.consecutiveDays ?? 0}
            </Text>
            <Text style={[
              styles.tdCell, { flex: 1.5, textAlign: 'right' },
              r.change30d >= 0 ? styles.tdUp : styles.tdDown,
            ]}>
              {r.change30d != null ? `${r.change30d.toFixed(1)}%` : '-'}
            </Text>
            <Text style={[
              styles.tdCell, { flex: 1.5, textAlign: 'right' },
              r.change1d >= 0 ? styles.tdUp : styles.tdDown,
            ]}>
              {r.change1d != null ? `${r.change1d.toFixed(1)}%` : '-'}
            </Text>
            <Text style={[
              styles.tdCell, { flex: 1.5, textAlign: 'right', fontWeight: '700' },
              r.probability >= 0.5 ? styles.tdUp : styles.tdDown,
            ]}>
              {probPct}%
            </Text>
            <Text style={[
              styles.tdCell, { flex: 1.5, textAlign: 'right', fontWeight: '700' },
              r.actual == null ? { color: tdsDark.textTertiary }
                : r.actual >= 2 ? styles.tdUp : styles.tdDown,
            ]}>
              {r.actual != null ? fmtPct(r.actual) : '-'}
            </Text>
            <Text style={[styles.tdCell, { flex: 0.8, textAlign: 'center' }]}>
              {r.actual != null
                ? (isHit
                    ? <Text style={styles.hitMark}>✓</Text>
                    : <Text style={styles.missMark}>✗</Text>)
                : <Text style={{ color: tdsDark.textTertiary }}>-</Text>}
            </Text>
          </View>
        );
      })}

      {results.length > 200 && (
        <Text style={styles.tableFootnote}>
          상위 200건만 표시됩니다. (총 {results.length.toLocaleString()}건)
        </Text>
      )}
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────

export default function PredictScreen() {
  const router = useRouter();
  const { modelId: paramModelId, modelName } = useLocalSearchParams();

  // 설정
  const [targetMode, setTargetMode]   = useState('single'); // 'single' | 'group'
  const [singleTicker, setSingleTicker] = useState('');
  const [groupKey, setGroupKey]       = useState('sp500');
  const [predAllTime, setPredAllTime] = useState(false); // 전체 과거 내역

  // 임계값
  const [buyThreshold, setBuyThreshold]   = useState(60);
  const [sellThreshold, setSellThreshold] = useState(40);

  // 결과
  const [predResult, setPredResult]       = useState(null);   // 최신 단일 결과
  const [allPredResults, setAllPredResults] = useState([]);   // 백테스팅 전체
  const [groupResults, setGroupResults]   = useState([]);     // 그룹 예측 목록
  const [loading, setLoading]             = useState(false);
  const [ran, setRan]                     = useState(false);
  const [notice, setNotice]               = useState(null);

  const isSingle  = targetMode === 'single';
  const hasResults = isSingle ? predResult != null : groupResults.length > 0;

  // AI 최적 범위 자동 계산 (웹 동일 로직)
  const optimalRange = useOptimalRange(allPredResults);

  // 현재 임계값에 따른 통계
  const currentRangeStats = useMemo(() => {
    const valid = allPredResults.filter(r => r.actual != null);
    if (!valid.length) return null;
    const buys  = valid.filter(r => r.probability * 100 >= buyThreshold);
    const sells = valid.filter(r => r.probability * 100 < sellThreshold);
    const sum = (arr) => arr.reduce((s, r) => s + r.actual, 0);
    return {
      buyCount: buys.length,
      buySum:   sum(buys),
      buyAvg:   buys.length ? sum(buys) / buys.length : 0,
      sellCount: sells.length,
      sellSum:   sum(sells),
      sellAvg:   sells.length ? sum(sells) / sells.length : 0,
    };
  }, [allPredResults, buyThreshold, sellThreshold]);

  // 모델 ID 확보
  const resolveModelId = useCallback(async () => {
    if (paramModelId) return paramModelId;
    const { data } = await supabase
      .from('ml_models')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);
    return data?.[0]?.id ?? null;
  }, [paramModelId]);

  // 그룹 tickers 로드 — myholdings만 Supabase, 나머지는 하드코딩
  const loadGroupTickers = useCallback(async (key) => {
    if (key === 'myholdings') {
      const { data } = await supabase
        .from('ticker_group')
        .select('ticker, name')
        .limit(30);
      return data ?? [];
    }
    return GROUP_TICKERS[key] ?? [];
  }, []);

  const handlePredict = useCallback(async () => {
    if (isSingle && !singleTicker.trim()) return;

    setLoading(true);
    setNotice(null);
    setPredResult(null);
    setAllPredResults([]);
    setGroupResults([]);
    setRan(false);

    try {
      const modelId = await resolveModelId();
      if (!modelId) throw new Error('학습된 모델이 없습니다.');

      // 데이터 기간: 전체 내역이면 2년치, 아니면 최신만 60일
      const days = predAllTime ? 730 : 60;

      if (isSingle) {
        // ── 단일 종목 ──────────────────────────────────────────────────────────
        const ticker = singleTicker.trim().toUpperCase();
        const data   = await predictXgb({ modelId, ticker, days });
        // data = { predictions: [{ probability, prediction, date, consecutiveDays, change1d, change7d, change30d, actual? }] }
        const preds  = data.predictions ?? [];
        if (!preds.length) throw new Error('예측 결과가 없습니다.');

        // 최신 예측 = 마지막 항목 (백엔드는 날짜순 정렬)
        const latest = preds[preds.length - 1];
        setPredResult({ ticker, ...latest });

        // 전체 내역 모드일 때 백테스팅 저장 (확률 높은 순 정렬)
        if (predAllTime) {
          const sorted = [...preds].sort((a, b) => b.probability - a.probability);
          setAllPredResults(sorted.map(p => ({ ticker, ...p })));
        }
        setNotice('예측이 완료됐어요.');

      } else {
        // ── 그룹 ──────────────────────────────────────────────────────────────
        const tickers = await loadGroupTickers(groupKey);
        if (!tickers.length) throw new Error('티커 목록이 없습니다.');

        const results = [];
        const allPreds = []; // 백테스팅용 전체 예측 누적
        for (const { ticker, name } of tickers) {
          try {
            const data  = await predictXgb({ modelId, ticker, days });
            const preds = data.predictions ?? [];
            if (!preds.length) continue;
            const latest = preds[preds.length - 1];
            // actual 포함 — 실제/적중 컬럼에 표시
            results.push({ ticker, name, probability: latest.probability, prediction: latest.prediction, date: latest.date, actual: latest.actual ?? null });
            // predAllTime 체크 시 전체 내역도 누적
            if (predAllTime) {
              preds.forEach(p => allPreds.push({ ticker, name, ...p }));
            }
          } catch (_) {}
        }

        if (!results.length) throw new Error('예측 결과가 없습니다.');
        results.sort((a, b) => b.probability - a.probability);
        setGroupResults(results);

        if (predAllTime && allPreds.length) {
          const sorted = [...allPreds].sort((a, b) => b.probability - a.probability);
          setAllPredResults(sorted);
        }

        setNotice(`${results.length}개 종목 예측이 완료됐어요.${predAllTime ? ` (백테스팅 ${allPreds.length}건)` : ''}`);
      }

    } catch (e) {
      // 샘플 폴백
      if (!isSingle) {
        const fallback = samplePredictionResults.nasdaq;
        // sampleData 필드 매핑: buy_probability → probability
        const mapped = fallback.map(r => ({
          ...r,
          probability: r.buy_probability ?? 0.5,
          prediction: (r.buy_probability ?? 0.5) >= 0.5 ? 1 : 0,
        }));
        setGroupResults(mapped);
        setNotice('샘플 데이터로 보여드리고 있어요. (' + e.message + ')');
      } else {
        setNotice('예측 중 오류가 발생했어요: ' + e.message);
      }
    } finally {
      setLoading(false);
      setRan(true);
    }
  }, [isSingle, singleTicker, groupKey, predAllTime, resolveModelId, loadGroupTickers]);

  const canRun = !loading && (isSingle ? singleTicker.trim().length > 0 : true);

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={tdsDark.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>예측</Text>
          {modelName && <Text style={styles.headerSub} numberOfLines={1}>{modelName}</Text>}
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 알림 배너 ─────────────────────────────────────────────────── */}
        {notice && (
          <View style={[
            styles.noticeBanner,
            (notice.includes('오류') || notice.includes('실패')) && styles.noticeBannerError,
          ]}>
            <Ionicons
              name={notice.includes('오류') || notice.includes('실패') ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={14}
              color={notice.includes('오류') || notice.includes('실패') ? tdsColors.red600 : tdsColors.blue700}
              style={{ marginRight: 6 }}
            />
            <Text style={[
              styles.noticeText,
              (notice.includes('오류') || notice.includes('실패')) && styles.noticeTextError,
            ]} numberOfLines={2}>
              {notice}
            </Text>
          </View>
        )}

        {/* ── 설정 카드 ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>예측 설정</Text>
          <Text style={styles.cardDesc}>학습된 모델을 사용하여 미래 주가를 예측합니다.</Text>

          {/* 단일 / 그룹 탭 */}
          <View style={styles.modeTab}>
            {[
              { key: 'single', label: '단일 종목' },
              { key: 'group',  label: '티커 그룹' },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.modeTabBtn, targetMode === key && styles.modeTabBtnActive]}
                onPress={() => setTargetMode(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeTabText, targetMode === key && styles.modeTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 입력 영역 */}
          {isSingle ? (
            <>
              <SectionLabel>예측할 티커</SectionLabel>
              <TextInput
                style={styles.tickerInput}
                value={singleTicker}
                onChangeText={setSingleTicker}
                placeholder="BTC-USD, AAPL, 005930 ..."
                placeholderTextColor={tdsDark.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
              />
            </>
          ) : (
            <>
              <SectionLabel>대상 그룹 선택</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.groupChipRow}>
                  {TICKER_GROUPS.map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.chip, groupKey === key && styles.chipActive]}
                      onPress={() => setGroupKey(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, groupKey === key && styles.chipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* 전체 과거 내역 예측 */}
          <View style={styles.backtestToggleRow}>
            <TouchableOpacity
              style={styles.backtestToggleContent}
              onPress={() => setPredAllTime(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, predAllTime && styles.checkboxChecked]}>
                {predAllTime && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.backtestToggleText}>전체 과거 내역 예측 (Trend Backtesting)</Text>
            </TouchableOpacity>
            <Text style={styles.backtestToggleDesc}>
              체크 시 과거 모든 데이터에 대해 예측을 수행합니다.{!isSingle ? ' (종목 수만큼 시간이 소요됩니다)' : ' (시간이 더 소요될 수 있습니다)'}
            </Text>
          </View>

          {/* 예측 실행 버튼 */}
          <Button
            onPress={handlePredict}
            display="full"
            loading={loading}
            disabled={!canRun}
            style={{ marginTop: 20 }}
          >
            {loading ? 'AI 예측 분석 중...' : ran ? '다시 예측하기' : '예측 실행'}
          </Button>
        </View>

        {/* ── 로딩 ─────────────────────────────────────────────────────── */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={tdsColors.blue500} size="large" />
            <Text style={styles.loadingText}>백엔드 AI 엔진에서 분석 중...</Text>
          </View>
        )}

        {/* ── 결과 ─────────────────────────────────────────────────────── */}
        {!loading && hasResults && (
          <>
            {isSingle ? (
              <LatestResultCard
                result={predResult}
                buyThreshold={buyThreshold}
                sellThreshold={sellThreshold}
              />
            ) : (
              <>
                <GroupSummary
                  results={groupResults}
                  buyThreshold={buyThreshold}
                  sellThreshold={sellThreshold}
                />
                <View style={styles.card}>
                  <Text style={styles.listCardTitle}>예측 결과</Text>
                  {groupResults.map((r, i) => (
                    <PredictRow
                      key={r.ticker}
                      r={r}
                      buyThreshold={buyThreshold}
                      sellThreshold={sellThreshold}
                      isLast={i === groupResults.length - 1}
                    />
                  ))}
                </View>
              </>
            )}

            {/* 임계값 조정 섹션 (백테스팅 결과가 있을 때) */}
            {allPredResults.length > 1 && (
              <>
                <OptimalRangeCard
                  optimal={optimalRange}
                  onApply={() => {
                    if (optimalRange) {
                      setBuyThreshold(optimalRange.buyThreshold);
                      setSellThreshold(optimalRange.sellThreshold);
                    }
                  }}
                />
                <ThresholdCard
                  buyThreshold={buyThreshold}
                  setBuyThreshold={setBuyThreshold}
                  sellThreshold={sellThreshold}
                  setSellThreshold={setSellThreshold}
                  currentStats={currentRangeStats}
                  disabled={loading}
                />
                <BacktestTable results={allPredResults} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },

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

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },

  // 알림 배너
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tdsColors.blue50,
    borderRadius: 12,
  },
  noticeBannerError: { backgroundColor: tdsColors.red50 },
  noticeText: { fontSize: 12, color: tdsColors.blue700, flex: 1 },
  noticeTextError: { color: tdsColors.red600 },

  // 카드
  card: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    padding: 20,
    shadowColor: tdsDark.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: tdsDark.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: tdsDark.textTertiary, marginBottom: 16 },

  // 섹션 레이블
  sectionLabel: { fontSize: 11, color: tdsDark.textTertiary, fontWeight: '500', marginBottom: 8 },

  // 모드 탭
  modeTab: {
    flexDirection: 'row',
    backgroundColor: tdsDark.bgPrimary,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  modeTabBtn: {
    flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8,
  },
  modeTabBtnActive: { backgroundColor: tdsColors.blue500 },
  modeTabText: { fontSize: 14, fontWeight: '500', color: tdsDark.textSecondary },
  modeTabTextActive: { color: '#fff', fontWeight: '700' },

  // 티커 입력
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

  // 그룹 칩
  groupChipRow: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tdsDark.border,
    backgroundColor: tdsDark.bgPrimary,
  },
  chipActive: { borderColor: tdsColors.blue500, backgroundColor: tdsColors.blue50 },
  chipText: { fontSize: 13, color: tdsDark.textSecondary },
  chipTextActive: { color: tdsColors.blue500, fontWeight: '700' },

  // 백테스팅 토글
  backtestToggleRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tdsDark.border,
  },
  backtestToggleContent: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: tdsDark.border,
    backgroundColor: tdsDark.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: tdsColors.blue500, borderColor: tdsColors.blue500 },
  backtestToggleText: { fontSize: 14, color: tdsDark.textPrimary },
  backtestToggleDesc: { fontSize: 11, color: tdsDark.textTertiary, paddingLeft: 26 },

  // 로딩
  loadingBox: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  loadingText: { fontSize: 13, color: tdsDark.textTertiary },

  // 최신 예측 카드
  targetDateWrap: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: tdsDark.bgPrimary,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  targetDateLabel: { fontSize: 11, color: tdsDark.textTertiary },
  targetDateValue: { fontSize: 14, fontWeight: '700', color: tdsColors.blue600 },

  gaugeWrap: { width: '100%', marginBottom: 12 },
  gaugeTrack: {
    height: 8,
    backgroundColor: tdsColors.grey200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: { height: '100%', borderRadius: 4 },

  probCenter: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  probBigNum: { fontSize: 60, fontWeight: '900', letterSpacing: -2 },
  riseLabel: { fontSize: 11, color: tdsDark.textTertiary, letterSpacing: 2 },
  signalPill: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  signalPillText: { fontSize: 15, fontWeight: '700' },

  // 그룹 요약
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    paddingVertical: 20,
    shadowColor: tdsDark.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryCount: { fontSize: 28, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: tdsDark.textTertiary },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: tdsDark.border,
    marginVertical: 6,
  },

  // 예측 행
  listCardTitle: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary, marginBottom: 8 },
  predictRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, gap: 12,
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
    height: 4, backgroundColor: tdsColors.grey200,
    borderRadius: 2, overflow: 'hidden',
  },
  probFill: { height: '100%', backgroundColor: tdsColors.red500, borderRadius: 2 },
  probLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  probBuyLabel: { fontSize: 11, color: tdsColors.red500, fontWeight: '600' },
  probSellLabel: { fontSize: 11, color: tdsColors.blue500, fontWeight: '600' },

  // 레터 배지
  letterBadge: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  letterBadgeText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // AI 최적 범위
  optimalCard: { borderLeftWidth: 3, borderLeftColor: tdsColors.orange500 },
  optimalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  optimalTitle: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary },
  optimalDesc: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 14 },
  optimalGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  optimalItem: { flex: 1, borderRadius: 12, padding: 14, gap: 4 },
  optimalBuy: { backgroundColor: `${tdsColors.red500}12`, borderWidth: 1, borderColor: `${tdsColors.red500}30` },
  optimalSell: { backgroundColor: `${tdsColors.blue500}12`, borderWidth: 1, borderColor: `${tdsColors.blue500}30` },
  optimalItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  optimalItemLabel: { fontSize: 11, fontWeight: '600' },
  optimalThreshold: { fontSize: 20, fontWeight: '800' },
  optimalAvg: { fontSize: 16, fontWeight: '700' },
  optimalCount: { fontSize: 11, color: tdsDark.textTertiary },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
    borderWidth: 1, borderColor: `${tdsColors.orange500}60`,
    borderRadius: 10, backgroundColor: `${tdsColors.orange500}10`,
  },
  applyBtnText: { fontSize: 13, fontWeight: '600', color: tdsColors.orange500 },

  // 수동 임계값
  thresholdCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  thresholdCardTitle: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary },
  thresholdSection: {},
  thresholdLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  thresholdFieldLabel: { fontSize: 13, color: tdsDark.textSecondary },
  thresholdValue: { fontSize: 13, fontWeight: '700' },
  currentStatsRow: { flexDirection: 'row', gap: 10, marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tdsDark.border },
  statBox: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  statBoxLabel: { fontSize: 11, color: tdsDark.textTertiary },
  statBoxValue: { fontSize: 20, fontWeight: '800' },
  statBoxSub: { fontSize: 10, color: tdsDark.textTertiary, textAlign: 'center' },

  // 토글 스위치
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: tdsDark.border, justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: tdsColors.blue500 },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2, alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // 백테스팅 테이블
  backtestTitle: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary, marginBottom: 4 },
  backtestDesc: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 14 },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: tdsDark.bgPrimary,
    borderRadius: 8,
    marginBottom: 4,
  },
  thCell: { fontSize: 10, color: tdsDark.textTertiary, fontWeight: '600' },
  tableRow: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 4 },
  tableRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tdsDark.border },
  tdCell: { fontSize: 11, color: tdsDark.textSecondary },
  tdUp: { color: tdsColors.red500 },
  tdDown: { color: tdsColors.blue500 },
  hitMark: { color: tdsColors.red500, fontWeight: '700' },
  missMark: { color: tdsColors.blue500 },
  tableFootnote: { fontSize: 11, color: tdsDark.textTertiary, textAlign: 'center', marginTop: 10 },
});
