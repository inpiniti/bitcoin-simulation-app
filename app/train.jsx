/**
 * 학습 화면 — 새 XGBoost 모델 학습
 * 탭바 없이 stack으로 push되는 화면
 * 완료 후 router.back() → 모델 목록 자동 새로고침
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../constants/tdsColors';
import { Button } from '../components/tds/Button';
import { WS_TRAIN_URL } from '../lib/xgbApi';
import { sampleTrainingTimeline } from '../lib/sampleData';

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

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function TrainScreen() {
  const router = useRouter();
  const [market, setMarket] = useState('kospi');
  const [period, setPeriod] = useState(30);
  const [isTraining, setIsTraining] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const [trainProgress, setTrainProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const doneRef = useRef(false);

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
      if (!step || index >= sampleTrainingTimeline.length) {
        stopTimer();
        setIsTraining(false);
        setDone(true);
        doneRef.current = true;
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
        doneRef.current = true;
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
    doneRef.current = false;
    setNotice(null);

    try {
      const ws = new WebSocket(WS_TRAIN_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            group: market,
            period: period * 30,
            modelName: `XGB_${market}_${period}d`,
          }),
        );
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
            doneRef.current = true;
            setDone(true);
            setIsTraining(false);
            setCollectProgress(100);
            setTrainProgress(100);
            setLogs((prev) => [...prev, '학습을 마쳤어요.']);
            setNotice('모델 학습이 완료됐어요. 저장되었습니다.');
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
        if (!doneRef.current && !timerRef.current) {
          setIsTraining(false);
        }
      };
    } catch (_) {
      startSampleTraining();
    }
  }, [market, period, isTraining, startSampleTraining]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      stopTimer();
    };
  }, [stopTimer]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={tdsDark.textPrimary} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>새 모델 학습</Text>
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
          disabled={isTraining}
        />

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>기간</Text>
        <ChipSelector
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          disabled={isTraining}
        />

        <Button
          onPress={startTrain}
          display="full"
          loading={isTraining}
          style={{ marginTop: 24 }}
        >
          {isTraining ? '학습 중...' : done ? '다시 학습하기' : '학습하기'}
        </Button>

        {done && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>완료</Text>
          </TouchableOpacity>
        )}

        {(isTraining || done) && (
          <View style={styles.resultCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>수집</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${collectProgress}%` }]}
                />
              </View>
              <Text style={styles.progressPct}>{collectProgress}%</Text>
            </View>
            <View style={[styles.progressRow, { marginTop: 10 }]}>
              <Text style={styles.progressLabel}>학습</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${trainProgress}%`,
                      backgroundColor: tdsColors.green400,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressPct}>{trainProgress}%</Text>
            </View>

            {logs.length > 0 && (
              <View style={styles.logsBox}>
                {logs.slice(-30).map((line, i) => (
                  <Text key={i} style={styles.logLine}>
                    {line}
                  </Text>
                ))}
              </View>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
    backgroundColor: tdsDark.bgPrimary,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60 },
  backText: { fontSize: 15, color: tdsDark.textPrimary },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  headerRight: { minWidth: 60 },

  content: { padding: 16, paddingBottom: 40 },

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

  doneBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: tdsColors.green400,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  resultCard: {
    marginTop: 20,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 24,
    padding: 16,
  },
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
  progressPct: {
    width: 38,
    textAlign: 'right',
    fontSize: 12,
    color: tdsDark.textSecondary,
  },

  logsBox: {
    marginTop: 16,
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 16,
    padding: 10,
    maxHeight: 200,
  },
  logLine: {
    fontSize: 11,
    color: tdsDark.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
