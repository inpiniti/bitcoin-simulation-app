/**
 * S&P 500 뉴스 분석 설정 화면
 * - XGBoost 모델 선택 (선택)
 * - RL 모델 선택 (선택)
 * - 뉴스 파이프라인 활성화 토글
 */
import { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../constants/tdsColors';
import { BottomSheet } from '../components/tds/BottomSheet';
import { fetchSettings, createSetting, updateSetting, fetchAiModels } from '../lib/tradingApi';

function SelectField({ label, value, placeholder, onPress, disabled = false }) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectField, disabled && styles.selectFieldDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectFieldText, !value && styles.selectFieldPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={tdsDark.textTertiary} />
      </TouchableOpacity>
    </>
  );
}

export default function NewsSettingsScreen() {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiModels, setAiModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [pickerKey, setPickerKey] = useState(null);
  const [isActive, setIsActive] = useState(true);

  // AI 모델 로드
  useEffect(() => {
    (async () => {
      setLoadingModels(true);
      try {
        const { data } = await fetchAiModels();
        if (data) setAiModels(data);
      } catch (e) {
        console.warn('AI 모델 로드 실패:', e.message);
      } finally {
        setLoadingModels(false);
      }
    })();
  }, []);

  // 기존 설정 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await fetchSettings();
        const existing = data?.find(s => s.ticker_group_key === 'sp500_news');
        if (existing) {
          setSetting(existing);
          setIsActive(existing.is_active ?? true);
        } else {
          setSetting(null);
        }
      } catch (e) {
        console.warn('설정 로드 실패:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const xgbModels = aiModels.filter((m) => (m.model_json?.type || 'xgb') !== 'rl');
  const rlModels = aiModels.filter((m) => m.model_json?.type === 'rl');
  const selectedXgbModel = aiModels.find((m) => m.id === setting?.ai_model_key);
  const selectedRlModel = rlModels.find((m) => m.id === setting?.rl_model_key);

  const pickerTitle =
    pickerKey === 'ai_model_key'
      ? 'XGBoost 모델 선택'
      : 'RL 모델 선택';

  const pickerOptions =
    pickerKey === 'ai_model_key'
      ? [
          { key: '__none__', label: '사용 안 함' },
          ...xgbModels.map((m) => ({
            key: m.id,
            label: m.name || m.id,
            meta: `${new Date(m.created_at).toLocaleDateString('ko-KR')} · 정확도: ${((m.accuracy || 0) * 100).toFixed(1)}%`,
          })),
        ]
      : [
          { key: '__none__', label: '사용 안 함' },
          ...rlModels.map((m) => ({
            key: m.id,
            label: m.name || m.id,
            meta: `${new Date(m.created_at).toLocaleDateString('ko-KR')} · 승률: ${((m.accuracy || 0) * 100).toFixed(1)}%`,
          })),
        ];

  const selectedPickerValue =
    pickerKey === 'ai_model_key'
      ? (setting?.ai_model_key || '__none__')
      : pickerKey === 'rl_model_key'
        ? (setting?.rl_model_key || '__none__')
        : null;

  const handleSelectPickerOption = (value) => {
    if (!pickerKey) return;
    setSetting((p) => ({
      ...p,
      [pickerKey]: value === '__none__' ? null : value,
    }));
    setPickerKey(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: '뉴스 분석 설정',
        ticker_group_key: 'sp500_news',
        execution_time: 'market_close_1h',
        ai_model_key: setting?.ai_model_key || null,
        rl_model_key: setting?.rl_model_key || null,
        buy_condition: 60,
        sell_condition: 30,
        is_active: isActive,
        trade_enabled: false,
      };

      if (setting?.id) {
        await updateSetting(setting.id, payload);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={tdsColors.blue500} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={tdsDark.textPrimary} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>뉴스 분석 설정</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn} hitSlop={8}>
          {saving
            ? <ActivityIndicator size="small" color={tdsColors.blue500} />
            : <Text style={styles.saveText}>저장</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* 설명 박스 */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color={tdsColors.blue500} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            뉴스 기반 S&P 500 종목 분석을 위한 AI 모델을 선택합니다.{'\n'}
            • XGBoost, RL 모델은 선택 사항이에요{'\n'}
            • TimesFM · Chronos · Moirai는 자동으로 동작해요
          </Text>
        </View>

        {/* XGBoost 모델 선택 */}
        <View style={styles.fieldLabelTop}>
          <SelectField
            label="XGBoost 모델 (선택)"
            value={selectedXgbModel?.name || null}
            placeholder={loadingModels ? '로딩 중...' : '사용 안 함 (선택)'}
            onPress={() => setPickerKey('ai_model_key')}
            disabled={loadingModels}
          />
        </View>

        {/* RL 모델 선택 */}
        <View style={styles.fieldLabelTop}>
          <SelectField
            label="강화학습 모델 (선택)"
            value={selectedRlModel?.name || null}
            placeholder={loadingModels ? '로딩 중...' : '사용 안 함 (선택)'}
            onPress={() => setPickerKey('rl_model_key')}
            disabled={loadingModels}
          />
        </View>

        {/* 활성화 토글 */}
        <View style={[styles.toggleRow, styles.fieldLabelTop]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>뉴스 분석 활성화</Text>
            <Text style={styles.toggleSub}>매일 06:00 KST에 자동 실행됩니다</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: tdsDark.border, true: tdsColors.blue500 }}
            thumbColor={tdsColors.white}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 바텀시트 */}
      <BottomSheet
        open={!!pickerKey}
        onClose={() => setPickerKey(null)}
        title={pickerTitle}
      >
        <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent}>
          {pickerOptions.map((option) => {
            const selected = selectedPickerValue === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.sheetOption, selected && styles.sheetOptionSelected]}
                onPress={() => handleSelectPickerOption(option.key)}
                activeOpacity={0.7}
              >
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={[styles.sheetOptionText, selected && styles.sheetOptionTextSelected]}>
                    {option.label}
                  </Text>
                  {option.meta && (
                    <Text style={styles.sheetOptionMeta}>{option.meta}</Text>
                  )}
                </View>
                {selected && <Ionicons name="checkmark" size={18} color={tdsColors.blue500} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60 },
  backText: { fontSize: 15, color: tdsDark.textPrimary },
  headerTitle: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary },
  saveBtn: { minWidth: 60, alignItems: 'flex-end' },
  saveText: { fontSize: 15, fontWeight: '700', color: tdsColors.blue500 },

  body: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 48 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${tdsColors.blue500}12`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: tdsColors.blue600,
    lineHeight: 18,
  },

  fieldLabel: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 8 },
  fieldLabelTop: { marginTop: 24 },

  selectField: {
    minHeight: 48,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: tdsDark.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectFieldDisabled: { opacity: 0.55 },
  selectFieldText: { flex: 1, fontSize: 15, color: tdsDark.textPrimary },
  selectFieldPlaceholder: { color: tdsDark.textTertiary },

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

  sheetList: { maxHeight: 360 },
  sheetListContent: { paddingBottom: 8 },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tdsDark.border,
    backgroundColor: tdsDark.bgCard,
    marginBottom: 8,
    minHeight: 48,
  },
  sheetOptionSelected: { borderColor: tdsColors.blue500, backgroundColor: `${tdsColors.blue500}10` },
  sheetOptionTextWrap: { flex: 1, paddingRight: 8 },
  sheetOptionText: { fontSize: 14, color: tdsDark.textPrimary },
  sheetOptionTextSelected: { color: tdsColors.blue500, fontWeight: '700' },
  sheetOptionMeta: { fontSize: 11, color: tdsDark.textTertiary, marginTop: 2 },
});
