/**
 * 실시간 매매 등록/수정 화면
 * router.push(''/realtime-form'')           → 신규 등록
 * router.push(''/realtime-form'', { id, …}) → 수정
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
import { BottomSheet } from '../components/tds/BottomSheet';
import { createRealtimeTrade, updateRealtimeTrade, deleteRealtimeTrade, fetchRealtimeTrades } from '../lib/realtimeApi';
import { fetchCurrentPrice } from '../lib/kisApi';

const MARKETS = [
  { key: 'NYS', label: '뉴욕 (NYS)' },
  { key: 'NAS', label: '나스닥 (NAS)' },
  { key: 'AMS', label: '아멕스 (AMS)' },
  { key: 'HKS', label: '홍콩 (HKS)' },
  { key: 'TSE', label: '도쿄 (TSE)' },
];

const DEFAULT_FORM = {
  ticker: '',
  market: 'NYS',
  gap: 1,
  base_price: 0,
  quantity: 0,
  is_active: true,
};

function SelectField({ label, value, placeholder, onPress, hasError = false, disabled = false }) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.selectField,
          hasError && styles.selectFieldError,
          disabled && styles.selectFieldDisabled,
        ]}
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

export default function RealtimeFormScreen() {
  const params = useLocalSearchParams();
  const isEdit = !!params.id;

  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [pickerKey, setPickerKey] = useState(null);

  useEffect(() => {
    if (isEdit) {
      setForm({
        id: params.id,
        ticker: params.ticker || '',
        market: params.market || 'NYS',
        gap: parseInt(params.gap) || 1,
        base_price: parseFloat(params.base_price) || 0,
        quantity: parseInt(params.quantity) || 0,
        is_active: params.is_active !== 'false',
      });
    }
  }, []);

  const handleFetchPrice = async () => {
    if (!form.ticker || !form.market) {
      Alert.alert('알림', '종목과 시장을 선택해주세요');
      return;
    }

    setLoadingPrice(true);
    const { lastPrice, error } = await fetchCurrentPrice(form.ticker, form.market);
    setLoadingPrice(false);

    if (error) {
      Alert.alert('오류', error.message || '현재가 조회 실패');
    } else {
      setForm({ ...form, base_price: lastPrice });
      Alert.alert('성공', `현재가: ${ lastPrice.toFixed(2) }`);
    }
  };

  const validateForm = () => {
    if (!form.ticker.trim()) {
      Alert.alert('알림', '종목을 입력해주세요');
      return false;
    }
    if (form.base_price <= 0) {
      Alert.alert('알림', '기준가를 설정해주세요');
      return false;
    }
    if (form.gap < 0) {
      Alert.alert('알림', '갭은 0 이상이어야 합니다');
      return false;
    }
    if (form.quantity < 0) {
      Alert.alert('알림', '수량은 0 이상이어야 합니다');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const data = {
        ticker: form.ticker,
        market: form.market,
        gap: form.gap,
        base_price: form.base_price,
        quantity: form.quantity,
      };

      let result;
      if (isEdit) {
        result = await updateRealtimeTrade(form.id, data);
      } else {
        result = await createRealtimeTrade(data);
      }

      if (result.error) {
        Alert.alert('오류', result.error.message || '저장 실패');
        return;
      }

      Alert.alert('성공', isEdit ? '수정되었습니다' : '등록되었습니다', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('삭제', '정말로 삭제하시겠습니까?', [
      { text: '취소' },
      {
        text: '삭제',
        onPress: async () => {
          setDeleting(true);
          try {
            const result = await deleteRealtimeTrade(form.id);
            if (result.error) {
              Alert.alert('오류', result.error.message || '삭제 실패');
              return;
            }
            Alert.alert('성공', '삭제되었습니다', [
              { text: '확인', onPress: () => router.back() },
            ]);
          } finally {
            setDeleting(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const marketLabel = MARKETS.find(m => m.key === form.market)?.label || form.market;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tdsDark.bgPrimary }}>
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 헤더 */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.headerEyebrow}>설정</Text>
          <Text style={styles.headerTitle}>{isEdit ? '실시간 매매 수정' : '실시간 매매 등록'}</Text>
          <Text style={styles.headerSub}>조건을 설정해 자동 매매를 준비해요</Text>
        </View>

        {/* 종목 입력 */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.fieldLabel}>종목 (티커)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="예: AAPL"
              placeholderTextColor={tdsDark.textTertiary}
              value={form.ticker}
              onChangeText={(ticker) => setForm({ ...form, ticker: ticker.toUpperCase() })}
              editable={!loadingPrice}
            />
          </View>
        </View>

        {/* 시장 선택 */}
        <SelectField
          label="시장"
          value={marketLabel}
          placeholder="시장 선택"
          onPress={() => setPickerKey('market')}
        />

        {/* 현재가 자동 조회 */}
        <View style={{ marginBottom: 20, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.fieldLabel}>기준가</Text>
            <TouchableOpacity
              style={styles.priceButton}
              onPress={handleFetchPrice}
              disabled={loadingPrice}
            >
              {loadingPrice ? (
                <ActivityIndicator size="small" color={tdsColors.blue500} />
              ) : (
                <Ionicons name="download-outline" size={16} color={tdsColors.blue500} />
              )}
              <Text style={styles.priceButtonText}>현재가 조회</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputRow}>
            <Text style={{ marginRight: 8, fontSize: 16, color: tdsDark.textSecondary }}>$</Text>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={tdsDark.textTertiary}
              keyboardType="decimal-pad"
              value={form.base_price.toString()}
              onChangeText={(price) => setForm({ ...form, base_price: parseFloat(price) || 0 })}
            />
          </View>
        </View>

        {/* 갭 입력 */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.fieldLabel}>갭 (%)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="1"
              placeholderTextColor={tdsDark.textTertiary}
              keyboardType="number-pad"
              value={form.gap.toString()}
              onChangeText={(gap) => setForm({ ...form, gap: parseInt(gap) || 0 })}
            />
          </View>
        </View>

        {/* 수량 입력 */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.fieldLabel}>수량</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="0"
              placeholderTextColor={tdsDark.textTertiary}
              keyboardType="number-pad"
              value={form.quantity.toString()}
              onChangeText={(qty) => setForm({ ...form, quantity: parseInt(qty) || 0 })}
            />
          </View>
        </View>

        {/* 활성화 토글 */}
        <View style={styles.toggleRow}>
          <Text style={styles.fieldLabel}>활성화</Text>
          <Switch
            value={form.is_active}
            onValueChange={(is_active) => setForm({ ...form, is_active })}
            trackColor={{ false: tdsDark.border, true: tdsColors.blue500 + '40' }}
            thumbColor={form.is_active ? tdsColors.blue500 : tdsDark.textTertiary}
          />
        </View>
      </ScrollView>

      {/* 저장 / 삭제 버튼 */}
      <View style={styles.actionBar}>
        {isEdit && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
            disabled={saving || deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={tdsColors.red500} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={tdsColors.red500} />
            )}
            <Text style={[styles.buttonText, { color: tdsColors.red500 }]}>삭제</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={saving || deleting}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="checkmark" size={18} color="white" />
          )}
          <Text style={[styles.buttonText, { color: 'white' }]}>저장</Text>
        </TouchableOpacity>
      </View>

      {/* 시장 선택 바텀시트 */}
      <BottomSheet visible={pickerKey === 'market'} onClose={() => setPickerKey(null)}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <Text style={styles.bottomSheetTitle}>시장 선택</Text>
          {MARKETS.map(market => (
            <TouchableOpacity
              key={market.key}
              style={styles.bottomSheetOption}
              onPress={() => {
                setForm({ ...form, market: market.key });
                setPickerKey(null);
              }}
            >
              <Text style={[styles.bottomSheetOptionText, form.market === market.key && styles.bottomSheetOptionSelected]}>
                {market.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: tdsColors.blue500,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: tdsDark.textSecondary,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsDark.textPrimary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tdsDark.bgCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  textInput: {
    height: 48,
    fontSize: 16,
    color: tdsDark.textPrimary,
    flex: 1,
  },
  selectField: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: tdsDark.border,
    marginBottom: 20,
  },
  selectFieldText: {
    fontSize: 16,
    color: tdsDark.textPrimary,
    flex: 1,
  },
  selectFieldPlaceholder: {
    color: tdsDark.textTertiary,
  },
  selectFieldError: {
    borderColor: tdsColors.red500,
  },
  selectFieldDisabled: {
    opacity: 0.5,
  },
  priceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: tdsColors.blue500 + '15',
    borderRadius: 6,
  },
  priceButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: tdsColors.blue500,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: tdsDark.border,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    backgroundColor: tdsDark.bgCard,
    borderTopWidth: 1,
    borderTopColor: tdsDark.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: tdsColors.blue500,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tdsColors.red500,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    marginBottom: 12,
  },
  bottomSheetOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tdsDark.border,
  },
  bottomSheetOptionText: {
    fontSize: 16,
    color: tdsDark.textSecondary,
  },
  bottomSheetOptionSelected: {
    fontWeight: '600',
    color: tdsColors.blue500,
  },
});
