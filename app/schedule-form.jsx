/**
 * 예약 생성 / 수정 화면
 * router.push('/schedule-form')           → 신규 생성
 * router.push('/schedule-form', { id, …}) → 수정
 */
import { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../constants/tdsColors';
import { createSetting, updateSetting, deleteSettingCascade, fetchAiModels } from '../lib/tradingApi';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const EXECUTION_TIMES = [
  { key: 'market_open',      label: '장 시작 (9:30 ET)' },
  { key: 'market_open_30m',  label: '장 시작 30분 후 (10:00 ET)' },
  { key: 'market_open_1h',   label: '장 시작 1시간 후 (10:30 ET)' },
  { key: 'market_close_2h',  label: '장 마감 2시간 전 (14:00 ET)' },
  { key: 'market_close_1h',  label: '장 마감 1시간 전 (15:00 ET)' },
  { key: 'market_close_30m', label: '장 마감 30분 전 (15:30 ET)' },
  { key: 'market_close',     label: '장 마감 (16:00 ET)' },
];

const TICKER_GROUPS = [
  { key: 'usall',         label: 'US 나스닥+뉴욕 전체' },
  { key: 'sp500',         label: 'S&P 500' },
  { key: 'qqq',           label: 'QQQ (나스닥100)' },
  { key: 'nasdaq100',     label: '나스닥100' },
  { key: 'superinvestor', label: '슈퍼인베스터' },
  { key: 'myholdings',    label: '보유종목' },
  { key: 'kospi',         label: 'KOSPI' },
  { key: 'kosdaq',        label: 'KOSDAQ' },
];

const DEFAULT_FORM = {
  name: '',
  execution_time: 'market_close_1h',
  ticker_group_key: 'usall',
  ai_model_key: 'xgboost',
  buy_condition: '60',
  sell_condition: '30',
  is_active: true,
  trade_enabled: false,
};

// ─── 칩 셀렉터 ───────────────────────────────────────────────────────────────

function ChipSelector({ options, value, onChange }) {
  return (
    <View style={styles.chipGrid}>
      {options.map(({ key, label }) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function ScheduleFormScreen() {
  const params = useLocalSearchParams();
  const isEdit = !!params.settingId;

  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiModels, setAiModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // 수정 모드일 때 기존 값 세팅
  useEffect(() => {
    // AI 모델 목록 로드
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const { data } = await fetchAiModels();
        if (data) setAiModels(data);
      } catch (e) {
        console.warn('AI 모델 로드 실패:', e.message);
      } finally {
        setLoadingModels(false);
      }
    };

    loadModels();

    if (isEdit) {
      setForm({
        name: params.settingName ?? '',
        execution_time: params.execution_time ?? 'market_close_1h',
        ticker_group_key: params.ticker_group_key ?? 'usall',
        ai_model_key: params.ai_model_key ?? 'xgboost',
        buy_condition: String(params.buy_condition ?? '60'),
        sell_condition: String(params.sell_condition ?? '30'),
        is_active: params.is_active === 'true' || params.is_active === true,
        trade_enabled: params.trade_enabled === 'true' || params.trade_enabled === true,
      });
    }
  }, []);

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const handleDelete = () => {
    Alert.alert(
      '설정 삭제',
      `"${params.settingName}" 설정과 관련 로그(실행 기록, TOP10 종목)를 모두 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await deleteSettingCascade(params.settingId);
              if (error) throw new Error(error.message);
              router.dismissAll();
            } catch (e) {
              Alert.alert('삭제 실패', e.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('입력 오류', '설정 이름을 입력해주세요.');
      return;
    }
    if (!form.ai_model_key) {
      Alert.alert('입력 오류', 'AI 모델을 선택해주세요.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        execution_time: form.execution_time,
        ticker_group_key: form.ticker_group_key,
        ai_model_key: form.ai_model_key,
        buy_condition: parseFloat(form.buy_condition) || 60,
        sell_condition: parseFloat(form.sell_condition) || 30,
        is_active: form.is_active,
        trade_enabled: form.trade_enabled,
      };
      if (isEdit) {
        await updateSetting(params.settingId, payload);
      } else {
        await createSetting(payload);
      }
      Alert.alert('저장되었습니다.', '', [{ text: '확인', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('저장 실패', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={tdsDark.textPrimary} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? '설정 수정' : '새 예약 추가'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn} hitSlop={8}>
          {saving
            ? <ActivityIndicator size="small" color={tdsColors.blue500} />
            : <Text style={styles.saveText}>저장</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* 설정 이름 */}
        <Text style={styles.fieldLabel}>설정 이름 (Alias)</Text>
        <TextInput
          style={styles.textInput}
          value={form.name}
          onChangeText={set('name')}
          placeholder="예: 자동매매_usall"
          placeholderTextColor={tdsDark.textTertiary}
        />

        {/* 실행 시간 */}
        <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>실행 시간</Text>
        <ChipSelector options={EXECUTION_TIMES} value={form.execution_time} onChange={set('execution_time')} />

        {/* 티커 그룹 */}
        <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>티커 그룹 (Target)</Text>
        <ChipSelector options={TICKER_GROUPS} value={form.ticker_group_key} onChange={set('ticker_group_key')} />

        {/* AI 모델 선택 */}
        <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>AI 모델 (Model Key)</Text>
        {loadingModels ? (
          <ActivityIndicator size="large" color={tdsColors.blue500} style={{ marginVertical: 16 }} />
        ) : (
          <View>
            <TouchableOpacity
              style={[styles.modelSelector, !form.ai_model_key && { borderColor: tdsColors.red500 }]}
              activeOpacity={0.7}
            >
              <Text style={styles.modelSelectorText}>
                {form.ai_model_key
                  ? aiModels.find(m => m.id === form.ai_model_key)?.name || form.ai_model_key
                  : '모델 선택 (필수)'}
              </Text>
            </TouchableOpacity>
            <ScrollView style={styles.modelList} scrollEnabled={aiModels.length > 3}>
              {aiModels.length === 0 ? (
                <Text style={styles.noModels}>저장된 모델이 없습니다.</Text>
              ) : (
                aiModels.map((model) => {
                  const isSelected = form.ai_model_key === model.id;
                  return (
                    <TouchableOpacity
                      key={model.id}
                      onPress={() => set('ai_model_key')(model.id)}
                      style={[styles.modelItem, isSelected && styles.modelItemSelected]}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modelItemName, isSelected && styles.modelItemNameSelected]}>
                          {model.name || model.id}
                        </Text>
                        <Text style={styles.modelItemMeta}>
                          {new Date(model.created_at).toLocaleDateString('ko-KR')} · 정확도: {((model.accuracy || 0) * 100).toFixed(1)}%
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={tdsColors.blue500} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {/* 매수 / 매도 조건 */}
        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <Text style={styles.fieldLabel}>매수 확률 (%)</Text>
            <TextInput
              style={styles.textInput}
              value={form.buy_condition}
              onChangeText={set('buy_condition')}
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
              onChangeText={set('sell_condition')}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={tdsDark.textTertiary}
            />
          </View>
        </View>

        {/* 스케줄 ON/OFF */}
        <View style={[styles.toggleRow, styles.fieldLabelTop]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>스케줄 활성화</Text>
            <Text style={styles.toggleSub}>정해진 시간에 자동으로 분석을 시작합니다</Text>
          </View>
          <Switch
            value={form.is_active}
            onValueChange={set('is_active')}
            trackColor={{ false: tdsDark.border, true: tdsColors.blue500 }}
            thumbColor={tdsColors.white}
          />
        </View>

        {/* 실제매매 ON/OFF */}
        <View style={[styles.toggleRow, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: tdsColors.orange500 }]}>실제 매매 활성화</Text>
            <Text style={styles.toggleSub}>체크 해제 시 리포트만 발송됩니다</Text>
          </View>
          <Switch
            value={form.trade_enabled}
            onValueChange={set('trade_enabled')}
            trackColor={{ false: tdsDark.border, true: tdsColors.orange500 }}
            thumbColor={tdsColors.white}
          />
        </View>

        {/* 삭제 버튼 — 수정 모드에서만 표시 */}
        {isEdit && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.7}
          >
            {deleting
              ? <ActivityIndicator size="small" color={tdsColors.red500} />
              : <Text style={styles.deleteBtnText}>이 설정 삭제</Text>}
          </TouchableOpacity>
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
  saveBtn: { minWidth: 60, alignItems: 'flex-end' },
  saveText: { fontSize: 15, fontWeight: '700', color: tdsColors.blue500 },

  body: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 48 },

  fieldLabel: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 8 },
  fieldLabelTop: { marginTop: 24 },

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

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tdsDark.border,
    backgroundColor: tdsDark.bgCard,
  },
  chipActive: { borderColor: tdsColors.blue500, backgroundColor: `${tdsColors.blue500}1A` },
  chipText: { fontSize: 12, color: tdsDark.textSecondary },
  chipTextActive: { color: tdsColors.blue500, fontWeight: '600' },

  modelSelector: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  modelSelectorText: { fontSize: 15, color: tdsDark.textPrimary },

  modelList: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tdsDark.border,
    maxHeight: 200,
    marginTop: 8,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  modelItemSelected: { backgroundColor: `${tdsColors.blue500}0D` },
  modelItemName: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 2 },
  modelItemNameSelected: { color: tdsColors.blue500, fontWeight: '600' },
  modelItemMeta: { fontSize: 11, color: tdsDark.textTertiary },
  noModels: { fontSize: 13, color: tdsDark.textTertiary, padding: 12, textAlign: 'center' },

  rowInputs: { flexDirection: 'row', marginTop: 24 },
  halfInput: { flex: 1 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tdsDark.bgCard,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tdsDark.border,
    gap: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary, marginBottom: 2 },
  toggleSub: { fontSize: 12, color: tdsDark.textTertiary },

  deleteBtn: {
    marginTop: 40,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tdsColors.red500,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: tdsColors.red500 },
});
