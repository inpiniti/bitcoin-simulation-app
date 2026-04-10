/**
 * 예측 화면 — XGBoost 모델로 시장 예측
 * 모델 목록에서 모델을 탭하면 스택으로 push
 * 탭바 없음, 상단 뒤로가기 버튼
 */
import { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../constants/tdsColors';
import { Button } from '../components/tds/Button';
import { Badge } from '../components/tds/Badge';
import { supabase } from '../lib/supabaseClient';
import { XGB_PREDICT_URL } from '../lib/xgbApi';
import { samplePredictionResults } from '../lib/sampleData';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const MARKETS = [
  { key: 'kospi', label: 'KOSPI' },
  { key: 'kosdaq', label: 'KOSDAQ' },
  { key: 'nasdaq', label: 'NASDAQ' },
  { key: 'nyse', label: 'NYSE' },
];

const PERIODS = [
  { key: 7, label: '7일' },
  { key: 14, label: '14일' },
  { key: 30, label: '30일' },
  { key: 60, label: '60일' },
];

const BADGE_COLORS = [
  '#3182f6',
  '#f04452',
  '#03b26c',
  '#fe9800',
  '#8b5cf6',
  '#06b6d4',
];

// ─── 셀렉터 ────────────────────────────────────────────────────────────────────

function ChipSelector({ options, value, onChange, disabled }) {
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

// ─── 신호 배지 ────────────────────────────────────────────────────────────────

function SignalBadge({ signal }) {
  const map = { BUY: 'red', SELL: 'blue', HOLD: 'grey' };
  return (
    <Badge color={map[signal] ?? 'grey'} size="small" variant="weak">
      {signal}
    </Badge>
  );
}

// ─── 예측 행 ─────────────────────────────────────────────────────────────────

function PredictRow({ r }) {
  const displayName = r.name || r.ticker;
  const letter = displayName[0]?.toUpperCase() || '?';
  const bg = BADGE_COLORS[displayName.charCodeAt(0) % BADGE_COLORS.length];
  const buyPct =
    r.buy_probability != null ? Math.round(r.buy_probability * 100) : 50;
  const sellPct = 100 - buyPct;
  return (
    <View style={styles.predictRow}>
      <View style={[styles.predictBadge, { backgroundColor: bg }]}>
        <Text style={styles.predictBadgeText}>{letter}</Text>
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
      <SignalBadge signal={r.signal ?? 'HOLD'} />
    </View>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function PredictScreen() {
  const router = useRouter();
  const { modelId: paramModelId, modelName } = useLocalSearchParams();

  const [market, setMarket] = useState('kospi');
  const [period, setPeriod] = useState(30);
  const [results, setResults] = useState(samplePredictionResults.kospi);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!loading) {
      setResults(
        samplePredictionResults[market] ?? samplePredictionResults.kospi,
      );
    }
  }, [market]);

  const handlePredict = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    setResults([]);

    try {
      // 파라미터로 받은 모델 ID 사용, 없으면 최신 모델 조회
      let modelId = paramModelId;
      if (!modelId) {
        const { data: models } = await supabase
          .from('ml_models')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1);
        modelId = models?.[0]?.id;
      }

      if (!modelId)
        throw new Error('학습된 모델이 없습니다. 먼저 모델 탭에서 학습을 실행하세요.');

      const { data: tickerRows } = await supabase
        .from('ticker_group')
        .select('ticker, name')
        .limit(10);

      const tickers = tickerRows || [];
      if (tickers.length === 0) throw new Error('티커 목록이 없습니다.');

      const predictions = [];
      for (const { ticker, name } of tickers) {
        try {
          const res = await fetch(XGB_PREDICT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelId, ticker, days: period * 30 }),
          });
          if (res.ok) {
            const data = await res.json();
            predictions.push({ ticker, name, ...data });
          }
        } catch (_) {}
      }

      if (predictions.length === 0) throw new Error('예측 결과가 없습니다.');
      setResults(predictions);
      setNotice('실시간 예측 결과를 불러왔어요.');
    } catch (e) {
      setResults(
        samplePredictionResults[market] ?? samplePredictionResults.kospi,
      );
      setNotice('예측 연결 전이라서 샘플 결과로 먼저 보여주고 있어요.');
    } finally {
      setLoading(false);
    }
  }, [market, period, paramModelId]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* 상단 헤더 */}
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
            <Text style={styles.headerSub}>{modelName}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {notice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        <Text style={styles.fieldLabel}>시장</Text>
        <ChipSelector
          options={MARKETS}
          value={market}
          onChange={setMarket}
          disabled={loading}
        />

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>기간</Text>
        <ChipSelector
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          disabled={loading}
        />

        <Button
          onPress={handlePredict}
          display="full"
          loading={loading}
          style={{ marginTop: 24 }}
        >
          {results.length > 0 ? '다시 예측하기' : '예측하기'}
        </Button>

        {results.length > 0 && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>예측 결과</Text>
            {results.map((r) => (
              <PredictRow key={r.ticker} r={r} />
            ))}
          </View>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: tdsDark.textTertiary,
    marginTop: 2,
  },
  headerRight: { width: 40 },

  content: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16 },

  noticeBox: {
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tdsColors.blue50,
    borderRadius: 16,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: tdsColors.blue700 },

  fieldLabel: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 8 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tdsDark.border,
    backgroundColor: tdsDark.bgCard,
  },
  chipActive: {
    borderColor: tdsColors.blue500,
    backgroundColor: `${tdsColors.blue500}22`,
  },
  chipText: { fontSize: 14, color: tdsDark.textSecondary },
  chipTextActive: { color: tdsColors.blue500, fontWeight: '600' },

  resultCard: {
    marginTop: 20,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsDark.textPrimary,
    marginBottom: 12,
  },

  predictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
    gap: 12,
  },
  predictBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  predictBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  predictInfo: { flex: 1, gap: 6 },
  predictNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  predictName: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
  predictCode: { fontSize: 11, color: tdsDark.textTertiary },
  probTrack: {
    height: 5,
    backgroundColor: tdsColors.grey200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  probFillBuy: {
    height: '100%',
    backgroundColor: tdsColors.red500,
    borderRadius: 3,
  },
  probLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  probBuyLabel: { fontSize: 11, color: tdsColors.red500, fontWeight: '600' },
  probSellLabel: { fontSize: 11, color: tdsColors.blue500, fontWeight: '600' },
});
