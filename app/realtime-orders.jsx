/**
 * 실시간 매매 주문 이력 화면
 * - 해당 종목의 최근 50건 주문 이력 표시
 * - 헤더 우측에 [매매수정] 이동 버튼
 */
import { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../constants/tdsColors';
import { Badge } from '../components/tds/Badge';
import { fetchRealtimeOrders } from '../lib/realtimeApi';

const SIDE_LABEL = {
  buy: '매수',
  sell: '매도',
  none: '기준가',
};

function formatDateTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  } catch (_e) {
    return isoStr;
  }
}

function OrderRow({ item, isLast }) {
  const side = item.side || 'none';
  const isBuy = side === 'buy';
  const isSell = side === 'sell';
  const sideColor = isBuy ? tdsColors.blue500 : isSell ? tdsColors.red600 : tdsDark.textTertiary;
  const successColor = item.success ? tdsColors.blue500 : tdsColors.red600;

  return (
    <View style={[styles.orderRow, !isLast && styles.orderRowBorder]}>
      <View style={styles.orderTopRow}>
        <View style={styles.orderLeft}>
          <View style={[styles.sideTag, { backgroundColor: `${sideColor}20`, borderColor: sideColor }]}>
            <Text style={[styles.sideTagText, { color: sideColor }]}>
              {SIDE_LABEL[side] || side}
            </Text>
          </View>
          <Text style={styles.orderTime}>{formatDateTime(item.created_at)}</Text>
        </View>
        <Badge
          color={item.success ? 'blue' : 'red'}
          size="small"
          variant={item.success ? 'fill' : 'weak'}
        >
          {item.success ? '성공' : '실패'}
        </Badge>
      </View>

      <View style={styles.orderInfoRow}>
        {side !== 'none' && (
          <Text style={styles.orderInfoMain}>
            {item.quantity}주 @ ${Number(item.price).toFixed(2)}
          </Text>
        )}
        {side === 'none' && (
          <Text style={styles.orderInfoMain}>
            기준가 업데이트
          </Text>
        )}
        {typeof item.price_rate === 'number' && (
          <Text style={[styles.orderRate, { color: item.price_rate >= 0 ? tdsColors.blue500 : tdsColors.red600 }]}>
            {item.price_rate >= 0 ? '+' : ''}{Number(item.price_rate).toFixed(2)}%
          </Text>
        )}
      </View>

      {(item.base_price_before != null || item.base_price_after != null) && (
        <Text style={styles.orderSub}>
          기준가: ${Number(item.base_price_before || 0).toFixed(2)} → ${Number(item.base_price_after || 0).toFixed(2)}
        </Text>
      )}

      {item.order_no && (
        <Text style={styles.orderSub}>주문번호: {item.order_no}</Text>
      )}

      {item.error_message && (
        <Text style={[styles.orderSub, { color: tdsColors.red600 }]}>
          사유: {item.error_message}
        </Text>
      )}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name="document-text-outline" size={40} color={tdsDark.textTertiary} />
      <Text style={styles.emptyTitle}>주문 이력 없음</Text>
      <Text style={styles.emptySub}>아직 이 종목에 대한 매매 시도가 없어요</Text>
    </View>
  );
}

export default function RealtimeOrdersScreen() {
  const params = useLocalSearchParams();
  const tradeId = params.id;
  const ticker = params.ticker;
  const market = params.market;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tradeId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const { data, error } = await fetchRealtimeOrders(tradeId, 50);
    if (error) {
      setOrders([]);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [tradeId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleEditPress = () => {
    router.push({
      pathname: '/realtime-form',
      params: {
        id: tradeId,
        ticker: params.ticker,
        market: params.market,
        gap: params.gap,
        base_price: params.base_price,
        quantity: params.quantity,
        is_active: params.is_active,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={tdsDark.textPrimary} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {ticker ? `${ticker} 주문 이력` : '주문 이력'}
        </Text>
        <TouchableOpacity
          onPress={handleEditPress}
          style={styles.headerRightBtn}
          hitSlop={8}
        >
          <Text style={styles.headerRightText}>매매수정</Text>
        </TouchableOpacity>
      </View>

      {/* 종목 요약 */}
      {ticker && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTicker}>{ticker}</Text>
          {market && <Text style={styles.summaryMarket}>{market}</Text>}
        </View>
      )}

      {/* 이력 목록 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tdsColors.blue500} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tdsColors.blue500}
            />
          }
        >
          {orders.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.listCard}>
              {orders.map((o, i) => (
                <OrderRow key={o.id} item={o} isLast={i === orders.length - 1} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 80,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 15,
    color: tdsDark.textPrimary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  headerRightBtn: {
    minWidth: 80,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  headerRightText: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsColors.blue500,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryTicker: {
    fontSize: 22,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    letterSpacing: -0.5,
  },
  summaryMarket: {
    fontSize: 13,
    color: tdsDark.textSecondary,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  listCard: {
    marginHorizontal: 16,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    overflow: 'hidden',
  },
  orderRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  orderRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sideTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  sideTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderTime: {
    fontSize: 12,
    color: tdsDark.textTertiary,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  orderInfoMain: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsDark.textPrimary,
  },
  orderRate: {
    fontSize: 13,
    fontWeight: '700',
  },
  orderSub: {
    fontSize: 12,
    color: tdsDark.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
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
  emptySub: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    textAlign: 'center',
  },
});
