/**
 * 학습 화면 — XGBoost / 강화학습(RL) 모델 학습
 * 단일 종목 / 그룹 선택 모드 지원
 * 마운트 시 서버 상태 폴링으로 진행 중인 학습 복원
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../constants/tdsColors';
import { Button } from '../components/tds/Button';
import { WS_TRAIN_URL, fetchTrainStatus } from '../lib/xgbApi';
import { startRlTrain, fetchRlTrainStatus } from '../lib/rlApi';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

// 백엔드 data_collector.py fetch_tickers_for_group()에 정의된 유효 그룹 키
const GROUPS = [
  { key: 'sp500',     label: 'S&P 500' },
  { key: 'qqq',       label: 'Nasdaq 100 (QQQ)' },
  { key: 'usall',     label: '미국 전체 (Nasdaq+NYSE)' },
  { key: 'kospi200',  label: 'KOSPI 200' },
  { key: 'kosdaq150', label: 'KOSDAQ 150' },
];

// 2의 거듭제곱 lookback 기반 stage (백엔드 STAGE_LOOKBACKS와 동일)
const STAGE_OPTIONS = [
  { key: 1,  label: '1단계', desc: '1일' },
  { key: 2,  label: '2단계', desc: '1·2일' },
  { key: 3,  label: '3단계', desc: '~4일' },
  { key: 4,  label: '4단계', desc: '~8일' },
  { key: 5,  label: '5단계', desc: '~16일' },
  { key: 6,  label: '6단계', desc: '~32일' },
  { key: 7,  label: '7단계', desc: '~64일' },
  { key: 8,  label: '8단계', desc: '~128일' },
  { key: 9,  label: '9단계', desc: '~256일' },
  { key: 10, label: '10단계', desc: '~512일' },
  { key: 11, label: '11단계', desc: '~1024일' },
];

// stage별 최소 필요 기간 (캘린더 일수)
const STAGE_MIN_PERIOD = {
  1: 365, 2: 365, 3: 365, 4: 365, 5: 365, 6: 365,
  7: 730, 8: 730, 9: 730,
  10: 1825, 11: 1825,
};

const ALL_PERIODS = [
  { key: 365,  label: '1년' },
  { key: 730,  label: '2년' },
  { key: 1825, label: '5년' },
  { key: 9999, label: 'Max' },
];

// RL PPO 학습 스텝 수 옵션
const RL_TIMESTEP_OPTIONS = [
  { key: 100_000, label: '10만', desc: '빠름 (~5분)' },
  { key: 300_000, label: '30만', desc: '권장 (~15분)' },
  { key: 1_000_000, label: '100만', desc: '정밀 (~1시간)' },
];

// ─── 모드 탭 ──────────────────────────────────────────────────────────────────

function ModeTab({ mode, onChange, disabled }) {
  return (
    <View style={styles.modeRow}>
      {['single', 'group'].map((m) => (
        <TouchableOpacity
          key={m}
          style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
          onPress={() => !disabled && onChange(m)}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
            {m === 'single' ? '단일 종목' : '그룹'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── 칩 셀렉터 ────────────────────────────────────────────────────────────────

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

// ─── 진행 바 ──────────────────────────────────────────────────────────────────

function ProgressBar({ label, progress, color }) {
  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressPct}>{progress}%</Text>
    </View>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function TrainScreen() {
  const router = useRouter();

  // 알고리즘 선택: 'xgb' | 'rl'
  const [algo, setAlgo] = useState('xgb');

  // 선택 상태
  const [mode, setMode] = useState('group');   // 'single' | 'group'
  const [ticker, setTicker] = useState('AAPL');
  const [group, setGroup] = useState('sp500');
  const [stage, setStage] = useState(6);
  const [period, setPeriod] = useState(365);
  const [totalTimesteps, setTotalTimesteps] = useState(300_000);  // RL 전용

  // stage 변경 시 period가 최솟값 미달이면 자동 보정
  const handleStageChange = (s) => {
    setStage(s);
    const minPeriod = STAGE_MIN_PERIOD[s] ?? 365;
    if (period < minPeriod) setPeriod(minPeriod);
  };

  // stage에 따라 활성화 가능한 period 목록
  const availablePeriods = ALL_PERIODS.filter(
    (p) => p.key >= (STAGE_MIN_PERIOD[stage] ?? 365)
  );

  // 학습 상태
  const [isTraining, setIsTraining] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const [trainProgress, setTrainProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const wsRef = useRef(null);
  const doneRef = useRef(false);
  const pollTimerRef = useRef(null);

  // ── 마운트 시 서버 상태 복원 ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // XGBoost 상태 복원
        const job = await fetchTrainStatus();
        if (job.status === 'collecting' || job.status === 'training') {
          setAlgo('xgb');
          setIsTraining(true);
          setCollectProgress(job.collect_progress ?? 0);
          setTrainProgress(job.train_progress ?? 0);
          setLogs([`[복원] 서버에서 XGBoost 학습 중: ${job.model_name || ''}`]);
          connectWs({ reconnect: true, serverModelName: job.model_name });
          return;
        }
        // RL 상태 복원
        const rlJob = await fetchRlTrainStatus();
        if (rlJob.status === 'collecting' || rlJob.status === 'training') {
          setAlgo('rl');
          setIsTraining(true);
          setCollectProgress(rlJob.collect_progress ?? 0);
          setTrainProgress(rlJob.train_progress ?? 0);
          setLogs([`[복원] 서버에서 RL 학습 중: ${rlJob.model_name || ''}`]);
        } else if (job.status === 'complete' && job.result) {
          setDone(true);
          setCollectProgress(100);
          setTrainProgress(100);
          setNotice(`최근 완료된 모델: ${job.model_name || ''}`);
        }
      } catch (_) {
        // 서버 연결 불가 — 조용히 무시
      }
    })();
  }, []);

  // ── WebSocket 연결 ────────────────────────────────────────────────────────
  const connectWs = useCallback(({ reconnect = false, serverModelName } = {}) => {
    try {
      const ws = new WebSocket(WS_TRAIN_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (reconnect) {
          // 재연결 시에는 새 학습을 시작하지 않음 — 상태만 수신
          return;
        }
        const isGroup = mode === 'group';
        const periodLabel = period === 9999 ? 'max' : `${period}d`;
        const modelName = isGroup
          ? `XGB_${group}_s${stage}_${periodLabel}`
          : `XGB_${ticker.toUpperCase()}_s${stage}_${periodLabel}`;

        ws.send(JSON.stringify({
          group: isGroup ? group : undefined,
          ticker: !isGroup ? ticker.trim().toUpperCase() : undefined,
          period: period === 9999 ? 36500 : period,  // Max → 100년(사실상 yfinance max)
          stage,
          modelName,
        }));
        setLogs(['서버에 연결됐어요. 학습을 시작하고 있어요.']);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'collection') {
            const p = msg.progress ?? 0;
            setCollectProgress(p);
            if (p % 10 === 0 || p === 100) {
              setLogs((prev) => [...prev, `[수집] ${p}%`]);
            }
          } else if (msg.type === 'training') {
            const p = msg.progress ?? 0;
            setTrainProgress(p);
            if (p % 20 === 0 || p === 100) {
              setLogs((prev) => [...prev, `[학습] ${p}%`]);
            }
          } else if (msg.type === 'complete') {
            doneRef.current = true;
            setDone(true);
            setIsTraining(false);
            setCollectProgress(100);
            setTrainProgress(100);
            setLogs((prev) => [...prev, '학습 완료! 모델이 저장됐어요.']);
            setNotice('학습이 완료됐어요. 모델 목록에서 확인하세요.');
            ws.close();
          } else if (msg.type === 'notice') {
            setNotice(msg.message);
            setLogs((prev) => [...prev, `[알림] ${msg.message}`]);
          } else if (msg.type === 'error') {
            const errMsg = msg.message || '알 수 없는 오류';
            setError(`서버 오류: ${errMsg}`);
            setIsTraining(false);
            setLogs((prev) => [...prev, `[오류] ${errMsg}`]);
            ws.close();
          }
        } catch (_) {
          // JSON 파싱 실패 무시
        }
      };

      ws.onerror = () => {
        setError('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
        setIsTraining(false);
      };

      ws.onclose = () => {
        if (!doneRef.current) {
          // 예기치 않게 끊긴 경우
          if (isTraining) {
            setIsTraining(false);
          }
        }
      };
    } catch (_) {
      setError('WebSocket 연결에 실패했어요.');
      setIsTraining(false);
    }
  }, [mode, ticker, group, period]);

  // ── RL 학습 시작 ──────────────────────────────────────────────────────────
  const startRlTrainSession = useCallback(() => {
    if (isTraining) return;
    if (mode === 'single' && !ticker.trim()) {
      setError('종목 코드를 입력해주세요.');
      return;
    }

    const periodLabel = period === 9999 ? 'max' : `${period}d`;
    const modelName = mode === 'group'
      ? `RL_PPO_${group}_s${stage}_${periodLabel}`
      : `RL_PPO_${ticker.toUpperCase()}_s${stage}_${periodLabel}`;

    setIsTraining(true);
    setCollectProgress(0);
    setTrainProgress(0);
    setLogs([`RL(PPO) 학습을 시작합니다. 모델: ${modelName}`]);
    setDone(false);
    setError(null);
    setNotice(null);
    doneRef.current = false;

    const ws = startRlTrain({
      group: mode === 'group' ? group : undefined,
      ticker: mode === 'single' ? ticker.trim().toUpperCase() : undefined,
      period: period === 9999 ? 36500 : period,
      stage,
      totalTimesteps,
      modelName,
      onCollection: (pct) => {
        startRlPolling();  // WS 끊겨도 폴링이 진행률 유지
        setCollectProgress(pct);
        if (pct % 10 === 0 || pct === 100)
          setLogs((prev) => [...prev, `[수집] ${pct}%`]);
      },
      onTraining: (pct, message) => {
        setTrainProgress(pct);
        if (message) setLogs((prev) => [...prev, `[학습] ${message}`]);
        else if (pct === 100) setLogs((prev) => [...prev, '[학습] 완료']);
      },
      onComplete: (result) => {
        doneRef.current = true;
        setDone(true);
        setIsTraining(false);
        setCollectProgress(100);
        setTrainProgress(100);
        setLogs((prev) => [...prev, `✅ 학습 완료! 모델 ID: ${result?.modelId || ''}`]);
        setNotice(`RL 모델 저장 완료. ${result?.episodeCount || 0}개 종목, ${(result?.totalTimesteps || 0).toLocaleString()} 스텝`);
      },
      onError: (msg) => {
        if (msg === '__ws_disconnect__') {
          // WS 끊김은 치명적 오류 아님 — 폴링이 계속 상태를 추적함
          setLogs((prev) => [...prev, '[안내] 연결이 끊겼어요. 서버에서 학습은 계속 진행 중입니다. (5초마다 상태 확인 중)']);
          setNotice('화면을 끄거나 앱을 백그라운드로 옮겨도 학습은 서버에서 계속됩니다.');
          // isTraining, collectProgress, trainProgress 유지 — 폴링이 업데이트
          return;
        }
        // 실제 서버 에러만 오류로 처리
        setError(`오류: ${msg}`);
        setIsTraining(false);
        setLogs((prev) => [...prev, `[오류] ${msg}`]);
      },
    });
    wsRef.current = ws;
  }, [isTraining, mode, ticker, group, stage, period, totalTimesteps]);

  // ── 학습 시작 (XGBoost) ───────────────────────────────────────────────────
  const startTrain = useCallback(() => {
    if (isTraining) return;

    // 단일 종목 모드 입력값 검증
    if (mode === 'single' && !ticker.trim()) {
      setError('종목 코드를 입력해주세요. (예: AAPL, BTC-USD)');
      return;
    }

    setIsTraining(true);
    setCollectProgress(0);
    setTrainProgress(0);
    setLogs([]);
    setDone(false);
    setError(null);
    setNotice(null);
    doneRef.current = false;

    connectWs();
  }, [isTraining, mode, ticker, connectWs]);

  // ── 공통 학습 시작 핸들러 ──────────────────────────────────────────────────
  const handleStartTrain = useCallback(() => {
    if (algo === 'rl') startRlTrainSession();
    else startTrain();
  }, [algo, startRlTrainSession, startTrain]);

  // ── RL 폴링 fallback — WebSocket 끊겨도 진행률 유지 ─────────────────────
  const startRlPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(async () => {
      if (doneRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        return;
      }
      try {
        const job = await fetchRlTrainStatus();
        if (job.status === 'collecting') {
          setCollectProgress(job.collect_progress ?? 0);
        } else if (job.status === 'training') {
          setCollectProgress(100);
          setTrainProgress(job.train_progress ?? 0);
        } else if (job.status === 'complete' && job.result) {
          doneRef.current = true;
          setDone(true);
          setIsTraining(false);
          setCollectProgress(100);
          setTrainProgress(100);
          setNotice(`RL 모델 저장 완료: ${job.model_name || ''}`);
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        } else if (job.status === 'error') {
          setError(`서버 오류: ${job.error}`);
          setIsTraining(false);
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } catch (_) {}
    }, 5000);  // 5초마다 폴링
  }, []);

  // ── 언마운트 정리 ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // ── 모델 이름 미리보기 ────────────────────────────────────────────────────
  const periodLabel = period === 9999 ? 'max' : `${period}d`;
  const prefix = algo === 'rl' ? 'RL_PPO' : 'XGB';
  const previewName = mode === 'group'
    ? `${prefix}_${group}_s${stage}_${periodLabel}`
    : `${prefix}_${(ticker || 'AAPL').toUpperCase()}_s${stage}_${periodLabel}`;

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={tdsDark.textPrimary} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>새 모델 학습 ({algo === 'rl' ? 'RL' : 'XGBoost'})</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* 안내 / 에러 */}
        {notice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={tdsColors.red500} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 알고리즘 선택 */}
        <Text style={styles.fieldLabel}>알고리즘</Text>
        <View style={styles.algoRow}>
          {[{ key: 'xgb', label: 'XGBoost', sub: '빠름·분류' }, { key: 'rl', label: '강화학습 (RL)', sub: 'PPO·직접매매' }].map((a) => (
            <TouchableOpacity
              key={a.key}
              style={[styles.algoBtn, algo === a.key && styles.algoBtnActive]}
              onPress={() => !isTraining && setAlgo(a.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.algoBtnLabel, algo === a.key && styles.algoBtnLabelActive]}>{a.label}</Text>
              <Text style={[styles.algoBtnSub, algo === a.key && styles.algoBtnSubActive]}>{a.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RL 설명 */}
        {algo === 'rl' && (
          <View style={styles.rlInfoBox}>
            <Text style={styles.rlInfoText}>
              강화학습은 에이전트가 직접 매수·홀드·매도를 결정합니다.{'\n'}
              임계값 설정 없이 스스로 최적 매매 전략을 학습합니다.{'\n'}
              학습 시간: 약 15분~1시간 (스텝 수에 따라 다름)
            </Text>
          </View>
        )}

        {/* 모드 선택 */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>학습 대상</Text>
        <ModeTab mode={mode} onChange={setMode} disabled={isTraining} />

        {/* 단일 종목 입력 */}
        {mode === 'single' && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.fieldLabel}>종목 코드</Text>
            <TextInput
              style={[styles.textInput, isTraining && styles.inputDisabled]}
              value={ticker}
              onChangeText={setTicker}
              placeholder="예: AAPL, TSLA, BTC-USD"
              placeholderTextColor={tdsDark.textTertiary}
              autoCapitalize="characters"
              editable={!isTraining}
            />
          </View>
        )}

        {/* 그룹 선택 */}
        {mode === 'group' && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.fieldLabel}>티커 그룹</Text>
            <ChipSelector
              options={GROUPS}
              value={group}
              onChange={setGroup}
              disabled={isTraining}
            />
          </View>
        )}

        {/* 피처 단계 선택 */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>피처 단계</Text>
        <Text style={styles.stageHint}>
          단계가 높을수록 더 많은 데이터가 필요합니다 (11단계 ≈ 5년 이상)
        </Text>
        <ChipSelector
          options={STAGE_OPTIONS}
          value={stage}
          onChange={handleStageChange}
          disabled={isTraining}
        />

        {/* 기간 선택 */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>학습 데이터 기간</Text>
        <ChipSelector
          options={availablePeriods}
          value={period}
          onChange={setPeriod}
          disabled={isTraining}
        />

        {/* RL 학습 스텝 수 */}
        {algo === 'rl' && (
          <>
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>학습 스텝 수 (PPO)</Text>
            <ChipSelector
              options={RL_TIMESTEP_OPTIONS.map((o) => ({ key: o.key, label: `${o.label} · ${o.desc}` }))}
              value={totalTimesteps}
              onChange={setTotalTimesteps}
              disabled={isTraining}
            />
          </>
        )}

        {/* 모델 이름 미리보기 */}
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>모델 이름</Text>
          <Text style={styles.previewValue}>{previewName}</Text>
        </View>

        {/* 학습 버튼 */}
        <Button
          onPress={handleStartTrain}
          display="full"
          loading={isTraining}
          style={{ marginTop: 24 }}
        >
          {isTraining
            ? algo === 'rl' ? 'PPO 학습 중... (시간이 걸려요)' : '학습 중...'
            : done ? '다시 학습하기' : algo === 'rl' ? 'RL 학습 시작' : '학습하기'}
        </Button>

        {/* 완료 버튼 */}
        {done && (
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>완료 — 모델 목록으로</Text>
          </TouchableOpacity>
        )}

        {/* 진행 상황 */}
        {(isTraining || done) && (
          <View style={styles.resultCard}>
            <ProgressBar label="수집" progress={collectProgress} color={tdsColors.blue500} />
            <View style={{ marginTop: 10 }}>
              <ProgressBar label="학습" progress={trainProgress} color={tdsColors.green400} />
            </View>

            {logs.length > 0 && (
              <View style={styles.logsBox}>
                {logs.slice(-40).map((line, i) => (
                  <Text key={i} style={styles.logLine}>{line}</Text>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary },
  headerRight: { minWidth: 60 },

  content: { padding: 16, paddingBottom: 48 },

  noticeBox: {
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tdsColors.blue50,
    borderRadius: 16,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: tdsColors.blue700 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: `${tdsColors.red500}15`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${tdsColors.red500}40`,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19, color: tdsColors.red500 },

  fieldLabel: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 8 },
  stageHint: { fontSize: 11, color: tdsDark.textTertiary, marginBottom: 8, lineHeight: 16 },

  modeRow: {
    flexDirection: 'row',
    backgroundColor: tdsDark.bgCard,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: tdsColors.blue500 },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: tdsDark.textSecondary },
  modeBtnTextActive: { color: '#fff' },

  textInput: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: tdsDark.textPrimary,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  inputDisabled: { opacity: 0.5 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tdsDark.border,
    backgroundColor: tdsDark.bgCard,
  },
  chipActive: {
    borderColor: tdsColors.blue500,
    backgroundColor: `${tdsColors.blue500}22`,
  },
  chipText: { fontSize: 13, color: tdsDark.textSecondary },
  chipTextActive: { color: tdsColors.blue500, fontWeight: '600' },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 12,
    gap: 10,
  },
  previewLabel: { fontSize: 12, color: tdsDark.textTertiary, flexShrink: 0 },
  previewValue: { fontSize: 13, color: tdsDark.textSecondary, fontFamily: 'monospace', flex: 1 },

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
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { width: 38, textAlign: 'right', fontSize: 12, color: tdsDark.textSecondary },

  logsBox: {
    marginTop: 16,
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 12,
    padding: 10,
  },
  logLine: {
    fontSize: 11,
    color: tdsDark.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 2,
    lineHeight: 16,
  },

  // 알고리즘 선택
  algoRow: { flexDirection: 'row', gap: 10 },
  algoBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tdsDark.border,
    backgroundColor: tdsDark.bgCard,
    alignItems: 'center',
    gap: 3,
  },
  algoBtnActive: {
    borderColor: tdsColors.blue500,
    backgroundColor: `${tdsColors.blue500}18`,
  },
  algoBtnLabel: { fontSize: 14, fontWeight: '700', color: tdsDark.textSecondary },
  algoBtnLabelActive: { color: tdsColors.blue500 },
  algoBtnSub: { fontSize: 11, color: tdsDark.textTertiary },
  algoBtnSubActive: { color: `${tdsColors.blue500}bb` },

  // RL 설명 박스
  rlInfoBox: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: `${tdsColors.blue500}10`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${tdsColors.blue500}30`,
  },
  rlInfoText: { fontSize: 12, lineHeight: 18, color: tdsDark.textSecondary },
});
