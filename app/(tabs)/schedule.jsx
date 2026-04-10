/**
 * 예약 탭 — 자동매매 설정 + 실행 로그
 */
import { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Switch,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { SegmentControl } from '../../components/tds/SegmentControl';
import { Button } from '../../components/tds/Button';
import { Badge } from '../../components/tds/Badge';
import {
  fetchSettings,
  updateSetting,
  createSetting,
  toggleSetting,
  fetchTradeLogs,
} from '../../lib/tradingApi';
import { sampleSettings, sampleTradeLogs } from '../../lib/sampleData';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'settings', label: '설정' },
  { key: 'logs', label: '로그' },
];

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

const THRESHOLDS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8];

function ScreenHeader() {
  return (
    <View style={styles.screenHeader}>
      <View>
        <Text style={styles.headerEyebrow}>예약 · 자동매매</Text>
        <Text style={styles.headerTitle}>자동매매 예약</Text>
        <Text style={styles.headerSub}>
          설정 상태와 실행 로그를 함께 관리해요
        </Text>
      </View>
      <View style={styles.headerPill}>
        <Text style={styles.headerPillText}>스케줄</Text>
      </View>
    </View>
  );
}

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

// ─── 임계값 셀렉터 ────────────────────────────────────────────────────────────

function ThresholdSelector({ value, onChange }) {
  return (
    <View style={styles.chipRow}>
      {THRESHOLDS.map((t) => {
        const active = value === t;
        return (
          <TouchableOpacity
            key={t}
            onPress={() => onChange(t)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {Math.round(t * 100)}%
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── 설정 서브탭 ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [market, setMarket] = useState('kospi');
  const [period, setPeriod] = useState(30);
  const [buyThreshold, setBuyThreshold] = useState(0.7);
  const [sellThreshold, setSellThreshold] = useState(0.6);
  const [isActive, setIsActive] = useState(false);
  const [settingId, setSettingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useSampleData, setUseSampleData] = useState(false);
  const [notice, setNotice] = useState(null);

  // 기존 설정 불러오기 (최신 1건)
  const loadSetting = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchSettings();
      if (data && data.length > 0) {
        const s = data[0];
        setSettingId(s.id);
        setMarket(s.ticker_group_key || 'kospi');
        setBuyThreshold(parseFloat(s.buy_condition) || 0.7);
        setSellThreshold(parseFloat(s.sell_condition) || 0.6);
        setIsActive(s.is_active ?? false);
      }
      setUseSampleData(false);
      setNotice(null);
    } catch (_) {
      const s = sampleSettings[0];
      setSettingId(s.id);
      setMarket(s.ticker_group_key || 'kospi');
      setBuyThreshold(parseFloat(s.buy_condition) || 0.7);
      setSellThreshold(parseFloat(s.sell_condition) || 0.6);
      setIsActive(s.is_active ?? false);
      setUseSampleData(true);
      setNotice('자동매매 설정은 샘플 상태로 먼저 보여주고 있어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSetting();
  }, [loadSetting]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (useSampleData) {
        Alert.alert(
          '저장 확인',
          '샘플 설정을 저장한 것처럼 화면에 반영했어요.',
        );
        return;
      }
      const payload = {
        ticker_group_key: market,
        buy_condition: buyThreshold,
        sell_condition: sellThreshold,
        is_active: isActive,
        name: `자동매매_${market}`,
        ai_model_key: 'xgboost',
        trade_enabled: isActive,
      };
      if (settingId) {
        await updateSetting(settingId, payload);
      } else {
        const { data } = await createSetting(payload);
        if (data) setSettingId(data.id);
      }
      Alert.alert('저장 완료', '자동매매 설정이 저장되었습니다.');
    } catch (e) {
      Alert.alert('저장 실패', e.message);
    } finally {
      setSaving(false);
    }
  }, [settingId, market, period, buyThreshold, sellThreshold, isActive]);

  const handleToggle = useCallback(
    async (val) => {
      setIsActive(val);
      if (useSampleData) return;
      if (settingId) {
        try {
          await toggleSetting(settingId, val);
        } catch (e) {
          Alert.alert('토글 실패', e.message);
          setIsActive(!val);
        }
      }
    },
    [settingId, useSampleData],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tdsColors.blue500} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {notice && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}

      {/* 현재 설정 요약 카드 */}
      <View style={styles.activeCard}>
        <View style={styles.activeCardRow}>
          <Text style={styles.activeCardTitle}>현재 설정</Text>
          <Badge
            color={isActive ? 'blue' : 'orange'}
            size="small"
            variant={isActive ? 'fill' : 'weak'}
          >
            {isActive ? '실행 중' : '대기'}
          </Badge>
        </View>
        <View style={styles.activeCardInfo}>
          <Text style={styles.activeCardItem}>
            {MARKETS.find((m) => m.key === market)?.label ?? market}
          </Text>
          <Text style={styles.activeCardSep}>·</Text>
          <Text style={styles.activeCardItem}>{period}일</Text>
          <Text style={styles.activeCardSep}>·</Text>
          <Text style={styles.activeCardItem}>XGBoost</Text>
          <Text style={styles.activeCardSep}>·</Text>
          <Text style={styles.activeCardItem}>
            매수 {Math.round(buyThreshold * 100)}%↑
          </Text>
          <Text style={styles.activeCardSep}>·</Text>
          <Text style={styles.activeCardItem}>
            매도 {Math.round(sellThreshold * 100)}%↑
          </Text>
        </View>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 4 }]}>시장</Text>
      <ChipSelector options={MARKETS} value={market} onChange={setMarket} />

      <Text style={[styles.fieldLabel, { marginTop: 20 }]}>기간</Text>
      <ChipSelector options={PERIODS} value={period} onChange={setPeriod} />

      <Text style={[styles.fieldLabel, { marginTop: 20 }]}>모델</Text>
      <View style={styles.modelBadge}>
        <Badge color="blue" size="medium">
          XGBoost
        </Badge>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 20 }]}>매수 임계값</Text>
      <ThresholdSelector value={buyThreshold} onChange={setBuyThreshold} />

      <Text style={[styles.fieldLabel, { marginTop: 20 }]}>매도 임계값</Text>
      <ThresholdSelector value={sellThreshold} onChange={setSellThreshold} />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>자동매매 ON/OFF</Text>
        <Switch
          value={isActive}
          onValueChange={handleToggle}
          trackColor={{ false: tdsDark.border, true: tdsColors.blue500 }}
          thumbColor={tdsColors.white}
        />
      </View>

      <Button
        onPress={handleSave}
        display="full"
        loading={saving}
        style={{ marginTop: 24 }}
      >
        저장
      </Button>
    </ScrollView>
  );
}

