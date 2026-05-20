/**
 * 계좌 탭 — KIS 잔고 + 예수금 + 매수/매도 (원화/달러 토글 추가)
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  AppState,
  Animated,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { ListRow } from '../../components/tds/ListRow';
import { Button } from '../../components/tds/Button';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { SegmentControl } from '../../components/tds/SegmentControl';
import { fetchKisFullBalance, submitKisOrder } from '../../lib/kisApi';
import { fetchDetectionStatus } from '../../lib/realtimeApi';
import { sampleAccount } from '../../lib/sampleData';
import useStore from '../../store/useStore';
import { getPriceColor, formatRate, formatPrice } from '../../utils/price';
import { LogoBadge } from '../../components/tds/LogoBadge';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://younginpiniti-bitcoin-ai-backend.hf.space';
const BACKEND_WS_URL =
  API_BASE.replace('https://', 'wss://').replace('http://', 'ws://') +
  '/realtime/ws';

function normalizeTicker(t) {
  return String(t || '').toUpperCase().replace(/[-./]/g, '');
}

function formatCurrency(value, currency) {
  if (value == null) return '-';
  if (currency === 'USD') {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₩${value.toLocaleString('ko-KR')}`;
}

function formatSignedCurrency(value, currency) {
  if (value == null) return '-';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatCurrency(Math.abs(value), currency)}`;
}

// ─── 포트폴리오 요약 ──────────────────────────────────────────────────────────

function PortfolioSummary({ balance, summary, currency }) {
  if (!balance || balance.length === 0) return null;

  const avgRate = summary?.profitRate ?? 0;
  const rateColor = getPriceColor(avgRate);
  const profitAmount = summary?.profitAmount ?? 0;
  const profitColor = getPriceColor(profitAmount);

  return (
    <View style={styles.portfolioCard}>
      <View style={styles.portfolioTopRow}>
        <Text style={styles.portfolioTitle}>{balance.length}종목 보유 중</Text>
        <View style={styles.portfolioMetaRight}>
          <Text style={[styles.portfolioAvgRate, { color: rateColor }]}>
            평균 {formatRate(avgRate)}
          </Text>
          <Text style={[styles.portfolioProfit, { color: profitColor }]}>
            평가손익 {formatSignedCurrency(profitAmount, currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// 보유종목 행 — flashTick(timestamp)가 바뀌면 옅은 파란색에서 페이드 아웃
function HoldingRow({ item, currency, flashTick, onPress }) {
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
  const bg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', `${tdsColors.blue500}25`],
  });

  const evalAmt = currency === 'USD' ? item.eval_amount_usd : item.eval_amount_krw;
  const buyAmt = currency === 'USD' ? item.buy_amount_usd : item.buy_amount_krw;

  return (
    <Animated.View style={{ backgroundColor: bg }}>
      <ListRow
        onPress={() => onPress(item)}
        left={<LogoBadge name={item.name} ticker={item.ticker} size={44} />}
        title={item.name}
        subtitle={`${item.ticker} · ${item.qty}주`}
        right={
          <View style={styles.rightBlock}>
            <Text style={[styles.rateText, { color: getPriceColor(item.profit_rate) }]}>
              {formatRate(item.profit_rate)}
            </Text>
            <Text style={styles.priceSmall}>평가 {formatCurrency(evalAmt, currency)}</Text>
            <Text style={styles.priceSmallMuted}>매입 {formatCurrency(buyAmt, currency)}</Text>
          </View>
        }
      />
    </Animated.View>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const authMode = useStore((s) => s.authMode);
  const [fullData, setFullData] = useState(null);
  const [currency, setCurrency] = useState('KRW'); // 'KRW' | 'USD'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 실시간 가격 (USD) — 백엔드 WebSocket으로 수신. 키: 정규화 ticker
  const [livePricesUsd, setLivePricesUsd] = useState({});
  // 마지막 갱신 시각 (페이드 트리거용)
  const [liveTicks, setLiveTicks] = useState({});
  const wsRef = useRef(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      if (authMode === 'guest' || authMode === 'locked') {
        // 샘플 데이터 구성
        setFullData({
          krw: { totalAsset: 125400000, evalAmount: 85400000, depositAmount: 40000000, profitRate: 12.5, profitAmount: 9500000 },
          usd: { totalAsset: 92450, evalAmount: 62450, depositAmount: 30000, profitRate: 15.2, profitAmount: 8200 },
          holdings: sampleAccount.balance
        });
        setNotice('비로그인 모드라서 샘플 계좌 데이터를 보여주고 있어요.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const data = await fetchKisFullBalance();
        setFullData(data);
        setNotice(null);
      } catch (e) {
        setNotice('연결 전 화면을 미리 보고 있어요. 계좌 정보는 샘플 데이터로 보여주고 있어요.');
        setFullData({
          krw: { totalAsset: 125400000, evalAmount: 85400000, depositAmount: 40000000, profitRate: 12.5, profitAmount: 9500000 },
          usd: { totalAsset: 92450, evalAmount: 62450, depositAmount: 30000, profitRate: 15.2, profitAmount: 8200 },
          holdings: sampleAccount.balance
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authMode],
  );

  useEffect(() => {
    load();
  }, [load]);

  // ─── 실시간 가격 WebSocket ────────────────────────────────────
  const connectWs = useCallback(async () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_e) {}
      wsRef.current = null;
    }
    try {
      const { data: statusData } = await fetchDetectionStatus();
      if (!statusData?.running) return; // 서버 감지 안 돌면 연결 안 함
      const ws = new WebSocket(BACKEND_WS_URL);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const { ticker, price } = JSON.parse(event.data);
          const normalized = normalizeTicker(ticker);
          const numPrice = Number(price);
          if (Number.isFinite(numPrice) && numPrice > 0) {
            setLivePricesUsd((prev) =>
              prev[normalized] === numPrice ? prev : { ...prev, [normalized]: numPrice }
            );
            setLiveTicks((prev) => ({ ...prev, [normalized]: Date.now() }));
          }
        } catch (_e) {}
      };
      ws.onclose = () => { wsRef.current = null; };
    } catch (_e) {}
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (_e) {}
        wsRef.current = null;
      }
    };
  }, [connectWs]);

  // foreground 복귀 시 WS 끊겼으면 재연결 (iOS background에서 강제 종료 대응)
  useEffect(() => {
    const appStateRef = { current: AppState.currentState };
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if ((prev === 'background' || prev === 'inactive') && next === 'active') {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) connectWs();
      }
    });
    return () => sub.remove();
  }, [connectWs]);

  // ─── 실시간 가격 반영한 holdings/summary 계산 ────────────────────
  const baseSummary = currency === 'KRW' ? fullData?.krw : fullData?.usd;
  const baseBalance = fullData?.holdings || [];

  // 실시간 가격이 있는 종목은 평가금액/수익률을 재계산.
  // KRW는 보유데이터의 (current_price_krw / current_price_usd) 비율을 환율로 사용.
  const balance = useMemo(() => {
    if (Object.keys(livePricesUsd).length === 0) return baseBalance;
    return baseBalance.map((item) => {
      const normalized = normalizeTicker(item.ticker);
      const liveUsd = livePricesUsd[normalized];
      if (!Number.isFinite(liveUsd) || liveUsd <= 0) return item;
      const qty = Number(item.qty) || 0;
      const newEvalUsd = liveUsd * qty;
      const buyUsd = Number(item.buy_amount_usd) || 0;
      const newProfitUsd = newEvalUsd - buyUsd;
      const newProfitRate = buyUsd > 0 ? (newProfitUsd / buyUsd) * 100 : item.profit_rate;
      const fxRate =
        item.current_price_usd > 0
          ? (Number(item.current_price_krw) || 0) / Number(item.current_price_usd)
          : 0;
      const newEvalKrw = fxRate > 0 ? newEvalUsd * fxRate : item.eval_amount_krw;
      const newProfitKrw = fxRate > 0 ? newProfitUsd * fxRate : item.profit_amount_krw;
      return {
        ...item,
        current_price_usd: liveUsd,
        current_price_krw: fxRate > 0 ? liveUsd * fxRate : item.current_price_krw,
        eval_amount_usd: newEvalUsd,
        eval_amount_krw: newEvalKrw,
        profit_amount_usd: newProfitUsd,
        profit_amount_krw: newProfitKrw,
        profit_rate: newProfitRate,
      };
    });
  }, [baseBalance, livePricesUsd]);

  // 전체 summary 재계산 (예수금은 그대로)
  const currentSummary = useMemo(() => {
    if (!baseSummary) return baseSummary;
    if (Object.keys(livePricesUsd).length === 0 || balance.length === 0) return baseSummary;
    const evalKey = currency === 'USD' ? 'eval_amount_usd' : 'eval_amount_krw';
    const profitKey = currency === 'USD' ? 'profit_amount_usd' : 'profit_amount_krw';
    const buyKey = currency === 'USD' ? 'buy_amount_usd' : 'buy_amount_krw';
    const evalAmount = balance.reduce((s, b) => s + (Number(b[evalKey]) || 0), 0);
    const profitAmount = balance.reduce((s, b) => s + (Number(b[profitKey]) || 0), 0);
    const buyTotal = balance.reduce((s, b) => s + (Number(b[buyKey]) || 0), 0);
    const profitRate = buyTotal > 0 ? (profitAmount / buyTotal) * 100 : baseSummary.profitRate;
    const deposit = Number(baseSummary.depositAmount) || 0;
    return {
      ...baseSummary,
      evalAmount,
      profitAmount,
      profitRate,
      totalAsset: evalAmount + deposit,
    };
  }, [baseSummary, balance, livePricesUsd, currency]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={tdsColors.blue500} />
        }
      >
        <View style={styles.screenHeader}>
          <View>
            <Text style={styles.headerEyebrow}>계좌 · 자산</Text>
            <Text style={styles.headerTitle}>내 자산</Text>
          </View>
          <SegmentControl
            tabs={[
              { key: 'KRW', label: '원화' },
              { key: 'USD', label: '달러' },
            ]}
            activeTab={currency}
            onTabChange={setCurrency}
            style={styles.headerToggle}
          />
        </View>

        {notice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={tdsColors.blue500} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.depositSection}>
              <Text style={styles.depositSubLabel}>실 자산 ({currency})</Text>
              <Text style={styles.depositAmount}>{formatCurrency(currentSummary?.totalAsset, currency)}</Text>
              <View style={styles.depositSubRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.depositItemLabel}>예수금</Text>
                  <Text style={styles.depositItemValue}>{formatCurrency(currentSummary?.depositAmount, currency)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.depositItemLabel}>평가금액</Text>
                  <Text style={styles.depositItemValue}>{formatCurrency(currentSummary?.evalAmount, currency)}</Text>
                </View>
              </View>
            </View>

            <PortfolioSummary 
              balance={balance} 
              summary={currentSummary} 
              currency={currency} 
            />

            <View style={styles.holdingsHeader}>
              <Text style={styles.sectionTitle}>보유잔고 · {balance.length}개</Text>
            </View>

            <View style={styles.listCard}>
              {balance.map((item) => (
                <HoldingRow
                  key={item.ticker}
                  item={item}
                  currency={currency}
                  flashTick={liveTicks[normalizeTicker(item.ticker)]}
                  onPress={(it) => {
                    setSelected(it);
                    setSheetOpen(true);
                  }}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={selected?.name}
        cta={
          <View style={styles.sheetCtaRow}>
            <Button onPress={() => setSheetOpen(false)} variant="weak" style={{ flex: 1 }}>닫기</Button>
            <Button onPress={() => Alert.alert('알림', '주문 기능은 준비 중입니다.')} style={{ flex: 1 }}>주문하기</Button>
          </View>
        }
      >
        {selected && (() => {
          const evalAmt = currency === 'USD' ? selected.eval_amount_usd : selected.eval_amount_krw;
          const buyAmt = currency === 'USD' ? selected.buy_amount_usd : selected.buy_amount_krw;
          const curPrice = currency === 'USD' ? selected.current_price_usd : selected.current_price_krw;
          const profitAmt = currency === 'USD' ? selected.profit_amount_usd : selected.profit_amount_krw;
          return (
            <View style={{ paddingBottom: 20 }}>
              <Text style={styles.sheetCode}>{selected.ticker}</Text>
              <Text style={styles.sheetPriceMain}>{formatCurrency(curPrice, currency)}</Text>
              <View style={styles.orderRow}>
                <Text style={styles.sheetLabel}>보유 수량</Text>
                <Text style={styles.sheetValue}>{selected.qty}주</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.sheetLabel}>매입금액</Text>
                <Text style={styles.sheetValue}>{formatCurrency(buyAmt, currency)}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.sheetLabel}>평가금액</Text>
                <Text style={styles.sheetValue}>{formatCurrency(evalAmt, currency)}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.sheetLabel}>평가손익</Text>
                <Text style={[styles.sheetValue, { color: getPriceColor(profitAmt) }]}>
                  {formatSignedCurrency(profitAmt, currency)}
                </Text>
              </View>
            </View>
          );
        })()}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  scroll: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 32 },
  screenHeader: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerEyebrow: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 2 },
  headerToggle: {
    width: 140,
    marginHorizontal: 0,
    marginVertical: 0,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    letterSpacing: -0.5,
  },
  noticeBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: tdsColors.blue50,
    borderRadius: 16,
  },
  noticeText: { fontSize: 13, color: tdsColors.blue700, lineHeight: 18 },
  depositSection: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 24,
    backgroundColor: tdsDark.bgCard,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  depositSubLabel: { fontSize: 13, color: tdsDark.textTertiary, marginBottom: 4 },
  depositAmount: { fontSize: 28, fontWeight: '700', color: tdsDark.textPrimary },
  depositSubRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  depositItemLabel: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 3 },
  depositItemValue: { fontSize: 15, fontWeight: '600', color: tdsDark.textSecondary },
  portfolioCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: tdsDark.bgCard,
  },
  portfolioTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  portfolioTitle: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
  portfolioMetaRight: { alignItems: 'flex-end', gap: 4 },
  portfolioAvgRate: { fontSize: 16, fontWeight: '700' },
  portfolioProfit: { fontSize: 13, fontWeight: '600' },
  holdingsHeader: { marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 13, color: tdsDark.textSecondary, marginHorizontal: 20, fontWeight: '600' },
  listCard: { backgroundColor: tdsDark.bgCard, borderTopWidth: 1, borderTopColor: tdsDark.border },
  rightBlock: { alignItems: 'flex-end' },
  rateText: { fontSize: 15, fontWeight: '700' },
  priceSmall: { fontSize: 12, color: tdsDark.textSecondary, marginTop: 2 },
  priceSmallMuted: { fontSize: 11, color: tdsDark.textTertiary, marginTop: 1 },
  sheetCtaRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  sheetCode: { fontSize: 13, color: tdsDark.textTertiary, marginBottom: 4 },
  sheetPriceMain: { fontSize: 32, fontWeight: '700', color: tdsDark.textPrimary, marginBottom: 16 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sheetLabel: { fontSize: 14, color: tdsDark.textSecondary },
  sheetValue: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
});
