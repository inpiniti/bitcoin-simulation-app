/**
 * 실시간 매매 탭 — KIS WebSocket으로 실시간 가격 감지
 *
 * 동작:
 * 1. Supabase에서 종목 목록 + WebSocket 키 가져옴
 * 2. KIS WebSocket(ws://ops.koreainvestment.com:21000) 직접 연결
 * 3. 활성 종목들 HDFSCNT0 구독 (tr_key = D + market + ticker)
 * 4. 가격 메시지 수신 시 해당 카드 빨간 테두리 3초 표시
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
import {
  fetchRealtimeTrades,
  toggleRealtimeTrade,
  fetchWebSocketKey,
} from '../../lib/realtimeApi';

const KIS_WS_URL = 'ws://ops.koreainvestment.com:21000';

function TradeRow({ item, isLast, onPress, onToggle, isDetected }) {
  const statusBadgeColor = item.is_active ? 'blue' : 'grey';
  const detectedBorderColor = isDetected ? tdsColors.red600 : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.tradeRow,
        !isLast && styles.tradeRowBorder,
        isDetected && { borderWidth: 2, borderColor: detectedBorderColor },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.tradeIcon}>
        <Ionicons name="rocket-outline" size={18} color={tdsColors.blue500} />
      </View>
      <View style={styles.tradeInfo}>
        <Text style={styles.tradeTicker}>{item.ticker}</Text>
        <Text style={styles.tradeMeta}>
          {item.market} · ${item.base_price.toFixed(2)} · {item.gap}% · {item.quantity}주
        </Text>
      </View>
      <TouchableOpacity onPress={() => onToggle(item)} activeOpacity={0.7}>
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

  const wsRef = useRef(null);
  const tradesRef = useRef([]);
  const detectionTimeoutsRef = useRef({});

  // 최신 trades를 ref에 동기화 (WS 콜백에서 참조용)
  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchRealtimeTrades();
      if (error) {
        Alert.alert('데이터 조회 실패', error.message || JSON.stringify(error));
        setTrades([]);
        return;
      }
      setTrades(data || []);
    } catch (e) {
      Alert.alert('예외 발생', e.message || '알 수 없는 오류');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 가격 감지 시 해당 trade에 빨간 테두리 3초
  const flashDetection = useCallback((tradeId) => {
    setDetectedIds((prev) => {
      const next = new Set(prev);
      next.add(tradeId);
      return next;
    });

    if (detectionTimeoutsRef.current[tradeId]) {
      clearTimeout(detectionTimeoutsRef.current[tradeId]);
    }
    detectionTimeoutsRef.current[tradeId] = setTimeout(() => {
      setDetectedIds((prev) => {
        const next = new Set(prev);
        next.delete(tradeId);
        return next;
      });
      delete detectionTimeoutsRef.current[tradeId];
    }, 3000);
  }, []);

  // KIS WS 메시지 파싱
  // 형식: 0|HDFSCNT0|001|RSYM^SYMB^ZDIV^...
  const handleWsMessage = useCallback(
    (raw) => {
      if (typeof raw !== 'string') return;

      // JSON 응답 (구독 등록 성공/실패 등)
      if (raw.startsWith('{')) return;

      const parts = raw.split('|');
      if (parts.length < 4) return;

      const trId = parts[1];
      if (trId !== 'HDFSCNT0') return;

      const dataStr = parts[3];
      const fields = dataStr.split('^');
      // SYMB는 두 번째 필드(인덱스 1)
      const symb = (fields[1] || '').toUpperCase();
      if (!symb) return;

      const trade = tradesRef.current.find(
        (t) => (t.ticker || '').toUpperCase() === symb
      );
      if (!trade) return;

      flashDetection(trade.id);
    },
    [flashDetection]
  );

  // KIS WebSocket 연결 + 구독
  const connectAndSubscribe = useCallback(
    (approvalKey, activeTrades) => {
      try {
        const ws = new WebSocket(KIS_WS_URL, 'livedata');
        wsRef.current = ws;

        ws.onopen = () => {
          for (const trade of activeTrades) {
            const market = (trade.market || '').toUpperCase();
            const ticker = (trade.ticker || '').toUpperCase();
            const trKey = `D${market}${ticker}`;
            const message = JSON.stringify({
              header: {
                approval_key: approvalKey,
                tr_type: '1',
                custtype: 'P',
                'content-type': 'utf-8',
              },
              body: {
                tr_id: 'HDFSCNT0',
                tr_key: trKey,
              },
            });
            try {
              ws.send(message);
            } catch (e) {
              Alert.alert('구독 전송 실패', `${trade.ticker}: ${e.message}`);
            }
          }
          Alert.alert(
            '✅ KIS WS 연결',
            `${activeTrades.length}개 종목 구독 요청 완료`
          );
        };

        ws.onmessage = (event) => {
          handleWsMessage(event.data);
        };

        ws.onerror = (e) => {
          Alert.alert('WS 에러', e?.message || '연결 오류');
        };

        ws.onclose = () => {
          wsRef.current = null;
        };
      } catch (e) {
        Alert.alert('WS 연결 실패', e.message || '알 수 없는 오류');
      }
    },
    [handleWsMessage]
  );

  // 마운트 시: trades 로드 → key 조회 → WS 연결
  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1. trades 로드
      setLoading(true);
      const { data: tradesData, error: tradesErr } = await fetchRealtimeTrades();
      if (!mounted) return;
      if (tradesErr) {
        Alert.alert('데이터 조회 실패', tradesErr.message || JSON.stringify(tradesErr));
        setTrades([]);
        setLoading(false);
        return;
      }
      const list = tradesData || [];
      setTrades(list);
      tradesRef.current = list;
      setLoading(false);

      // 2. 활성 종목 없으면 WS 연결 안 함
      const activeTrades = list.filter((t) => t.is_active);
      if (activeTrades.length === 0) return;

      // 3. WS 키 조회
      const { data: keyData, error: keyErr } = await fetchWebSocketKey();
      if (!mounted) return;
      if (keyErr || !keyData?.approval_key) {
        Alert.alert(
          'WS 키 없음',
          keyErr?.message || 'WebSocket 키가 없습니다. 다시 로그인 해주세요.'
        );
        return;
      }

      // 4. WS 연결 + 구독
      connectAndSubscribe(keyData.approval_key, activeTrades);
    })();

    return () => {
      mounted = false;
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (_e) {
          // ignore
        }
        wsRef.current = null;
      }
      Object.values(detectionTimeoutsRef.current).forEach(clearTimeout);
      detectionTimeoutsRef.current = {};
    };
  }, [connectAndSubscribe]);

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
      setTrades(trades.map((t) => (t.id === item.id ? { ...t, is_active: !t.is_active } : t)));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.headerEyebrow}>매매 · 자동</Text>
          <Text style={styles.headerTitle}>실시간 매매</Text>
          <Text style={styles.headerSub}>가격 변동이 감지되면 카드에 빨간 테두리가 표시돼요</Text>
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
