/**
 * 모델 탭 — XGBoost 예측 / 학습
 * 예측: 시장 + 기간 선택 → 배치 예측 결과 테이블
 * 학습: 시장 + 기간 선택 → WebSocket 진행률 + 로그
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { SegmentControl } from '../../components/tds/SegmentControl';
import { Button } from '../../components/tds/Button';
import { Badge } from '../../components/tds/Badge';
import { supabase } from '../../lib/supabaseClient';
import { XGB_PREDICT_URL, WS_TRAIN_URL } from '../../lib/xgbApi';
import { samplePredictionResults, sampleTrainingTimeline } from '../../lib/sampleData';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const MARKETS = [
  { key: 'kospi',   label: 'KOSPI' },
  { key: 'kosdaq',  label: 'KOSDAQ' },
  { key: 'nasdaq',  label: 'NASDAQ' },
  { key: 'nyse',    label: 'NYSE' },
];

const PERIODS = [
  { key: 7,   label: '7일' },
  { key: 14,  label: '14일' },
  { key: 30,  label: '30일' },
  { key: 60,  label: '60일' },
];

const TABS = [
  { key: 'predict', label: '예측' },
  { key: 'train',   label: '학습' },
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
  const map = { BUY: 'red', SELL: 'green', HOLD: 'orange' };
  return (
    <Badge color={map[signal] ?? 'orange'} size="small" variant="weak">
      {signal}
    </Badge>
  );
}

// ─── 예측 서브탭 ──────────────────────────────────────────────────────────────

function PredictTab() {
  const [market, setMarket] = useState('kospi');
  const [period, setPeriod] = useState(30);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('예측 전에도 화면을 미리 볼 수 있게 샘플 결과를 준비해뒀어요.');

  const handlePredict = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    setResults([]);

    try {
      // Supabase에서 해당 마켓 모델 가져오기
      const { data: models } = await supabase
        .from('ml_models')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(1);

      const modelId = models?.[0]?.id;
      if (!modelId) throw new Error('학습된 모델이 없습니다. 먼저 학습을 실행하세요.');

      // Supabase ticker_group에서 종목 목록 (최대 10개)
      const { data: tickerRows } = await supabase
        .from('ticker_group')
        .select('ticker, name')
        .limit(10);

      const tickers = tickerRows || [];
      if (tickers.length === 0) throw new Error('티커 목록이 없습니다. Supabase ticker_group 테이블을 확인하세요.');

      // 순차 예측
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
        } catch (_) {
          // 개별 종목 실패 시 건너뜀
        }
      }

      if (predictions.length === 0) throw new Error('예측 결과가 없습니다.');
      setResults(predictions);
      setNotice('실시간 예측 결과를 불러왔어요.');
    } catch (e) {
      setResults(samplePredictionResults[market] ?? samplePredictionResults.kospi);
      setNotice('예측 연결 전이라서 샘플 결과로 먼저 보여주고 있어요.');
    } finally {
      setLoading(false);
    }
  }, [market, period]);

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {notice && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}
      <Text style={styles.fieldLabel}>시장</Text>
      <ChipSelector options={MARKETS} value={market} onChange={setMarket} disabled={loading} />

      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>기간</Text>
      <ChipSelector options={PERIODS} value={period} onChange={setPeriod} disabled={loading} />

      <Button
        onPress={handlePredict}
        display="full"
        loading={loading}
        style={{ marginTop: 24 }}
      >
        예측하기
      </Button>

      {results.length > 0 && (
        <View style={styles.resultCard}>
          {/* 헤더 */}
          <View style={[styles.resultRow, styles.resultHeader]}>
            <Text style={[styles.cell, styles.cellTicker, styles.headerText]}>티커</Text>
            <Text style={[styles.cell, styles.cellSignal, styles.headerText]}>신호</Text>
            <Text style={[styles.cell, styles.cellProb, styles.headerText]}>매수</Text>
            <Text style={[styles.cell, styles.cellProb, styles.headerText]}>매도</Text>
          </View>
          {results.map((r) => (
            <View key={r.ticker} style={styles.resultRow}>
              <Text style={[styles.cell, styles.cellTicker, styles.rowText]}>{r.ticker}</Text>
              <View style={[styles.cell, styles.cellSignal]}>
                <SignalBadge signal={r.signal ?? 'HOLD'} />
              </View>
              <Text style={[styles.cell, styles.cellProb, styles.rowText]}>
                {r.buy_probability != null ? (r.buy_probability * 100).toFixed(0) + '%' : '-'}
              </Text>
              <Text style={[styles.cell, styles.cellProb, styles.rowText]}>
                {r.sell_probability != null ? (r.sell_probability * 100).toFixed(0) + '%' : '-'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── 학습 서브탭 ──────────────────────────────────────────────────────────────

function TrainTab() {
  const [market, setMarket] = useState('kospi');
  const [period, setPeriod] = useState(30);
  const [isTraining, setIsTraining] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const [trainProgress, setTrainProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState('학습 흐름도 샘플 로그로 먼저 볼 수 있어요.');
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startSampleTraining = useCallback(() => {
    stopTimer();
    setNotice('학습 서버 연결 전이라서 샘플 학습 로그를 보여주고 있어요.');
    let index = 0;
    timerRef.current = setInterval(() => {
      const step = sampleTrainingTimeline[index];
      if (!step) {
        stopTimer();
        setIsTraining(false);
        setDone(true);
        return;
      }
      setCollectProgress(step.collect);
      setTrainProgress(step.train);
      setLogs((prev) => [...prev, step.log]);
      index += 1;
      if (index >= sampleTrainingTimeline.length) {
        stopTimer();
        setIsTraining(false);
        setDone(true);
      }
    }, 550);
  }, [stopTimer]);

  const startTrain = useCallback(() => {
    if (isTraining) return;
    setIsTraining(true);
    setCollectProgress(0);
    setTrainProgress(0);
    setLogs([]);
    setDone(false);
    setNotice(null);

    try {
      const ws = new WebSocket(WS_TRAIN_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          group: market,
          period: period * 30,
          modelName: `XGB_${market}_${period}d`,
        }));
        setLogs(['서버 연결됨. 학습을 시작하고 있어요.']);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'collection') {
            setCollectProgress(msg.progress ?? 0);
            setLogs((prev) => [...prev, `[수집] ${msg.progress ?? 0}%`]);
          } else if (msg.type === 'training') {
            setTrainProgress(msg.progress ?? 0);
            setLogs((prev) => [...prev, `[학습] ${msg.progress ?? 0}%`]);
          } else if (msg.type === 'complete') {
            setDone(true);
            setIsTraining(false);
            setCollectProgress(100);
            setTrainProgress(100);
            setLogs((prev) => [...prev, '학습을 마쳤어요.']);
            setNotice('실시간 학습 결과를 불러왔어요.');
            ws.close();
          } else if (msg.type === 'error') {
            ws.close();
            startSampleTraining();
          }
        } catch (_) {
          startSampleTraining();
        }
      };

      ws.onerror = () => {
        startSampleTraining();
      };

      ws.onclose = () => {
        if (!done && !timerRef.current) {
          setIsTraining(false);
        }
      };
    } catch (_) {
      startSampleTraining();
    }
  }, [market, period, isTraining, done, startSampleTraining]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      stopTimer();
    };
  }, [stopTimer]);

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {notice && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}
      <Text style={styles.fieldLabel}>시장</Text>
      <ChipSelector options={MARKETS} value={market} onChange={setMarket} disabled={isTraining} />

      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>기간</Text>
      <ChipSelector options={PERIODS} value={period} onChange={setPeriod} disabled={isTraining} />

      <Button
        onPress={startTrain}
        display="full"
        loading={isTraining}
        style={{ marginTop: 24 }}
      >
        {isTraining ? '학습 중...' : '학습하기'}
      </Button>

      {(isTraining || done) && (
        <View style={styles.resultCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>수집</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${collectProgress}%` }]} />
            </View>
            <Text style={styles.progressPct}>{collectProgress}%</Text>
          </View>
          <View style={[styles.progressRow, { marginTop: 10 }]}>
            <Text style={styles.progressLabel}>학습</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${trainProgress}%`, backgroundColor: tdsColors.green400 }]} />
            </View>
            <Text style={styles.progressPct}>{trainProgress}%</Text>
          </View>

          {logs.length > 0 && (
            <View style={styles.logsBox}>
              {logs.slice(-30).map((line, i) => (
                <Text key={i} style={styles.logLine}>{line}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function ModelScreen() {
  const [activeTab, setActiveTab] = useState('predict');

  return (
    <SafeAreaView style={styles.safe}>
      <SegmentControl
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {activeTab === 'predict' ? <PredictTab /> : <TrainTab />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  tabContent: { paddingHorizontal: 16, paddingBottom: 32 },
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
    paddingVertical: 8,
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

  // 예측 결과 테이블
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  resultHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  headerText: { fontSize: 12, color: tdsDark.textSecondary, fontWeight: '600' },
  rowText: { fontSize: 13, color: tdsDark.textPrimary },
  cell: { justifyContent: 'center' },
  cellTicker: { flex: 1.2 },
  cellSignal: { flex: 1.2 },
  cellProb: { flex: 0.9, textAlign: 'right' },

  // 학습 진행률
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressLabel: { width: 36, fontSize: 12, color: tdsDark.textSecondary },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: tdsColors.blue500,
    borderRadius: 3,
  },
  progressPct: { width: 38, textAlign: 'right', fontSize: 12, color: tdsDark.textSecondary },

  logsBox: {
    marginTop: 16,
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 16,
    padding: 10,
    maxHeight: 200,
  },
  logLine: { fontSize: 11, color: tdsDark.textSecondary, fontFamily: 'monospace', marginBottom: 2 },
});
