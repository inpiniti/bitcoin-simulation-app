import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Activity } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/colors';
import { fetchHealth, fetchAutoTradeSettings } from '../../lib/backendApi';
import { supabase } from '../../lib/supabaseClient';

const REFRESH_INTERVAL_MS = 30000;

const EXECUTION_TIME_LABELS = {
  market_open: '장 시작 (09:30 ET)',
  market_open_30m: '장 시작 30분 후 (10:00 ET)',
  market_open_1h: '장 시작 1시간 후 (10:30 ET)',
  market_close_2h: '장 마감 2시간 전 (14:00 ET)',
  market_close_1h: '장 마감 1시간 전 (15:00 ET)',
  market_close_30m: '장 마감 30분 전 (15:30 ET)',
  market_close: '장 마감 (16:00 ET)',
};

function formatDateTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function HealthStatusIcon({ status }) {
  if (status === 'online') return <Text style={styles.statusDot}>🟢</Text>;
  if (status === 'sleeping') return <Text style={styles.statusDot}>🟡</Text>;
  return <Text style={styles.statusDot}>🔴</Text>;
}

function HealthSection({ health, onWakeup, lastChecked, isChecking }) {
  const isDisabled = health?.status === 'online' || isChecking;
  const statusLabel =
    health?.status === 'online'
      ? '온라인'
      : health?.status === 'sleeping'
      ? '슬립 상태'
      : '오프라인';

  const statusTestID =
    health?.status === 'online'
      ? 'health-status-online'
      : health?.status === 'sleeping'
      ? 'health-status-sleeping'
      : 'health-status-offline';

  return (
    <Card title="API 서버 상태">
      {isChecking && !health ? (
        <ActivityIndicator color={Colors.accentBlue} testID="health-loading" />
      ) : (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>상태</Text>
            <View style={styles.rowRight} testID={statusTestID}>
              <HealthStatusIcon status={health?.status} />
              <Text style={styles.statusLabel}>{statusLabel}</Text>
            </View>
          </View>

          {health?.version ? (
            <View style={styles.row}>
              <Text style={styles.label}>버전</Text>
              <Text style={styles.value}>{health.version}</Text>
            </View>
          ) : null}

          {health?.responseTime != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>응답 시간</Text>
              <Text style={styles.value}>{health.responseTime}ms</Text>
            </View>
          ) : null}

          {health?.error ? (
            <View style={styles.row}>
              <Text style={styles.label}>오류</Text>
              <Text style={[styles.value, styles.errorText]}>{health.error}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.label}>마지막 확인</Text>
            <Text style={styles.value} testID="last-checked-time">
              {lastChecked ? formatDateTime(lastChecked) : '-'}
            </Text>
          </View>

          <TouchableOpacity
            testID="wakeup-button"
            style={[styles.wakeupButton, isDisabled && styles.wakeupButtonDisabled]}
            onPress={onWakeup}
            disabled={isDisabled}
            accessibilityState={{ disabled: isDisabled }}
          >
            <Text style={[styles.wakeupButtonText, isDisabled && styles.wakeupButtonTextDisabled]}>
              {isChecking ? '확인 중...' : '웨이크업'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </Card>
  );
}

function AutoTradeSettingsSection({ settings, isLoading }) {
  if (isLoading) {
    return (
      <Card title="자동매매 스케줄">
        <ActivityIndicator color={Colors.accentBlue} testID="settings-loading" />
      </Card>
    );
  }

  if (!settings || !settings.active || !settings.settings) {
    return (
      <Card title="자동매매 스케줄">
        <Text style={styles.emptyText}>활성화된 설정이 없습니다</Text>
      </Card>
    );
  }

  const s = settings.settings;
  const executionLabel = EXECUTION_TIME_LABELS[s.execution_time] ?? s.execution_time;

  return (
    <Card title="자동매매 스케줄">
      <View style={styles.row}>
        <Text style={styles.label}>모델 ID</Text>
        <Text style={styles.value}>{s.ai_model_key}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>실행 시간</Text>
        <Text style={styles.value}>{executionLabel}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>매수 임계값</Text>
        <Text style={styles.value}>{s.buy_condition}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>매도 임계값</Text>
        <Text style={styles.value}>{s.sell_condition}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>활성 상태</Text>
        <Badge
          testID="badge-is-active"
          label={s.is_active ? '활성' : '비활성'}
          variant={s.is_active ? 'success' : 'default'}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>매매 모드</Text>
        <Badge
          testID="badge-trade-enabled"
          label={s.trade_enabled ? '실매매' : '모의매매'}
          variant={s.trade_enabled ? 'buy' : 'warning'}
        />
      </View>
    </Card>
  );
}

function LogItem({ item }) {
  // error 컬럼이 없으면 성공 (null/undefined = success)
  const isSuccess = !item.error;
  // logs 컬럼은 배열 - 첫 번째 항목을 요약으로 표시
  const logSummary = Array.isArray(item.logs) && item.logs.length > 0
    ? item.logs[0]
    : (item.error || null);

  return (
    <View style={styles.logItem} testID={`log-item-${item.id}`}>
      <View style={styles.logHeader}>
        <Text style={styles.logDate}>{formatDateTime(item.created_at)}</Text>
        <Badge
          testID={`log-status-${item.id}`}
          label={isSuccess ? '성공' : '실패'}
          variant={isSuccess ? 'success' : 'error'}
        />
        {item.is_test ? (
          <Badge label="테스트" variant="default" />
        ) : null}
      </View>
      {logSummary ? (
        <Text style={styles.logSummary}>{logSummary}</Text>
      ) : null}
      {item.buy_signals != null ? (
        <Text style={styles.logTickers}>
          <Text style={styles.tickerLabel}>매수신호: </Text>
          {item.buy_signals}건 / 주문: {item.buy_orders ?? 0}건
        </Text>
      ) : null}
      {item.sell_signals != null ? (
        <Text style={styles.logTickers}>
          <Text style={styles.tickerLabel}>매도신호: </Text>
          {item.sell_signals}건 / 주문: {item.sell_orders ?? 0}건
        </Text>
      ) : null}
    </View>
  );
}

function AutoTradeLogsSection({ logs, isLoading }) {
  if (isLoading) {
    return (
      <Card title="자동매매 실행 로그">
        <ActivityIndicator color={Colors.accentBlue} testID="logs-loading" />
      </Card>
    );
  }

  return (
    <Card title="자동매매 실행 로그">
      {logs.length === 0 ? (
        <Text style={styles.emptyText} testID="logs-empty">
          실행 로그가 없습니다
        </Text>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogItem item={item} />}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </Card>
  );
}

export default function ServerScreen() {
  const [health, setHealth] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [autoTradeSettings, setAutoTradeSettings] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const intervalRef = useRef(null);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await fetchHealth();
      setHealth(result);
      setLastChecked(new Date().toISOString());
    } finally {
      setIsChecking(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const result = await fetchAutoTradeSettings();
      setAutoTradeSettings(result);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('auto_trade_dl_logs')
        .select('id, created_at, is_test, buy_signals, sell_signals, buy_orders, sell_orders, logs, error')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setLogs(data);
      }
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    loadSettings();
    loadLogs();

    intervalRef.current = setInterval(checkHealth, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkHealth, loadSettings, loadLogs]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Activity color={Colors.accentBlue} size={24} />
        <Text style={styles.headerTitle}>서버 상태</Text>
      </View>

      <HealthSection
        health={health}
        onWakeup={checkHealth}
        lastChecked={lastChecked}
        isChecking={isChecking}
      />

      <AutoTradeSettingsSection
        settings={autoTradeSettings}
        isLoading={isLoadingSettings}
      />

      <AutoTradeLogsSection
        logs={logs}
        isLoading={isLoadingLogs}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'monospace',
    flexShrink: 1,
    textAlign: 'right',
  },
  errorText: {
    color: Colors.error,
  },
  statusDot: {
    fontSize: 14,
  },
  statusLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  wakeupButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.accentBlue,
    borderRadius: 6,
    alignItems: 'center',
  },
  wakeupButtonDisabled: {
    backgroundColor: Colors.bgTertiary,
  },
  wakeupButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  wakeupButtonTextDisabled: {
    color: Colors.textDisabled,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  logItem: {
    paddingVertical: 8,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  logDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  logSummary: {
    color: Colors.textPrimary,
    fontSize: 13,
    marginBottom: 2,
  },
  logTickers: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  tickerLabel: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderColor,
    marginVertical: 4,
  },
});
