/**
 * 예약 탭 — 자동매매 설정 목록
 * 설정을 선택하면 /schedule-detail 로 이동 (로그 + 상위 10개 종목)
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { Badge } from '../../components/tds/Badge';
import { Button } from '../../components/tds/Button';
import {
  fetchSettings,
  createSetting,
  updateSetting,
  deleteSetting,
  toggleSetting,
} from '../../lib/tradingApi';
import { sampleSettings } from '../../lib/sampleData';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const MARKET_TIME_LABELS = {
  market_open:       '장 시작 (9:30 ET)',
  market_open_30m:   '장 시작 30분 후 (10:00 ET)',
  market_open_1h:    '장 시작 1시간 후 (10:30 ET)',
  market_close_2h:   '장 마감 2시간 전 (14:00 ET)',
  market_close_1h:   '장 마감 1시간 전 (15:00 ET)',
  market_close_30m:  '장 마감 30분 전 (15:30 ET)',
  market_close:      '장 마감 (16:00 ET)',
};

const TICKER_GROUP_LABELS = {
  usall:        'US 나스닥+뉴욕 전체',
  sp500:        'S&P 500',
  qqq:          'QQQ (나스닥100)',
  nasdaq100:    '나스닥100',
  superinvestor:'슈퍼인베스터',
  myholdings:   '보유종목',
  kospi:        'KOSPI',
  kosdaq:       'KOSDAQ',
  nasdaq:       'NASDAQ',
  nyse:         'NYSE',
};

const DEFAULT_FORM = {
  name: '',
  execution_time: 'market_close_1h',
  ticker_group_key: 'usall',
  buy_condition: '60',
  sell_condition: '30',
  is_active: true,
  trade_enabled: false,
};

const EXECUTION_TIMES = Object.entries(MARKET_TIME_LABELS).map(([key, label]) => ({ key, label }));
const TICKER_GROUPS = Object.entries(TICKER_GROUP_LABELS).map(([key, label]) => ({ key, label }));

// ─── 설정 폼 모달 ─────────────────────────────────────────────────────────────

function SettingFormModal({ visible, onClose, onSaved, editItem }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editItem) {
        setForm({
          name: editItem.name || '',
          execution_time: editItem.execution_time || 'market_close_1h',
          ticker_group_key: editItem.ticker_group_key || 'usall',
          buy_condition: String(editItem.buy_condition ?? '60'),
          sell_condition: String(editItem.sell_condition ?? '30'),
          is_active: editItem.is_active ?? true,
          trade_enabled: editItem.trade_enabled ?? false,
        });
      } else {
        setForm(DEFAULT_FORM);
      }
    }
  }, [visible, editItem]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('입력 오류', '설정 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        execution_time: form.execution_time,
        ticker_group_key: form.ticker_group_key,
        buy_condition: parseFloat(form.buy_condition) || 60,
        sell_condition: parseFloat(form.sell_condition) || 30,
        is_active: form.is_active,
        trade_enabled: form.trade_enabled,
        ai_model_key: 'xgboost',
      };
      if (editItem) {
        await updateSetting(editItem.id, payload);
      } else {
        await createSetting(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      Alert.alert('저장 실패', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          {/* 헤더 */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.modalCancel}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editItem ? '설정 수정' : '새 예약 추가'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={8}>
              {saving
                ? <ActivityIndicator size="small" color={tdsColors.blue500} />
                : <Text style={styles.modalSave}>저장</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* 설정 이름 */}
            <Text style={styles.fieldLabel}>설정 이름 (Alias)</Text>
            <TextInput
              style={styles.textInput}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="예: 자동매매_usall"
              placeholderTextColor={tdsDark.textTertiary}
            />

            {/* 실행 시간 */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>실행 시간</Text>
            <View style={styles.chipGrid}>
              {EXECUTION_TIMES.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setForm((p) => ({ ...p, execution_time: key }))}
                  style={[styles.chip, form.execution_time === key && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, form.execution_time === key && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 티커 그룹 */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>티커 그룹 (Target)</Text>
            <View style={styles.chipGrid}>
              {TICKER_GROUPS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setForm((p) => ({ ...p, ticker_group_key: key }))}
                  style={[styles.chip, form.ticker_group_key === key && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, form.ticker_group_key === key && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 매수/매도 조건 */}
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.fieldLabel}>매수 확률 (%)</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.buy_condition}
                  onChangeText={(v) => setForm((p) => ({ ...p, buy_condition: v }))}
                  keyboardType="numeric"
                  placeholder="60"
                  placeholderTextColor={tdsDark.textTertiary}
                />
              </View>
              <View style={[styles.halfInput, { marginLeft: 12 }]}>
                <Text style={styles.fieldLabel}>매도 확률 (%)</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.sell_condition}
                  onChangeText={(v) => setForm((p) => ({ ...p, sell_condition: v }))}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={tdsDark.textTertiary}
                />
              </View>
            </View>

            {/* 스케줄 ON/OFF */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>스케줄 활성화</Text>
                <Text style={styles.toggleSub}>정해진 시간에 자동으로 분석을 시작합니다</Text>
              </View>
              <Switch
                value={form.is_active}
                onValueChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                trackColor={{ false: tdsDark.border, true: tdsColors.blue500 }}
                thumbColor={tdsColors.white}
              />
            </View>

            {/* 실제매매 ON/OFF */}
            <View style={[styles.toggleRow, { marginTop: 12 }]}>
              <View>
                <Text style={[styles.toggleLabel, { color: tdsColors.orange500 }]}>실제 매매 활성화</Text>
                <Text style={styles.toggleSub}>체크 해제 시 리포트만 발송됩니다</Text>
              </View>
              <Switch
                value={form.trade_enabled}
                onValueChange={(v) => setForm((p) => ({ ...p, trade_enabled: v }))}
                trackColor={{ false: tdsDark.border, true: tdsColors.orange500 }}
                thumbColor={tdsColors.white}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── 설정 카드 ────────────────────────────────────────────────────────────────

function SettingCard({ item, onToggle, onEdit, onDelete, onPress }) {
  const timeLabel = MARKET_TIME_LABELS[item.execution_time] ?? item.execution_time;
  const groupLabel = TICKER_GROUP_LABELS[item.ticker_group_key] ?? item.ticker_group_key;

  const handleDelete = () => {
    Alert.alert('설정 삭제', `"${item.name}"을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      {/* 이름 + 스케줄 뱃지 */}
      <View style={styles.cardTop}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardBadges}>
          <Badge color={item.is_active ? 'blue' : 'grey'} size="small" variant={item.is_active ? 'fill' : 'weak'}>
            {item.is_active ? 'ON' : 'OFF'}
          </Badge>
          {item.trade_enabled && (
            <Badge color="orange" size="small" variant="fill">실매매</Badge>
          )}
        </View>
      </View>

      {/* 상세 정보 */}
      <View style={styles.cardInfo}>
        <Ionicons name="time-outline" size={12} color={tdsDark.textTertiary} />
        <Text style={styles.cardInfoText}>{timeLabel}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Ionicons name="bar-chart-outline" size={12} color={tdsDark.textTertiary} />
        <Text style={styles.cardInfoText}>{groupLabel}</Text>
      </View>
      <View style={styles.cardCondRow}>
        <Text style={styles.cardCond}>매수 {item.buy_condition}% 이상</Text>
        <Text style={styles.cardCondSep}>·</Text>
        <Text style={styles.cardCond}>매도 {item.sell_condition}% 이하</Text>
      </View>

      {/* 액션 버튼 */}
      <View style={styles.cardActions}>
        <Switch
          value={item.is_active}
          onValueChange={(v) => onToggle(item.id, v)}
          trackColor={{ false: tdsDark.border, true: tdsColors.blue500 }}
          thumbColor={tdsColors.white}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="create-outline" size={18} color={tdsDark.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={tdsColors.red500} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useSample, setUseSample] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchSettings();
      if (error) throw new Error(error.message);
      setSettings(data || []);
      setUseSample(false);
    } catch {
      setSettings(sampleSettings);
      setUseSample(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id, val) => {
    setSettings((prev) => prev.map((s) => s.id === id ? { ...s, is_active: val } : s));
    if (useSample) return;
    try {
      await toggleSetting(id, val);
    } catch (e) {
      Alert.alert('변경 실패', e.message);
      setSettings((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !val } : s));
    }
  };

  const handleDelete = async (id) => {
    if (useSample) {
      setSettings((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    try {
      await deleteSetting(id);
      setSettings((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      Alert.alert('삭제 실패', e.message);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditItem(null);
    setModalVisible(true);
  };

  const handlePress = (item) => {
    router.push({
      pathname: '/schedule-detail',
      params: {
        settingId: item.id,
        settingName: item.name,
        targetGroup: item.ticker_group_key,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>예약 · 자동매매</Text>
          <Text style={styles.headerTitle}>자동매매 예약</Text>
        </View>
      </View>

      {/* + 예약 버튼 (모델 탭과 동일 스타일) */}
      <TouchableOpacity style={styles.addRow} onPress={handleAdd} activeOpacity={0.7}>
        <Ionicons name="add-circle-outline" size={18} color={tdsColors.blue500} />
        <Text style={styles.addRowText}>예약</Text>
      </TouchableOpacity>

      {useSample && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>샘플 데이터로 보여주고 있어요. Supabase 연결 시 실제 데이터가 표시됩니다.</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tdsColors.blue500} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.sectionTitle}>시나리오 목록</Text>
          <Text style={styles.sectionSub}>등록된 자동 매매 설정 리스트입니다.</Text>

          {settings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={36} color={tdsDark.textTertiary} />
              <Text style={styles.emptyTitle}>등록된 예약이 없어요</Text>
              <Text style={styles.emptyDesc}>우측 상단 [+ 예약] 버튼으로 추가해보세요</Text>
            </View>
          ) : (
            settings.map((item) => (
              <SettingCard
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPress={handlePress}
              />
            ))
          )}
        </ScrollView>
      )}

      <SettingFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={load}
        editItem={editItem}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },

  header: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  headerEyebrow: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: tdsDark.textPrimary, letterSpacing: -0.5 },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: `${tdsColors.blue500}15`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${tdsColors.blue500}30`,
  },
  addRowText: { fontSize: 14, fontWeight: '600', color: tdsColors.blue500 },

  noticeBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tdsColors.blue50,
    borderRadius: 12,
  },
  noticeText: { fontSize: 12, color: tdsColors.blue700, lineHeight: 17 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: tdsDark.textPrimary, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: tdsDark.textPrimary },
  emptyDesc: { fontSize: 13, color: tdsDark.textSecondary, textAlign: 'center' },

  // 카드
  card: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardName: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary, flex: 1, marginRight: 8 },
  cardBadges: { flexDirection: 'row', gap: 6 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  cardInfoText: { fontSize: 12, color: tdsDark.textTertiary },
  cardCondRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cardCond: { fontSize: 12, color: tdsDark.textSecondary },
  cardCondSep: { fontSize: 12, color: tdsDark.border },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tdsDark.border,
  },
  actionBtn: { padding: 6 },

  // 모달
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: tdsDark.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  modalCancel: { fontSize: 15, color: tdsDark.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary },
  modalSave: { fontSize: 15, fontWeight: '700', color: tdsColors.blue500 },
  modalBody: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },

  fieldLabel: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 8 },
  textInput: {
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: tdsDark.textPrimary,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tdsDark.border,
    backgroundColor: tdsDark.bgSecondary,
  },
  chipActive: { borderColor: tdsColors.blue500, backgroundColor: `${tdsColors.blue500}1A` },
  chipText: { fontSize: 12, color: tdsDark.textSecondary },
  chipTextActive: { color: tdsColors.blue500, fontWeight: '600' },

  rowInputs: { flexDirection: 'row', marginTop: 20 },
  halfInput: { flex: 1 },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: tdsDark.bgSecondary,
    padding: 14,
    borderRadius: 16,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary, marginBottom: 2 },
  toggleSub: { fontSize: 12, color: tdsDark.textTertiary },
});
