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
  fetchDetectionStatus,
  startDetection,
} from '../../lib/realtimeApi';

const KIS_WS_URL = 'ws://ops.koreainvestment.com:21000';

// 클래스 종목 매칭용: 점/슬래시/하이픈 모두 제거 후 비교
// (DB: BRK-B / KIS 응답: BRK/B 또는 BRKB → 모두 BRKB로 정규화)
function normalizeTicker(t) {
  return String(t || '').toUpperCase().replace(/[-./]/g, '');
}

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
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [startingDetection, setStartingDetection] = useState(false);

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
      if (raw.startsWith('{')) {
        try {
          const json = JSON.parse(raw);
          console.log('[KIS WS] JSON 응답:', json);
        } catch (e) {
          console.log('[KIS WS] JSON 파싱 실패:', raw);
        }
        return;
      }

      const parts = raw.split('|');
      if (parts.length < 4) {
        console.log('[KIS WS] 메시지 형식 오류 (파트 부족):', raw);
        return;
      }

      const trId = parts[1];
      if (trId !== 'HDFSCNT0') {
        console.log('[KIS WS] 다른 tr_id 수신:', trId);
        return;
      }

      const dataStr = parts[3];
      const fields = dataStr.split('^');
      // SYMB는 두 번째 필드(인덱스 1)
      const symb = (fields[1] || '').toUpperCase();
      if (!symb) {
        console.log('[KIS WS] SYMB 없음:', fields);
        return;
      }

      const last = fields[11] || '0';
      const khms = fields[7] || '';
      const mtyp = fields[25] || '1';
      const mtypLabel = { '1': '장중', '2': '장전', '3': '장후' }[mtyp] || `MTYP=${mtyp}`;
      console.log(`[KIS WS] 가격 수신 - ${symb}: ${last} (${khms}, ${mtypLabel})`);

      const normSymb = normalizeTicker(symb);
      const trade = tradesRef.current.find(
        (t) => normalizeTicker(t.ticker) === normSymb
      );
      if (!trade) {
        console.log(`[KIS WS] 등록되지 않은 종목: ${symb} (정규화: ${normSymb})`);
        return;
      }

      console.log(`[KIS WS] 감지! ${trade.ticker} - 테두리 표시`);
      flashDetection(trade.id);
    },
    [flashDetection]
  );

  // KIS WebSocket 연결 + 구독
  const connectAndSubscribe = useCallback(
    (approvalKey, activeTrades) => {
      try {
        console.log(`[KIS WS] 연결 시도: ${KIS_WS_URL}`);
        const ws = new WebSocket(KIS_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[KIS WS] 연결 성공 ✓');
          for (const trade of activeTrades) {
            const market = (trade.market || '').toUpperCase();
            // KIS WS는 점→/, 하이픈→제거 (BRK.B → BRK/B, BRK-B → BRKB)
            const ticker = (trade.ticker || '').toUpperCase()
              .replace(/\./g, '/')
              .replace(/-/g, '');
            const trKey = `D${market}${ticker}`;
            const message = JSON.stringify({
              header: {
                approval_key: approvalKey,
                tr_type: '1',
                custtype: 'P',
                'content-type': 'utf-8',
              },
              body: {
                input: {
                  tr_id: 'HDFSCNT0',
                  tr_key: trKey,
                }
              },
            });
            try {
              ws.send(message);
              console.log(`[KIS WS] 구독 요청 전송: ${trade.ticker} (${trKey})`);
            } catch (e) {
              console.error(`[KIS WS] 구독 전송 실패: ${trade.ticker} - ${e.message}`);
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
          console.error('[KIS WS] 에러:', e?.message || e);
          Alert.alert('WS 에러', e?.message || '연결 오류');
        };

        ws.onclose = () => {
          console.log('[KIS WS] 연결 끊김');
          wsRef.current = null;
        };
      } catch (e) {
        console.error('[KIS WS] 연결 실패:', e.message);
        Alert.alert('WS 연결 실패', e.message || '알 수 없는 오류');
      }
    },
    [handleWsMessage]
  );

  // trades 로드 + 서버 상태 확인 + (running일 때만) KIS WS 연결
  const initializeRealtime = useCallback(async () => {
    console.log('[Realtime] 초기화 시작...');
    setLoading(true);
    const { data: tradesData, error: tradesErr } = await fetchRealtimeTrades();
    if (tradesErr) {
      console.error('[Realtime] 종목 조회 실패:', tradesErr);
      Alert.alert('데이터 조회 실패', tradesErr.message || JSON.stringify(tradesErr));
      setTrades([]);
      setLoading(false);
      return;
    }
    const list = tradesData || [];
    console.log(`[Realtime] 종목 조회 완료: ${list.length}개`);
    setTrades(list);
    tradesRef.current = list;
    setLoading(false);

    // 서버 감지 상태 확인
    const { data: statusData } = await fetchDetectionStatus();
    const isRunning = statusData?.running === true;
    console.log('[Realtime] 서버 감지 상태:', isRunning ? '실행 중' : '중지');
    setDetectionRunning(isRunning);

    // 기존 WS는 일단 정리
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_e) {}
      wsRef.current = null;
    }

    // 서버 중지 상태면 앱 WS도 동작 안 함
    if (!isRunning) {
      console.log('[Realtime] 서버 감지가 중지되었으므로 앱 WS 연결 안 함');
      return;
    }

    const activeTrades = list.filter((t) => t.is_active);
    console.log(`[Realtime] 활성 종목: ${activeTrades.length}개 (${activeTrades.map(t => t.ticker).join(', ')})`);
    if (activeTrades.length === 0) {
      console.log('[Realtime] 활성 종목이 없으므로 WS 연결 안 함');
      return;
    }

    const { data: keyData, error: keyErr } = await fetchWebSocketKey();
    if (keyErr || !keyData?.approval_key) {
      console.error('[Realtime] WS 키 조회 실패:', keyErr);
      Alert.alert(
        'WS 키 없음',
        keyErr?.message || 'WebSocket 키가 없습니다. 다시 로그인 해주세요.'
      );
      return;
    }
    console.log('[Realtime] WS 키 조회 완료');

    connectAndSubscribe(keyData.approval_key, activeTrades);
  }, [connectAndSubscribe]);

  useEffect(() => {
    initializeRealtime();

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (_e) {}
        wsRef.current = null;
      }
      Object.values(detectionTimeoutsRef.current).forEach(clearTimeout);
      detectionTimeoutsRef.current = {};
    };
  }, [initializeRealtime]);

  const handleStartDetection = async () => {
    setStartingDetection(true);
    const { data, error } = await startDetection();
    setStartingDetection(false);

    if (error) {
      Alert.alert('시작 실패', error.message || '서버 호출 실패');
      return;
    }

    if (data?.status === 'no_key') {
      Alert.alert('키 없음', data.message || 'WebSocket 키가 없습니다. 다시 로그인해주세요.');
      return;
    }

    Alert.alert(
      data?.status === 'started' ? '✅ 시작됨' : '이미 실행 중',
      data?.status === 'started' ? '실시간 감지가 시작되었습니다.' : '서버 감지가 이미 동작 중입니다.'
    );
    await initializeRealtime();
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePress = (item) => {
    router.push({
      pathname: '/realtime-orders',
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

      {/* 서버 감지 상태 */}
      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: detectionRunning ? tdsColors.blue500 : tdsDark.textTertiary },
            ]}
          />
          <Text style={styles.statusText}>
            서버 감지 {detectionRunning ? '실행 중' : '중지됨'}
          </Text>
        </View>
        {!detectionRunning && (
          <TouchableOpacity
            onPress={handleStartDetection}
            disabled={startingDetection}
            activeOpacity={0.7}
            style={[styles.startButton, startingDetection && styles.startButtonDisabled]}
          >
            <Text style={styles.startButtonText}>
              {startingDetection ? '시작 중...' : '시작'}
            </Text>
          </TouchableOpacity>
        )}
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: tdsDark.textPrimary,
  },
  startButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: tdsColors.blue500,
    borderRadius: 8,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
