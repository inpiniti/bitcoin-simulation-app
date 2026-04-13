/**
 * 예약 탭 — 자동매매 설정 목록
 * 설정을 선택하면 /schedule-detail 로 이동
 * [+ 예약] / 수정 아이콘은 /schedule-form 으로 이동 (모델 탭과 동일 패턴)
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { Badge } from '../../components/tds/Badge';
import {
  fetchSettings,
  deleteSetting,
  toggleSetting,
} from '../../lib/tradingApi';
import { sampleSettings } from '../../lib/sampleData';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const MARKET_TIME_LABELS = {
  market_open:      '장 시작 (9:30 ET)',
  market_open_30m:  '장 시작 30분 후 (10:00 ET)',
  market_open_1h:   '장 시작 1시간 후 (10:30 ET)',
  market_close_2h:  '장 마감 2시간 전 (14:00 ET)',
  market_close_1h:  '장 마감 1시간 전 (15:00 ET)',
  market_close_30m: '장 마감 30분 전 (15:30 ET)',
  market_close:     '장 마감 (16:00 ET)',
};

const TICKER_GROUP_LABELS = {
  usall:         'US 나스닥+뉴욕 전체',
  sp500:         'S&P 500',
  qqq:           'QQQ (나스닥100)',
  nasdaq100:     '나스닥100',
  superinvestor: '슈퍼인베스터',
  myholdings:    '보유종목',
  kospi:         'KOSPI',
  kosdaq:        'KOSDAQ',
  nasdaq:        'NASDAQ',
  nyse:          'NYSE',
};

// ─── 설정 카드 ────────────────────────────────────────────────────────────────

function SettingCard({ item, onToggle, onDelete, onPress }) {
  const timeLabel  = MARKET_TIME_LABELS[item.execution_time]  ?? item.execution_time;
  const groupLabel = TICKER_GROUP_LABELS[item.ticker_group_key] ?? item.ticker_group_key;

  const handleDelete = () => {
    Alert.alert('설정 삭제', `"${item.name}"을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  const handleEdit = () => {
    router.push({
      pathname: '/schedule-form',
      params: {
        settingId:        item.id,
        settingName:      item.name,
        execution_time:   item.execution_time,
        ticker_group_key: item.ticker_group_key,
        buy_condition:    String(item.buy_condition  ?? 60),
        sell_condition:   String(item.sell_condition ?? 30),
        is_active:        String(item.is_active      ?? true),
        trade_enabled:    String(item.trade_enabled  ?? false),
      },
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      {/* 이름 + 뱃지 */}
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

      {/* 액션 */}
      <View style={styles.cardActions}>
        <Switch
          value={item.is_active}
          onValueChange={(v) => onToggle(item.id, v)}
          trackColor={{ false: tdsDark.border, true: tdsColors.blue500 }}
          thumbColor={tdsColors.white}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <TouchableOpacity onPress={handleEdit} style={styles.actionBtn} hitSlop={8}>
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
  const [loading, setLoading]   = useState(true);
  const [useSample, setUseSample] = useState(false);

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
    if (useSample) { setSettings((prev) => prev.filter((s) => s.id !== id)); return; }
    try {
      await deleteSetting(id);
      setSettings((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      Alert.alert('삭제 실패', e.message);
    }
  };

  const handlePress = (item) => {
    router.push({
      pathname: '/schedule-detail',
      params: {
        settingId:   item.id,
        settingName: item.name,
        targetGroup: item.ticker_group_key,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.headerEyebrow}>예약 · 자동매매</Text>
          <Text style={styles.headerTitle}>자동매매 예약</Text>
          <Text style={styles.headerSub}>설정 상태와 실행 로그를 함께 관리해요</Text>
        </View>
      </View>

      {/* + 예약 버튼 (모델 탭과 동일 스타일) */}
      <TouchableOpacity
        style={styles.addRow}
        onPress={() => router.push('/schedule-form')}
        activeOpacity={0.7}
      >
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
              <Text style={styles.emptyDesc}>위 [예약] 버튼으로 추가해보세요</Text>
            </View>
          ) : (
            settings.map((item) => (
              <SettingCard
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onPress={handlePress}
              />
            ))
          )}
        </ScrollView>
      )}
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
  },
  headerEyebrow: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: tdsDark.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: tdsDark.textSecondary, marginTop: 2 },

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
  sectionSub:   { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 16 },

  emptyBox:  { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: tdsDark.textPrimary },
  emptyDesc:  { fontSize: 13, color: tdsDark.textSecondary, textAlign: 'center' },

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
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardName:   { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary, flex: 1, marginRight: 8 },
  cardBadges: { flexDirection: 'row', gap: 6 },
  cardInfo:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  cardInfoText: { fontSize: 12, color: tdsDark.textTertiary },
  cardCondRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cardCond:    { fontSize: 12, color: tdsDark.textSecondary },
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
});
