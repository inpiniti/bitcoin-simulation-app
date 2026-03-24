/**
 * DeepLearning 화면 - 딥러닝 스튜디오
 * 이슈 #12 (DLModelsTab), #13 (DLPredictionTab), #14 (DLServerTrainingTab)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Brain } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabaseClient';
import { predictXgb, WS_TRAIN_URL } from '../../lib/xgbApi';

// ─── 색상 상수 ────────────────────────────────────────────────────────────────

const METRIC_COLORS = {
  f1: '#4ec9b0',
  auc: '#9cdcfe',
  precision: '#ce9178',
  recall: '#4fc1ff',
};

const SIGNAL_COLORS = {
  BUY: '#f23645',
  SELL: '#089981',
  HOLD: '#6a6a6a',
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatPercent(value) {
  if (value == null) return 'N/A';
  return (value * 100).toFixed(1) + '%';
}

// ─── MetricBadge ──────────────────────────────────────────────────────────────

function MetricBadge({ label, value, color, testID }) {
  return (
    <View testID={testID} style={[styles.metricBadge, { borderColor: color }]}>
      <Text style={[styles.metricLabel, { color }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{formatPercent(value)}</Text>
    </View>
  );
}

// ─── ModelItem ────────────────────────────────────────────────────────────────

function ModelItem({ item, onDelete }) {
  return (
    <View style={styles.modelItem} testID={`model-item-${item.id}`}>
      <View style={styles.modelHeader}>
        <Text style={styles.modelName}>{item.name}</Text>
        <TouchableOpacity
          testID={`delete-model-${item.id}`}
          style={styles.deleteButton}
          onPress={() => onDelete(item)}
        >
          <Text style={styles.deleteButtonText}>삭제</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.modelDate}>{formatDate(item.created_at)}</Text>
      <View style={styles.metricsRow}>
        {item.f1_score != null && (
          <MetricBadge
            testID={`badge-f1-${item.id}`}
            label="F1"
            value={item.f1_score}
            color={METRIC_COLORS.f1}
          />
        )}
        {item.auc != null && (
          <MetricBadge
            testID={`badge-auc-${item.id}`}
            label="AUC"
            value={item.auc}
            color={METRIC_COLORS.auc}
          />
        )}
        {item.precision_score != null && (
          <MetricBadge
            testID={`badge-precision-${item.id}`}
            label="Precision"
            value={item.precision_score}
            color={METRIC_COLORS.precision}
          />
        )}
        {item.recall_score != null && (
          <MetricBadge
            testID={`badge-recall-${item.id}`}
            label="Recall"
            value={item.recall_score}
            color={METRIC_COLORS.recall}
          />
        )}
      </View>
      {item.is_active && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>활성</Text>
        </View>
      )}
    </View>
  );
}

// ─── DLModelsTab ──────────────────────────────────────────────────────────────

function DLModelsTab() {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('ml_models')
        .select('id, name, created_at, accuracy, f1_score, auc, precision_score, recall_score, is_active')
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(queryError.message);
      } else {
        setModels(data || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleDelete = useCallback((item) => {
    Alert.alert(
      '모델 삭제',
      `"${item.name}" 모델을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('ml_models').delete().eq('id', item.id);
              await loadModels();
            } catch (e) {
              Alert.alert('오류', e.message);
            }
          },
        },
      ]
    );
  }, [loadModels]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer} testID="models-loading">
        <ActivityIndicator color={Colors.accentBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer} testID="models-error">
        <Text style={styles.errorText}>오류: {error}</Text>
      </View>
    );
  }

  if (models.length === 0) {
    return (
      <View style={styles.centerContainer} testID="models-empty">
        <Text style={styles.emptyText}>등록된 모델이 없습니다</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={models}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ModelItem item={item} onDelete={handleDelete} />}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, color, testID }) {
  const pct = Math.max(0, Math.min(100, (value || 0) * 100));
  return (
    <View style={styles.progressTrack} testID={testID}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── ThresholdSlider ──────────────────────────────────────────────────────────

function ThresholdSlider({ label, value, onChange, testID }) {
  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>
        {label}: {value}
      </Text>
      <View style={styles.sliderButtons}>
        <TouchableOpacity
          testID={testID}
          style={styles.sliderBtn}
          onPress={() => onChange(Math.max(0, value - 5))}
        >
          <Text style={styles.sliderBtnText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sliderBtn}
          onPress={() => onChange(Math.min(100, value + 5))}
        >
          <Text style={styles.sliderBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── DLPredictionTab ─────────────────────────────────────────────────────────

function DLPredictionTab({ models }) {
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [buyThreshold, setBuyThreshold] = useState(60);
  const [sellThreshold, setSellThreshold] = useState(40);

  const handlePredict = async () => {
    if (!ticker.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await predictXgb({
        model_id: selectedModelId || (models[0]?.id ?? ''),
        ticker: ticker.trim().toUpperCase(),
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const signalColor = result ? (SIGNAL_COLORS[result.signal] ?? SIGNAL_COLORS.HOLD) : Colors.textSecondary;

  return (
    <ScrollView scrollEnabled={false}>
      {/* 모델 선택 */}
      <Card title="모델 선택">
        {models.length === 0 ? (
          <Text style={styles.emptyText}>등록된 모델이 없습니다</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {models.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.modelChip,
                  selectedModelId === m.id && styles.modelChipActive,
                ]}
                onPress={() => setSelectedModelId(m.id)}
              >
                <Text
                  style={[
                    styles.modelChipText,
                    selectedModelId === m.id && styles.modelChipTextActive,
                  ]}
                >
                  {m.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </Card>

      {/* 종목 입력 */}
      <Card title="예측 실행">
        <TextInput
          testID="ticker-input"
          style={styles.textInput}
          placeholder="종목 코드 입력 (예: AAPL)"
          placeholderTextColor={Colors.textDisabled}
          value={ticker}
          onChangeText={setTicker}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          testID="predict-button"
          style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
          onPress={handlePredict}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator testID="predict-loading" color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>예측 실행</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View testID="predict-error" style={styles.errorContainer}>
            <Text style={styles.errorText}>오류: {error}</Text>
          </View>
        )}
      </Card>

      {/* 임계값 슬라이더 */}
      <Card title="임계값 설정">
        <ThresholdSlider
          testID="buy-threshold-slider"
          label="매수 임계값"
          value={buyThreshold}
          onChange={setBuyThreshold}
        />
        <ThresholdSlider
          testID="sell-threshold-slider"
          label="매도 임계값"
          value={sellThreshold}
          onChange={setSellThreshold}
        />
      </Card>

      {/* 예측 결과 */}
      {result && (
        <Card title="예측 결과">
          {/* 신호 배지 */}
          <View style={styles.signalRow}>
            <Text style={styles.signalLabel}>신호</Text>
            <View
              testID="signal-badge"
              style={[styles.signalBadge, { backgroundColor: `${signalColor}33`, borderColor: signalColor }]}
            >
              <Text style={[styles.signalBadgeText, { color: signalColor }]}>
                {result.signal}
              </Text>
            </View>
          </View>

          {/* 매수 확률 */}
          <View style={styles.probRow}>
            <Text style={styles.probLabel}>
              매수 확률: {(result.buy_probability * 100).toFixed(1)}%
            </Text>
            <ProgressBar
              testID="buy-probability-bar"
              value={result.buy_probability}
              color={SIGNAL_COLORS.BUY}
            />
          </View>

          {/* 매도 확률 */}
          <View style={styles.probRow}>
            <Text style={styles.probLabel}>
              매도 확률: {(result.sell_probability * 100).toFixed(1)}%
            </Text>
            <ProgressBar
              testID="sell-probability-bar"
              value={result.sell_probability}
              color={SIGNAL_COLORS.SELL}
            />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

// ─── DLServerTrainingTab ─────────────────────────────────────────────────────

const STOCK_GROUPS = [
  { key: 'sp500', label: 'S&P 500' },
  { key: 'qqq', label: 'QQQ' },
  { key: 'superinvestor', label: '슈퍼인베스터' },
];

function DLServerTrainingTab({ onTrainingComplete }) {
  const [selectedGroup, setSelectedGroup] = useState('sp500');
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const wsRef = useRef(null);

  const startTraining = useCallback(() => {
    if (isTraining) return;

    setIsTraining(true);
    setProgress(0);
    setLogs([]);
    setIsComplete(false);
    setHasError(false);

    const url = `${WS_TRAIN_URL}?group=${selectedGroup}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setLogs((prev) => [...prev, '서버 연결됨']);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setProgress(msg.progress ?? 0);
        setLogs((prev) => [...prev, msg.message || '']);

        if (msg.type === 'complete') {
          setIsComplete(true);
          setIsTraining(false);
          ws.close();
          if (onTrainingComplete) onTrainingComplete();
        } else if (msg.type === 'error') {
          setHasError(true);
          setIsTraining(false);
          ws.close();
        }
      } catch (e) {
        setLogs((prev) => [...prev, '메시지 파싱 오류']);
      }
    };

    ws.onerror = () => {
      setHasError(true);
      setIsTraining(false);
      setLogs((prev) => [...prev, 'WebSocket 오류 발생']);
    };

    ws.onclose = () => {
      if (!isComplete) {
        setIsTraining(false);
      }
    };
  }, [isTraining, selectedGroup, onTrainingComplete]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const progressPct = Math.max(0, Math.min(100, progress));

  return (
    <ScrollView scrollEnabled={false}>
      {/* 종목 그룹 선택 */}
      <Card title="종목 그룹">
        <View style={styles.groupRow}>
          {STOCK_GROUPS.map((g) => (
            <TouchableOpacity
              key={g.key}
              testID={`group-${g.key}`}
              style={[
                styles.groupChip,
                selectedGroup === g.key && styles.groupChipActive,
              ]}
              onPress={() => setSelectedGroup(g.key)}
              disabled={isTraining}
            >
              <Text
                style={[
                  styles.groupChipText,
                  selectedGroup === g.key && styles.groupChipTextActive,
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* 학습 시작 */}
      <Card>
        <TouchableOpacity
          testID="start-training-button"
          style={[styles.actionButton, isTraining && styles.actionButtonDisabled]}
          onPress={startTraining}
          disabled={isTraining}
        >
          <Text style={styles.actionButtonText}>
            {isTraining ? '학습 중...' : '학습 시작'}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* 진행률 */}
      {(isTraining || isComplete || hasError) && (
        <Card title="진행 상황">
          <View style={styles.progressTrack} testID="training-progress-bar">
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: hasError ? Colors.error : Colors.accentBlue,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progressPct}%</Text>

          {isComplete && (
            <View testID="training-complete" style={styles.completeBadge}>
              <Text style={styles.completeBadgeText}>학습 완료!</Text>
            </View>
          )}

          {hasError && (
            <View testID="training-error" style={styles.errorContainer}>
              <Text style={styles.errorText}>학습 중 오류가 발생했습니다</Text>
            </View>
          )}
        </Card>
      )}

      {/* 로그 */}
      {logs.length > 0 && (
        <Card title="학습 로그">
          <ScrollView style={styles.logScroll} testID="training-log">
            {logs.map((log, i) => (
              <Text key={i} style={styles.logLine}>
                {log}
              </Text>
            ))}
          </ScrollView>
        </Card>
      )}
    </ScrollView>
  );
}

// ─── DeepLearningScreen (메인) ────────────────────────────────────────────────

const TABS = [
  { key: 'models', label: '모델목록' },
  { key: 'prediction', label: '예측실행' },
  { key: 'training', label: '서버학습' },
];

export default function DeepLearningScreen() {
  const [activeTab, setActiveTab] = useState('models');
  const [models, setModels] = useState([]);

  const loadModels = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('ml_models')
        .select('id, name, created_at, accuracy, f1_score, auc, precision_score, recall_score, is_active')
        .order('created_at', { ascending: false });
      if (data) setModels(data);
    } catch (_) {
      // 에러 무시 (DLModelsTab에서 별도 처리)
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Brain color={Colors.accentBlue} size={24} />
        <Text style={styles.headerTitle}>딥러닝 스튜디오</Text>
      </View>

      {/* 탭 바 */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            testID={`tab-${tab.key}`}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 콘텐츠 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'models' && (
          <View testID="models-panel">
            <DLModelsTab />
          </View>
        )}
        {activeTab === 'prediction' && (
          <View testID="prediction-panel">
            <DLPredictionTab models={models} />
          </View>
        )}
        {activeTab === 'training' && (
          <View testID="training-panel">
            <DLServerTrainingTab onTrainingComplete={loadModels} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
    backgroundColor: Colors.bgSecondary,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accentBlue,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.accentBlue,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 32,
  },
  // Model item
  modelItem: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginVertical: 4,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  modelDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 11,
  },
  activeBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.success}33`,
    borderWidth: 1,
    borderColor: Colors.success,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: `${Colors.error}33`,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 4,
  },
  // Center containers
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: `${Colors.error}22`,
    borderRadius: 4,
  },
  // Prediction
  textInput: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: Colors.accentBlue,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: Colors.bgTertiary,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Model chip
  modelChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginRight: 8,
  },
  modelChipActive: {
    borderColor: Colors.accentBlue,
    backgroundColor: `${Colors.accentBlue}22`,
  },
  modelChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  modelChipTextActive: {
    color: Colors.accentBlue,
    fontWeight: '600',
  },
  // Signal
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  signalLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  signalBadge: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
  },
  signalBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Probability
  probRow: {
    marginBottom: 10,
  },
  probLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Slider
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  sliderLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderBtn: {
    width: 32,
    height: 32,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  sliderBtnText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Training
  groupRow: {
    flexDirection: 'row',
    gap: 8,
  },
  groupChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    alignItems: 'center',
  },
  groupChipActive: {
    borderColor: Colors.accentBlue,
    backgroundColor: `${Colors.accentBlue}22`,
  },
  groupChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  groupChipTextActive: {
    color: Colors.accentBlue,
    fontWeight: '600',
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  completeBadge: {
    marginTop: 8,
    padding: 8,
    backgroundColor: `${Colors.success}22`,
    borderRadius: 4,
    alignItems: 'center',
  },
  completeBadgeText: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  logScroll: {
    maxHeight: 200,
  },
  logLine: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
