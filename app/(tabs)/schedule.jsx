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
  { key: 'logs',     label: '로그' },
];

const MARKETS = [
  { key: 'kospi',         label: 'KOSPI' },
  { key: 'kosdaq',        label: 'KOSDAQ' },
  { key: 'nasdaq',        label: 'NASDAQ' },
  { key: 'nyse',          label: 'NYSE' },
];

const PERIODS = [
  { key: 7,  label: '7일' },
  { key: 14, label: '14일' },
  { key: 30, label: '30일' },
  { key: 60, label: '60일' },
];

const THRESHOLDS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8];

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
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSetting(); }, [loadSetting]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (useSampleData) {
        Alert.alert('저장 확인', '샘플 설정을 저장한 것처럼 화면에 반영했어요.');
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

  const handleToggle = useCallback(async (val) => {
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
  }, [settingId, useSampleData]);

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
      <Text style={styles.fieldLabel}>시장</Text>
      <ChipSelector options={MARKETS} value={market} onChange={setMarket} />

      <Text style={[styles.fieldLabel, { marginTop: 20 }]}>기간</Text>
      <ChipSelector options={PERIODS} value={period} onChange={setPeriod} />

      <Text style={[styles.fieldLabel, { marginTop: 20 }]}>모델</Text>
      <View style={styles.modelBadge}>
        <Badge color="blue" size="medium">XGBoost</Badge>
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
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
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

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={tdsColors.blue500} /></View>;
  }

  if (logs.length === 0) {
    return <View style={styles.center}><Text style={styles.emptyText}>로그가 없습니다</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {notice && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}
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
              <Text style={styles.logPrice}>₩{log.price.toLocaleString('ko-KR')}</Text>
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
  tabContent: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
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
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: tdsDark.bgCard,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  logLeft: { flex: 1 },
  logRight: { alignItems: 'flex-end', gap: 4 },
  logTime: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 2 },
  logTicker: { fontSize: 15, fontWeight: '600', color: tdsDark.textPrimary },
  logPrice: { fontSize: 13, color: tdsDark.textSecondary, marginTop: 4 },
  logMsg: { fontSize: 11, color: tdsDark.textTertiary, maxWidth: 180 },

  emptyText: { color: tdsDark.textSecondary, fontSize: 14 },
});