// ─── 로그 서브탭 ──────────────────────────────────────────────────────────────

function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await fetchTradeLogs(null, 50);
      if (err) throw new Error(err.message);
      setLogs(data || []);
      setNotice(null);
    } catch (e) {
      setLogs(sampleTradeLogs);
      setNotice('실행 로그는 샘플 데이터로 먼저 보여주고 있어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tdsColors.blue500} />
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>아직 실행된 로그가 없어요</Text>
        <Text style={styles.emptyDesc}>
          자동매매를 활성화하면 실행 기록이 여기에 쌓여요
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {notice && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}
      <View style={styles.logStats}>
        <Text style={styles.logStatsText}>
          전체 {logs.length}건 · 매수{' '}
          {logs.filter((l) => l.action === 'buy').length}건 · 매도{' '}
          {logs.filter((l) => l.action === 'sell').length}건
        </Text>
      </View>
      {logs.map((log) => (
        <View key={log.id} style={styles.logRow}>
          <View style={styles.logLeft}>
            <Text style={styles.logTime}>{formatDateTime(log.created_at)}</Text>
            <Text style={styles.logTicker}>{log.ticker ?? '-'}</Text>
          </View>
          <View style={styles.logRight}>
            {log.action && (
              <Badge
                color={log.action === 'buy' ? 'red' : 'green'}
                size="small"
                variant="weak"
              >
                {log.action === 'buy' ? '매수' : '매도'}
              </Badge>
            )}
            {log.price != null && (
              <Text style={styles.logPrice}>
                ₩{log.price.toLocaleString('ko-KR')}
              </Text>
            )}
            {log.message && <Text style={styles.logMsg}>{log.message}</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader />
      <SegmentControl
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {activeTab === 'settings' ? <SettingsTab /> : <LogsTab />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  screenHeader: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  headerPillText: { fontSize: 12, color: tdsColors.blue700, fontWeight: '700' },
  tabContent: { paddingHorizontal: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
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
  chipText: { fontSize: 13, color: tdsDark.textSecondary },
  chipTextActive: { color: tdsColors.blue500, fontWeight: '600' },

  modelBadge: { marginBottom: 4 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  toggleLabel: { fontSize: 15, color: tdsDark.textPrimary, fontWeight: '500' },

  // 로그
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: tdsDark.bgCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  logLeft: { flex: 1 },
  logRight: { alignItems: 'flex-end', gap: 4 },
  logTime: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 2 },
  logTicker: { fontSize: 15, fontWeight: '600', color: tdsDark.textPrimary },
  logPrice: { fontSize: 13, color: tdsDark.textSecondary, marginTop: 4 },
  logMsg: { fontSize: 11, color: tdsDark.textTertiary, maxWidth: 180 },

  emptyText: { color: tdsDark.textSecondary, fontSize: 14 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: tdsDark.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  activeCard: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  activeCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsDark.textPrimary,
  },
  activeCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  activeCardItem: { fontSize: 13, color: tdsDark.textSecondary },
  activeCardSep: { fontSize: 13, color: tdsDark.border },

  logStats: {
    paddingVertical: 10,
    marginBottom: 4,
  },
  logStatsText: { fontSize: 13, color: tdsDark.textSecondary },
  tabContentLogs: { paddingBottom: 32 },
  logList: { backgroundColor: tdsDark.bgCard, marginTop: 8 },
});
