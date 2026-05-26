/**
 * 실시간 매매 탭
 *
 * 동작:
 * 1. Supabase에서 종목 목록 가져옴
 * 2. 백엔드 WebSocket(/realtime/ws)에 연결 (KIS 직접 연결 제거)
 * 3. 백엔드가 KIS에서 수신한 가격을 JSON으로 중계
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
  AppState,
  Animated,
} from 'react-native';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { Badge } from '../../components/tds/Badge';
import { LogoBadge } from '../../components/tds/LogoBadge';
import { SegmentControl } from '../../components/tds/SegmentControl';
import {
  fetchRealtimeTrades,
  toggleRealtimeTrade,
  fetchDetectionStatus,
  startDetection,
} from '../../lib/realtimeApi';
import { getStoredJwt } from '../../lib/authApi';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://younginpiniti-bitcoin-ai-backend.hf.space';
const BACKEND_WS_URL = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://') + '/realtime/ws';

// 클래스 종목 매칭용: 점/슬래시/하이픈 모두 제거 후 비교
// (DB: BRK-B / KIS 응답: BRK/B 또는 BRKB → 모두 BRKB로 정규화)
function normalizeTicker(t) {
  return String(t || '').toUpperCase().replace(/[-./]/g, '');
}

function TradeRow({ item, isLast, onPress, onToggle, flashTick, currentPrice, currentBase }) {
  const statusBadgeColor = item.is_active ? 'blue' : 'grey';

  // 감지 시 옅은 파란색 → 투명으로 1.5초간 페이드 (레이아웃 변동 없음)
  // flashTick(timestamp)이 바뀔 때마다 실행 — 연속 감지 시에도 항상 반응
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevTickRef = useRef(flashTick);
  useEffect(() => {
    if (flashTick && flashTick !== prevTickRef.current) {
      prevTickRef.current = flashTick;
      flashAnim.setValue(1);
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    }
  }, [flashTick, flashAnim]);
  const animatedBackgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', `${tdsColors.blue500}25`],
  });

  const hasCurrent = Number.isFinite(currentPrice) && currentPrice > 0;
  // 백엔드가 슬라이딩한 실시간 기준가 우선, 없으면 DB 적재값으로 폴백
  const basePrice = Number.isFinite(currentBase) && currentBase > 0 ? currentBase : item.base_price;
  const diffPct = hasCurrent && basePrice > 0
    ? ((currentPrice - basePrice) / basePrice) * 100
    : null;
  const diffColor = diffPct == null
    ? tdsDark.textTertiary
    : diffPct > 0
      ? tdsColors.red500
      : diffPct < 0
        ? tdsColors.blue500
        : tdsDark.textSecondary;
  const diffSign = diffPct == null ? '' : diffPct > 0 ? '+' : '';

  return (
    <AnimatedTouchable
      style={[
        styles.tradeRow,
        !isLast && styles.tradeRowBorder,
        { backgroundColor: animatedBackgroundColor },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <LogoBadge name={item.ticker} ticker={item.ticker} size={36} />
      <View style={styles.tradeInfo}>
        <Text style={styles.tradeTicker}>{item.ticker}</Text>
        <Text style={styles.tradeMeta}>
          {item.market} · 기준 ${basePrice.toFixed(2)} · {item.gap}% × {item.gap_qty ?? 1}주 · 보유 {item.quantity}주
        </Text>
      </View>
      <View style={styles.tradePriceBlock}>
        <Text style={styles.tradeCurrentPrice}>
          {hasCurrent ? `$${currentPrice.toFixed(2)}` : '-'}
        </Text>
        <Text style={[styles.tradeDiffPct, { color: diffColor }]}>
          {diffPct == null ? '–' : `${diffSign}${diffPct.toFixed(2)}%`}
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
    </AnimatedTouchable>
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
  const [marketFilter, setMarketFilter] = useState('all'); // 'all' | 'domestic' | 'overseas'
  const [loading, setLoading] = useState(true);
  const [detectedTicks, setDetectedTicks] = useState({}); // { tradeId: timestamp }
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [startingDetection, setStartingDetection] = useState(false);
  const [currentPrices, setCurrentPrices] = useState({}); // { normalizedTicker: price }
  const [currentBases, setCurrentBases] = useState({}); // { normalizedTicker: base_price } — 백엔드 슬라이딩 반영

  const wsRef = useRef(null);
  const tradesRef = useRef([]);

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

  // 가격 감지 시 timestamp 업데이트 → TradeRow가 항상 새로운 값으로 animation 실행
  const flashDetection = useCallback((tradeId) => {
    setDetectedTicks((prev) => ({ ...prev, [tradeId]: Date.now() }));
  }, []);

  // 백엔드 WS 메시지 파싱 (JSON: { ticker, price, rate, mtyp, khms })
  const handleWsMessage = useCallback(
    (raw) => {
      try {
        const { ticker, price, base_price, mtyp, khms } = JSON.parse(raw);
        const mtypLabel = { '1': '장중', '2': '장전', '3': '장후' }[mtyp] || `MTYP=${mtyp}`;
        console.log(`[Backend WS] 가격 수신 - ${ticker}: ${price} (${khms}, ${mtypLabel})`);

        const normalized = normalizeTicker(ticker);
        const numPrice = Number(price);
        if (Number.isFinite(numPrice) && numPrice > 0) {
          setCurrentPrices((prev) => ({ ...prev, [normalized]: numPrice }));
        }
        const numBase = Number(base_price);
        if (Number.isFinite(numBase) && numBase > 0) {
          setCurrentBases((prev) => ({ ...prev, [normalized]: numBase }));
        }

        const trade = tradesRef.current.find(
          (t) => normalizeTicker(t.ticker) === normalized
        );
        if (!trade) return;

        flashDetection(trade.id);
      } catch (e) {
        console.warn('[Backend WS] 메시지 파싱 실패:', e.message);
      }
    },
    [flashDetection]
  );

  // 백엔드 WebSocket 연결 (KIS 직접 연결 제거 — 백엔드가 중계)
  const connectAndSubscribe = useCallback(async () => {
    try {
      const jwt = await getStoredJwt();
      if (!jwt) {
        console.log('[Backend WS] JWT 없음 - 연결 생략 (비로그인)');
        return;
      }
      const wsUrl = `${BACKEND_WS_URL}?token=${encodeURIComponent(jwt)}`;
      console.log('[Backend WS] 연결 시도');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => console.log('[Backend WS] 연결 성공 ✓');
      ws.onmessage = (event) => handleWsMessage(event.data);
      ws.onerror = (e) => console.error('[Backend WS] 에러:', e?.message || e);
      ws.onclose = () => {
        console.log('[Backend WS] 연결 끊김');
        wsRef.current = null;
      };
    } catch (e) {
      console.error('[Backend WS] 연결 실패:', e.message);
    }
  }, [handleWsMessage]);

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
    if (activeTrades.length === 0) {
      console.log('[Realtime] 활성 종목이 없으므로 WS 연결 안 함');
      return;
    }

    connectAndSubscribe();
  }, [connectAndSubscribe]);

  useEffect(() => {
    initializeRealtime();

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (_e) {}
        wsRef.current = null;
      }
    };
  }, [initializeRealtime]);

  // 앱이 background → foreground로 복귀하면 WS 상태 점검 후 끊겨있으면 재연결.
  // iOS는 background 진입 시 WebSocket을 강제로 종료시켜서 그냥 두면 가격 수신이 멈춤.
  useEffect(() => {
    const appStateRef = { current: AppState.currentState };
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (
        (prev === 'background' || prev === 'inactive') &&
        nextState === 'active'
      ) {
        const ws = wsRef.current;
        const isOpen = ws && ws.readyState === WebSocket.OPEN;
        console.log(
          `[Realtime] 앱 foreground 복귀 (WS=${isOpen ? 'OPEN' : '끊김'})`
        );
        if (!isOpen) {
          initializeRealtime();
        }
      }
    });
    return () => subscription.remove();
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

    if (data?.status === 'unauthorized') {
      Alert.alert('로그인 필요', '실시간 감지는 로그인 후 이용할 수 있어요.');
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
        gap_qty: String(item.gap_qty ?? 1),
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

  // 마켓별 필터링
  const filteredTrades = trades.filter((trade) => {
    if (marketFilter === 'all') return true;
    const isDomestic = ['KRX', 'KOSDAQ'].includes(trade.market);
    return marketFilter === 'domestic' ? isDomestic : !isDomestic;
  });

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

      {/* 마켓 필터 탭 */}
      <View style={styles.filterRow}>
        <SegmentControl
          tabs={[
            { key: 'all', label: '전체' },
            { key: 'domestic', label: '국내' },
            { key: 'overseas', label: '미국' },
          ]}
          activeTab={marketFilter}
          onTabChange={setMarketFilter}
          style={styles.filterControl}
        />
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
          {filteredTrades.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.listCard}>
              {filteredTrades.map((trade, i) => (
                <TradeRow
                  key={trade.id}
                  item={trade}
                  isLast={i === filteredTrades.length - 1}
                  onPress={handlePress}
                  onToggle={handleToggle}
                  flashTick={detectedTicks[trade.id]}
                  currentPrice={currentPrices[normalizeTicker(trade.ticker)]}
                  currentBase={currentBases[normalizeTicker(trade.ticker)]}
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
  filterRow: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  filterControl: {
    width: '100%',
    marginHorizontal: 0,
    marginVertical: 0,
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
  tradePriceBlock: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  tradeCurrentPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  tradeDiffPct: {
    fontSize: 12,
    fontWeight: '600',
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
