/**
 * 실시간 매매 탭 — 실시간 매매 설정 목록
 */
import { useState, useCallback, useEffect, useRef } from 'react';
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
import { supabase } from '../../lib/supabaseClient';

function TradeRow({ item, isLast, onPress, onToggle, isDetected }) {
  const statusBadgeColor = item.is_active ? 'blue' : 'grey';
  const detectedBorderColor = isDetected ? tdsColors.blue500 : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.tradeRow,
        !isLast && styles.tradeRowBorder,
        isDetected && { borderWidth: 2, borderColor: detectedBorderColor }
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.tradeIcon}>
        <Ionicons
          name="rocket-outline"
          size={18}
          color={tdsColors.blue500}
        />
      </View>
      <View style={styles.tradeInfo}>
        <Text style={styles.tradeTicker}>{item.ticker}</Text>
        <Text style={styles.tradeMeta}>{item.market} · ${item.base_price.toFixed(2)} · {item.gap}% · {item.quantity}주</Text>
      </View>
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
      <Ionicons name="chevron-forward" size={16} color={tdsDark.textTertiary} />
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
  const [detectedIds, setDetectedIds] = useState(new Set());
  const subscriptionRef = useRef(null);
  const detectionTimeoutRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchRealtimeTrades();
      if (error) {
        Alert.alert('데이터 조회 실패', `에러: ${error.message || JSON.stringify(error)}`);
        setTrades([]);
        return;
      }
      setTrades(data || []);
    } catch (e) {
      Alert.alert('예외 발생', `데이터 로드 중 오류:\n\n${e.message || '알 수 없는 오류'}`);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase Realtime 구독: 실시간 매매 업데이트 감지
  const setupSubscription = useCallback(() => {
    try {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      subscriptionRef.current = supabase
        .channel('realtime_trading_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'realtime_trading',
          },
          (payload) => {
            // 감지된 종목 표시 (3초간 테두리 표시)
            const tradeId = payload.new?.id || payload.old?.id;
            if (tradeId) {
              setDetectedIds((prev) => new Set(prev).add(tradeId));

              if (detectionTimeoutRef.current) {
                clearTimeout(detectionTimeoutRef.current);
              }

              detectionTimeoutRef.current = setTimeout(() => {
                setDetectedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(tradeId);
                  return next;
                });
              }, 3000);
            }

            // 데이터 업데이트 (기준가, 수량 등 변경)
            setTrades((prevTrades) =>
              prevTrades.map((t) =>
                t.id === tradeId
                  ? {
                      ...t,
                      base_price: payload.new?.base_price ?? t.base_price,
                      quantity: payload.new?.quantity ?? t.quantity,
                      updated_at: payload.new?.updated_at ?? t.updated_at,
                    }
                  : t
              )
            );
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            Alert.alert('✅ Realtime 연결', '실시간 매매 변경 감지 준비 완료');
          } else {
            Alert.alert('⚠️ 연결 상태', `상태: ${status}`);
          }
        });
    } catch (e) {
      Alert.alert('구독 에러', `Realtime 구독 설정 실패:\n\n${e.message || '알 수 없는 오류'}`);
    }
  }, []);

  useEffect(() => {
    load();
    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, []);

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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {trades.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.listCard}>
              {trades.map((trade, i) => (
                <TradeRow
                  key={trade.id}
                  item={trade}
                  isLast={i === trades.length - 1}
                  onPress={handlePress}
                  onToggle={handleToggle}
                  isDetected={detectedIds.has(trade.id)}
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
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  headerEyebrow: {
    fontSize: 12,
    color: tdsDark.textTertiary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    marginTop: 2,
  },
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
  addRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsColors.blue500,
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
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  tradeRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  tradeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${tdsColors.blue500}15`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tradeInfo: {
    flex: 1,
  },
  tradeTicker: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsDark.textPrimary,
  },
  tradeMeta: {
    fontSize: 12,
    color: tdsDark.textTertiary,
    marginTop: 2,
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
