/**
 * TradingScreen - 자동매매 설정 화면
 * 이슈 #15: 설정 목록 CRUD
 * 이슈 #16: KIS API 자격증명 폼
 * 이슈 #17: 실행시간 및 매매 조건 설정
 * 이슈 #18: 자동매매 실행 로그 상세
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Settings } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/colors';
import {
  fetchSettings,
  createSetting,
  deleteSetting,
  toggleSetting,
  fetchTradeLogs,
} from '../../lib/tradingApi';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const CREDENTIALS_STORAGE_KEY = 'kis_credentials';

const EXECUTION_TIMES = [
  { key: 'market_open', label: '장 시작 (09:30 ET)' },
  { key: 'market_open_30m', label: '장 시작 30분 후 (10:00 ET)' },
  { key: 'market_open_1h', label: '장 시작 1시간 후 (10:30 ET)' },
  { key: 'market_close_2h', label: '장 마감 2시간 전 (14:00 ET)' },
  { key: 'market_close_1h', label: '장 마감 1시간 전 (15:00 ET)' },
  { key: 'market_close_30m', label: '장 마감 30분 전 (15:30 ET)' },
  { key: 'market_close', label: '장 마감 (16:00 ET)' },
];

const TABS = [
  { key: 'settings', label: '설정목록' },
  { key: 'credentials', label: 'KIS 자격증명' },
  { key: 'condition', label: '매매조건' },
  { key: 'logs', label: '실행로그' },
];

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

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

// ─── SettingsListTab ──────────────────────────────────────────────────────────

function SettingsListTab() {
  const [settings, setSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formTicker, setFormTicker] = useState('');
  const [formStrategy, setFormStrategy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchSettings();
      if (result.error) {
        setError(result.error.message || '조회 실패');
      } else {
        setSettings(result.data || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = useCallback(async (item, value) => {
    const result = await toggleSetting(item.id, value);
    if (!result.error) {
      setSettings((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, is_active: value } : s))
      );
    }
  }, []);

  const handleDelete = useCallback((item) => {
    Alert.alert(
      '설정 삭제',
      `"${item.name || item.ticker_group_key || '설정'}" 설정을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteSetting(item.id);
            if (!result.error) {
              await loadSettings();
            } else {
              Alert.alert('오류', result.error.message || '삭제 실패');
            }
          },
        },
      ]
    );
  }, [loadSettings]);

  const handleCreate = useCallback(async () => {
    if (!formTicker.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await createSetting({
        ticker: formTicker.trim().toUpperCase(),
        strategy: formStrategy.trim() || 'default',
        is_active: false,
        execution_time: 'market_open',
        buy_condition: '0.7',
        sell_condition: '0.3',
        amount: 100,
      });
      if (result.error) {
        Alert.alert('오류', result.error.message || '생성 실패');
      } else {
        setFormTicker('');
        setFormStrategy('');
        setShowForm(false);
        await loadSettings();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formTicker, formStrategy, loadSettings]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer} testID="settings-loading">
        <ActivityIndicator color={Colors.accentBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer} testID="settings-error">
        <Text style={styles.errorText}>오류: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {/* 추가 버튼 */}
      <TouchableOpacity
        testID="add-setting-button"
        style={styles.addButton}
        onPress={() => setShowForm((v) => !v)}
      >
        <Text style={styles.addButtonText}>{showForm ? '취소' : '+ 설정 추가'}</Text>
      </TouchableOpacity>

      {/* 설정 추가 폼 */}
      {showForm && (
        <Card testID="setting-form">
          <TextInput
            testID="form-ticker-input"
            style={styles.textInput}
            placeholder="종목 코드 (예: AAPL)"
            placeholderTextColor={Colors.textDisabled}
            value={formTicker}
            onChangeText={setFormTicker}
            autoCapitalize="characters"
          />
          <TextInput
            testID="form-strategy-input"
            style={styles.textInput}
            placeholder="전략 이름 (예: momentum)"
            placeholderTextColor={Colors.textDisabled}
            value={formStrategy}
            onChangeText={setFormStrategy}
          />
          <TouchableOpacity
            testID="form-submit-button"
            style={[styles.actionButton, isSubmitting && styles.actionButtonDisabled]}
            onPress={handleCreate}
            disabled={isSubmitting}
          >
            <Text style={styles.actionButtonText}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* 설정 목록 */}
      {settings.length === 0 ? (
        <View style={styles.centerContainer} testID="settings-empty">
          <Text style={styles.emptyText}>설정된 자동매매가 없습니다</Text>
          <Text style={styles.emptySubText}>위의 버튼을 눌러 설정을 추가하세요</Text>
        </View>
      ) : (
        <FlatList
          data={settings}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.settingItem} testID={`setting-item-${item.id}`}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingTicker}>{item.name || item.ticker_group_key || '-'}</Text>
                <Badge
                  testID={`badge-active-${item.id}`}
                  label={item.is_active ? '활성' : '비활성'}
                  variant={item.is_active ? 'success' : 'default'}
                />
              </View>
              <Text style={styles.settingStrategy}>{item.ai_model_key || item.ticker_group_key || '-'}</Text>
              <View style={styles.settingFooter}>
                <Switch
                  testID={`toggle-${item.id}`}
                  value={item.is_active}
                  onValueChange={(val) => handleToggle(item, val)}
                  trackColor={{ false: Colors.bgTertiary, true: `${Colors.success}66` }}
                  thumbColor={item.is_active ? Colors.success : Colors.textDisabled}
                />
                <TouchableOpacity
                  testID={`delete-setting-${item.id}`}
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

// ─── CredentialsForm ──────────────────────────────────────────────────────────

function CredentialsForm() {
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState(null);

  // 저장된 자격증명 불러오기
  useEffect(() => {
    async function loadCredentials() {
      try {
        const stored = await AsyncStorage.getItem(CREDENTIALS_STORAGE_KEY);
        if (stored) {
          const creds = JSON.parse(stored);
          setAppKey(creds.app_key || '');
          setAppSecret(creds.app_secret || '');
          setAccountNo(creds.account_no || '');
        }
      } catch (_) {
        // 무시
      }
    }
    loadCredentials();
  }, []);

  const handleSave = useCallback(async () => {
    if (!appKey.trim() || !appSecret.trim() || !accountNo.trim()) {
      setError('모든 항목을 입력해주세요');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await AsyncStorage.setItem(
        CREDENTIALS_STORAGE_KEY,
        JSON.stringify({
          app_key: appKey.trim(),
          app_secret: appSecret.trim(),
          account_no: accountNo.trim(),
        })
      );
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      setError('저장 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [appKey, appSecret, accountNo]);

  const handleClear = useCallback(async () => {
    Alert.alert(
      '자격증명 삭제',
      'KIS API 자격증명을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(CREDENTIALS_STORAGE_KEY);
            setAppKey('');
            setAppSecret('');
            setAccountNo('');
          },
        },
      ]
    );
  }, []);

  return (
    <Card title="KIS API 자격증명" testID="credentials-card">
      <Text style={styles.fieldLabel}>App Key</Text>
      <TextInput
        testID="credentials-app-key"
        style={styles.textInput}
        placeholder="KIS App Key 입력"
        placeholderTextColor={Colors.textDisabled}
        value={appKey}
        onChangeText={setAppKey}
        autoCapitalize="none"
        secureTextEntry={false}
      />

      <Text style={styles.fieldLabel}>App Secret</Text>
      <TextInput
        testID="credentials-app-secret"
        style={styles.textInput}
        placeholder="KIS App Secret 입력"
        placeholderTextColor={Colors.textDisabled}
        value={appSecret}
        onChangeText={setAppSecret}
        autoCapitalize="none"
        secureTextEntry
      />

      <Text style={styles.fieldLabel}>계좌번호</Text>
      <TextInput
        testID="credentials-account-no"
        style={styles.textInput}
        placeholder="계좌번호 입력 (예: 50123456-01)"
        placeholderTextColor={Colors.textDisabled}
        value={accountNo}
        onChangeText={setAccountNo}
        autoCapitalize="none"
      />

      {error ? (
        <View testID="credentials-error" style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isSaved ? (
        <View testID="credentials-saved" style={styles.successContainer}>
          <Text style={styles.successText}>저장되었습니다</Text>
        </View>
      ) : null}

      <TouchableOpacity
        testID="credentials-save-button"
        style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
        onPress={handleSave}
        disabled={isLoading}
      >
        <Text style={styles.actionButtonText}>
          {isLoading ? '저장 중...' : '저장'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="credentials-clear-button"
        style={styles.clearButton}
        onPress={handleClear}
      >
        <Text style={styles.clearButtonText}>자격증명 삭제</Text>
      </TouchableOpacity>
    </Card>
  );
}

// ─── ConditionForm ────────────────────────────────────────────────────────────

function ConditionForm() {
  const [executionTime, setExecutionTime] = useState('market_open');
  const [buyCondition, setBuyCondition] = useState('0.7');
  const [sellCondition, setSellCondition] = useState('0.3');
  const [amount, setAmount] = useState('100');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState(null);

  const CONDITION_STORAGE_KEY = 'trading_condition';

  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(CONDITION_STORAGE_KEY);
        if (stored) {
          const cond = JSON.parse(stored);
          setExecutionTime(cond.execution_time || 'market_open');
          setBuyCondition(String(cond.buy_condition || '0.7'));
          setSellCondition(String(cond.sell_condition || '0.3'));
          setAmount(String(cond.amount || '100'));
        }
      } catch (_) {}
    }
    load();
  }, []);

  const handleSave = useCallback(async () => {
    const buyVal = parseFloat(buyCondition);
    const sellVal = parseFloat(sellCondition);
    const amtVal = parseFloat(amount);

    if (isNaN(buyVal) || isNaN(sellVal) || isNaN(amtVal)) {
      setError('숫자 형식이 올바르지 않습니다');
      return;
    }
    setError(null);
    try {
      await AsyncStorage.setItem(
        CONDITION_STORAGE_KEY,
        JSON.stringify({
          execution_time: executionTime,
          buy_condition: buyVal,
          sell_condition: sellVal,
          amount: amtVal,
        })
      );
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (_) {
      setError('저장 중 오류가 발생했습니다');
    }
  }, [executionTime, buyCondition, sellCondition, amount]);

  return (
    <ScrollView scrollEnabled={false}>
      {/* 실행 시간 선택 */}
      <Card title="실행 시간" testID="execution-time-card">
        {EXECUTION_TIMES.map((et) => (
          <TouchableOpacity
            key={et.key}
            testID={`execution-time-${et.key}`}
            style={[
              styles.timeOption,
              executionTime === et.key && styles.timeOptionActive,
            ]}
            onPress={() => setExecutionTime(et.key)}
          >
            <Text
              style={[
                styles.timeOptionText,
                executionTime === et.key && styles.timeOptionTextActive,
              ]}
            >
              {et.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Card>

      {/* 매매 조건 */}
      <Card title="매매 조건" testID="condition-card">
        <Text style={styles.fieldLabel}>매수 임계값 (0.0 ~ 1.0)</Text>
        <TextInput
          testID="buy-condition-input"
          style={styles.textInput}
          placeholder="0.7"
          placeholderTextColor={Colors.textDisabled}
          value={buyCondition}
          onChangeText={setBuyCondition}
          keyboardType="decimal-pad"
        />

        <Text style={styles.fieldLabel}>매도 임계값 (0.0 ~ 1.0)</Text>
        <TextInput
          testID="sell-condition-input"
          style={styles.textInput}
          placeholder="0.3"
          placeholderTextColor={Colors.textDisabled}
          value={sellCondition}
          onChangeText={setSellCondition}
          keyboardType="decimal-pad"
        />

        <Text style={styles.fieldLabel}>매매 금액 (USD)</Text>
        <TextInput
          testID="amount-input"
          style={styles.textInput}
          placeholder="100"
          placeholderTextColor={Colors.textDisabled}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        {error ? (
          <View testID="condition-error" style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isSaved ? (
          <View testID="condition-saved" style={styles.successContainer}>
            <Text style={styles.successText}>저장되었습니다</Text>
          </View>
        ) : null}

        <TouchableOpacity
          testID="condition-save-button"
          style={styles.actionButton}
          onPress={handleSave}
        >
          <Text style={styles.actionButtonText}>저장</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

// ─── TradeLogsTab ─────────────────────────────────────────────────────────────

function TradeLogsTab() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchTradeLogs(null, 20);
      if (result.error) {
        setError(result.error.message || '조회 실패');
      } else {
        setLogs(result.data || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer} testID="logs-loading">
        <ActivityIndicator color={Colors.accentBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer} testID="logs-error">
        <Text style={styles.errorText}>오류: {error}</Text>
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <View style={styles.centerContainer} testID="logs-empty">
        <Text style={styles.emptyText}>실행 로그가 없습니다</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={logs}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.logItem} testID={`log-item-${item.id}`}>
          <View style={styles.logHeader}>
            <Text style={styles.logDate}>{formatDateTime(item.created_at)}</Text>
            <Badge
              testID={`log-status-${item.id}`}
              label={item.status === 'success' ? '성공' : '실패'}
              variant={item.status === 'success' ? 'success' : 'error'}
            />
            {item.action ? (
              <Badge
                testID={`log-action-${item.id}`}
                label={item.action}
                variant={item.action === 'BUY' ? 'buy' : 'sell'}
              />
            ) : null}
          </View>
          {item.ticker ? (
            <Text style={styles.logTicker}>{item.ticker}</Text>
          ) : null}
          {item.message ? (
            <Text style={styles.logMessage}>{item.message}</Text>
          ) : null}
          {item.price != null ? (
            <Text style={styles.logDetail}>
              가격: ${item.price} | 금액: ${item.amount}
            </Text>
          ) : null}
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

// ─── TradingScreen (메인) ─────────────────────────────────────────────────────

export default function TradingScreen() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Settings color={Colors.accentBlue} size={24} />
        <Text style={styles.headerTitle}>자동매매 설정</Text>
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
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 콘텐츠 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'settings' && (
          <View testID="settings-panel">
            <SettingsListTab />
          </View>
        )}
        {activeTab === 'credentials' && (
          <View testID="credentials-panel">
            <CredentialsForm />
          </View>
        )}
        {activeTab === 'condition' && (
          <View testID="condition-panel">
            <ConditionForm />
          </View>
        )}
        {activeTab === 'logs' && (
          <View testID="logs-panel">
            <TradeLogsTab />
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
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accentBlue,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 12,
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
  // 센터 컨테이너
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubText: {
    color: Colors.textDisabled,
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  errorContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
    backgroundColor: `${Colors.error}22`,
    borderRadius: 4,
  },
  successContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
    backgroundColor: `${Colors.success}22`,
    borderRadius: 4,
  },
  successText: {
    color: Colors.success,
    fontSize: 13,
  },
  // 설정 아이템
  settingItem: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginVertical: 4,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTicker: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  settingStrategy: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  settingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  // 버튼
  addButton: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accentBlue,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  addButtonText: {
    color: Colors.accentBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: Colors.accentBlue,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonDisabled: {
    backgroundColor: Colors.bgTertiary,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  clearButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.accentBlue,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 13,
  },
  // 폼 필드
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 8,
  },
  // 실행 시간 옵션
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginBottom: 6,
  },
  timeOptionActive: {
    borderColor: Colors.accentBlue,
    backgroundColor: `${Colors.accentBlue}22`,
  },
  timeOptionText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  timeOptionTextActive: {
    color: Colors.accentBlue,
    fontWeight: '600',
  },
  // 로그
  logItem: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginVertical: 4,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  logDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  logTicker: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  logMessage: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 2,
  },
  logDetail: {
    color: Colors.textDisabled,
    fontSize: 12,
  },
});
