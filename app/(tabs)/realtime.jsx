/**
 * 실시간 매매 탭 — 실시간 매매 설정 목록
 */
import { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { Badge } from '../../components/tds/Badge';
import { fetchRealtimeTrades, toggleRealtimeTrade } from '../../lib/realtimeApi';

function TradeCard({ item, onPress, onToggle }) {
  const statusBadgeColor = item.is_active ? 'blue' : 'grey';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      {/* 종목 + 상태 뱃지 */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTicker}>{item.ticker}</Text>
          <Text style={styles.cardMarket}>{item.market}</Text>
        </View>
        <View style={styles.cardBadges}>
          <TouchableOpacity
            onPress={() => onToggle(item)}
            activeOpacity={0.7}
          >
            <Badge
              color={statusBadgeColor}
              size="small"
              variant={item.is_active ? 'fill' : 'weak'}
            >
              {item.is_active ? 'ON' : 'OFF'}
            </Badge>
          </TouchableOpacity>
        </View>
      </View>

      {/* 상세 정보 */}
      <View style={styles.cardInfoGrid}>
        <View style={styles.cardInfoItem}>
          <Text style={styles.cardInfoLabel}>기준가</Text>
          <Text style={styles.cardInfoValue}>${item.base_price.toFixed(2)}</Text>
        </View>
        <View style={styles.cardInfoItem}>
          <Text style={styles.cardInfoLabel}>갭</Text>
          <Text style={styles.cardInfoValue}>{item.gap}%</Text>
        </View>
        <View style={styles.cardInfoItem}>
          <Text style={styles.cardInfoLabel}>수량</Text>
          <Text style={styles.cardInfoValue}>{item.quantity}</Text>
        </View>
      </View>

      {/* 수정 버튼 */}
      <View style={styles.cardFooter}>
        <Ionicons name="chevron-forward" size={18} color={tdsDark.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name="rocket-outline" size={40} color={tdsDark.textTertiary} />
      <Text style={styles.emptyTitle}>등록된 실시간 매매 없음</Text>
      <Text style={styles.emptySub}>[+ 실시간 매매] 버튼으로 추가해보세요</Text>
    </View>
  );
}

export default function RealtimeScreen() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchRealtimeTrades();
      if (error) throw new Error(error.message);
      setTrades(data || []);
    } catch (e) {
      Alert.alert('오류', e.message || '데이터 로드 실패');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePress = (item) => {
    router.push({
      pathname: '/realtime-form',
      params: {
        id: item.id,
        ticker: item.ticker,
        market: item.market,
        gap: String(item.gap),
        base_price: String(item.base_price),
        quantity: String(item.quantity),
        is_active: String(item.is_active),
      },
    });
  };

  const handleToggle = async (item) => {
    const { error } = await toggleRealtimeTrade(item.id, !item.is_active);
    if (error) {
      Alert.alert('오류', error.message || '상태 변경 실패');
    } else {
      setTrades(trades.map(t => t.id === item.id ? { ...t, is_active: !t.is_active } : t));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.headerEyebrow}>매매 · 자동</Text>
          <Text style={styles.headerTitle}>실시간 매매</Text>
          <Text style={styles.headerSub}>조건을 만족하면 자동으로 매매해요</Text>
        </View>
      </View>

      {/* + 실시간 매매 버튼 */}
      <TouchableOpacity
        style={styles.addRow}
        onPress={() => router.push('/realtime-form')}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={18} color={tdsColors.blue500} />
        <Text style={styles.addRowText}>실시간 매매</Text>
      </TouchableOpacity>

      {/* 목록 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tdsColors.blue500} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {trades.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={{ gap: 12 }}>
              {trades.map(trade => (
                <TradeCard
                  key={trade.id}
                  item={trade}
                  onPress={handlePress}
                  onToggle={handleToggle}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tdsDark.bgPrimary,
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: tdsDark.border,
  },
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
  addRow: {
    marginHorizontal: 16,
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: tdsColors.blue500 + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tdsColors.blue500 + '30',
  },
  addRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsColors.blue500,
  },
  card: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTicker: {
    fontSize: 18,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    marginBottom: 2,
  },
  cardMarket: {
    fontSize: 12,
    color: tdsDark.textTertiary,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  cardInfoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardInfoItem: {
    flex: 1,
    backgroundColor: tdsDark.bgPrimary,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  cardInfoLabel: {
    fontSize: 11,
    color: tdsDark.textTertiary,
    marginBottom: 2,
  },
  cardInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: tdsDark.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: tdsDark.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: tdsDark.textTertiary,
    marginTop: 4,
  },
});
