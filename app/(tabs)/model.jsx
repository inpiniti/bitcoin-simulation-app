/**
 * 모델 탭 — AI 모델 목록
 * [+ 모델] → /train 화면으로 push (탭바 없음)
 * useFocusEffect로 포커스 시 자동 새로고침
 */
import { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { supabase } from '../../lib/supabaseClient';

// ─── 날짜 포맷 ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ─── 모델 행 ──────────────────────────────────────────────────────────────────

function ModelRow({ model, isLast }) {
  const acc = model.accuracy != null ? Math.round(model.accuracy * 100) : null;
  return (
    <View style={[styles.modelRow, !isLast && styles.modelRowBorder]}>
      <View style={styles.modelIcon}>
        <Ionicons
          name="hardware-chip-outline"
          size={20}
          color={tdsColors.blue500}
        />
      </View>
      <View style={styles.modelInfo}>
        <Text style={styles.modelName}>{model.name}</Text>
        <Text style={styles.modelMeta}>{formatDate(model.created_at)}</Text>
      </View>
      {acc != null && (
        <View style={styles.accBadge}>
          <Text style={styles.accText}>{acc}%</Text>
        </View>
      )}
    </View>
  );
}

// ─── 빈 상태 ─────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons
        name="hardware-chip-outline"
        size={40}
        color={tdsDark.textTertiary}
      />
      <Text style={styles.emptyTitle}>학습된 모델이 없어요</Text>
      <Text style={styles.emptyDesc}>
        + 모델 버튼으로 첫 모델을 학습해보세요
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
        <Text style={styles.emptyBtnText}>+ 모델 추가</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function ModelScreen() {
  const router = useRouter();
  const [models, setModels] = useState([]);
  const [fetching, setFetching] = useState(false);

  const fetchModels = useCallback(async () => {
    setFetching(true);
    try {
      const { data } = await supabase
        .from('ml_models')
        .select('id, name, accuracy, created_at')
        .order('created_at', { ascending: false });
      setModels(data || []);
    } catch (_) {
      setModels([]);
    } finally {
      setFetching(false);
    }
  }, []);

  // 화면 포커스될 때마다 목록 새로고침 (학습 완료 후 돌아올 때 반영)
  useFocusEffect(
    useCallback(() => {
      fetchModels();
    }, [fetchModels]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.headerEyebrow}>모델 · 예측 엔진</Text>
          <Text style={styles.headerTitle}>AI 모델</Text>
          <Text style={styles.headerSub}>학습된 모델을 관리해요</Text>
        </View>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>XGBoost</Text>
        </View>
      </View>

      {/* + 모델 버튼 */}
      <TouchableOpacity
        style={styles.addRow}
        onPress={() => router.push('/train')}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={18} color={tdsColors.blue500} />
        <Text style={styles.addRowText}>모델</Text>
      </TouchableOpacity>

      {/* 모델 목록 */}
      <ScrollView>
        {models.length === 0 && !fetching ? (
          <EmptyState onAdd={() => router.push('/train')} />
        ) : (
          <View style={styles.listCard}>
            {models.map((model, i) => (
              <ModelRow
                key={model.id}
                model={model}
                isLast={i === models.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
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

  listCard: {
    marginHorizontal: 16,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  modelRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  modelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${tdsColors.blue500}15`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modelInfo: { flex: 1 },
  modelName: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
  modelMeta: { fontSize: 12, color: tdsDark.textTertiary, marginTop: 2 },
  accBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: `${tdsColors.green400}20`,
    borderRadius: 8,
  },
  accText: { fontSize: 12, fontWeight: '700', color: tdsColors.green400 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: tdsColors.blue700,
    borderRadius: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
