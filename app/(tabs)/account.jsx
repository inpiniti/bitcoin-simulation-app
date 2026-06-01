/**
 * 계좌 탭 — KIS 잔고 + 예수금 + 매수/매도 (원화/달러 토글 및 실시간 감지/레벨링 탑재)
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
  Image,
  TouchableOpacity,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { Button } from '../../components/tds/Button';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { SegmentControl } from '../../components/tds/SegmentControl';
import { fetchKisFullBalance, fetchKisDomesticBalance, submitKisOrder } from '../../lib/kisApi';
import { fetchDetectionStatus, fetchRealtimeTrades } from '../../lib/realtimeApi';
import { getStoredJwt } from '../../lib/authApi';
import { sampleAccount } from '../../lib/sampleData';
import useStore from '../../store/useStore';
import { getPriceColor, formatRate, formatPrice } from '../../utils/price';
import { LogoBadge } from '../../components/tds/LogoBadge';

const levelImages = {
  0: require('../../assets/level/0.png'),
  1: require('../../assets/level/1.png'),
  2: require('../../assets/level/2.png'),
  3: require('../../assets/level/3.png'),
  4: require('../../assets/level/4.png'),
  5: require('../../assets/level/5.png'),
  6: require('../../assets/level/6.png'),
  7: require('../../assets/level/7.png'),
  8: require('../../assets/level/8.png'),
  9: require('../../assets/level/9.png'),
  10: require('../../assets/level/10.png'),
  11: require('../../assets/level/11.png'),
  12: require('../../assets/level/12.png'),
  13: require('../../assets/level/13.png'),
  14: require('../../assets/level/14.png'),
  15: require('../../assets/level/15.png'),
  16: require('../../assets/level/16.png'),
  17: require('../../assets/level/17.png'),
  18: require('../../assets/level/18.png'),
  19: require('../../assets/level/19.png'),
  20: require('../../assets/level/20.png'),
  21: require('../../assets/level/21.png'),
  22: require('../../assets/level/22.png'),
  23: require('../../assets/level/23.png'),
};

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
  return `₩${Math.round(value).toLocaleString('ko-KR')}`;
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
function HoldingRow({ item, currency, flashTick, matchingTrade, liveBasePrice, onPress }) {
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
    outputRange: ['transparent', `${tdsColors.blue500}25`],
  });

  const evalAmt = currency === 'USD' ? item.eval_amount_usd : item.eval_amount_krw;
  const buyAmt = currency === 'USD' ? item.buy_amount_usd : item.buy_amount_krw;

  // 레벨링 계산
  let level = 0;
  let hasRealtime = false;
  let levelImage = null;
  let gapProfitRate = 0;
  let basePrice = 0;
  let currentPrice = 0;
  let ratio = 0;

  if (matchingTrade) {
    hasRealtime = true;
    const gap = Number(matchingTrade.gap) || 1;
    const qty = Number(item.qty) || 0;
    
    // ✅ 사용자의 수정 요건: 수량을 갭 수량(gap_qty)으로 나누어 정확히 계산
    const gapQty = Number(matchingTrade.gap_qty) || Number(matchingTrade.quantity) || gap || 1;
    level = Math.ceil(qty / gapQty);
    
    const safeLevel = Math.max(0, Math.min(23, level));
    levelImage = levelImages[safeLevel];

    basePrice = Number(liveBasePrice) || Number(matchingTrade.base_price) || 0;
    currentPrice = Number(item.current_price_usd) || 0;
    if (basePrice > 0) {
      gapProfitRate = ((currentPrice - basePrice) / basePrice) * 100;
      ratio = gap > 0 ? gapProfitRate / gap : 0;
      ratio = Math.max(-1, Math.min(1, ratio)); // -100% ~ 100% 범위 제한
    }
  }

  const profitColor = getPriceColor(item.profit_rate);
  const gapSign = gapProfitRate > 0 ? '+' : '';

  return (
    <Animated.View style={[styles.holdingCard, { backgroundColor: bg }]}>
      <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.8} style={styles.cardTouchArea}>
        {/* 가로 2분할 레이아웃: 왼쪽(수치 및 게이지바 융합) + 오른쪽(레벨 캐릭터 단독 광활 스페이스) */}
        <View style={styles.cardMainRow}>
          
          {/* [좌측 블록]: 텍스트 수치들 및 실시간 슬라이딩 게이지바를 수직 통합 */}
          <View style={styles.leftContentBlock}>
            {/* 상단 텍스트 정보 영역 (종목명, 평가매입액, 수익률) */}
            <View style={styles.leftTopTextRow}>
              {/* 종목명 및 수량 */}
              <View style={styles.headerLeft}>
                <LogoBadge name={item.name} ticker={item.ticker} size={40} />
                <View style={styles.nameTickerBlock}>
                  <Text style={styles.cardItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardItemMeta}>{item.ticker} · {item.qty}주</Text>
                </View>
              </View>

              {/* 평가/매입/수익률을 왼쪽 밀착해서 배치 */}
              <View style={styles.priceDataBlock}>
                <Text style={[styles.cardItemRate, { color: profitColor }]}>
                  {formatRate(item.profit_rate)}
                </Text>
                <Text style={styles.cardItemEval} numberOfLines={1}>평가 {formatCurrency(evalAmt, currency)}</Text>
                <Text style={styles.cardItemBuy} numberOfLines={1}>매입 {formatCurrency(buyAmt, currency)}</Text>
              </View>
            </View>

            {/* 게이지바 영역 (좌측 블록 내부의 하단에 컴팩트하게 합체!) */}
            {hasRealtime && (
              <View style={styles.gaugeInlineContainer}>
                {/* 1줄 통합 가격 텍스트 요약 */}
                <View style={styles.gaugeSummaryRow}>
                  <Text style={styles.gaugeSummaryText} numberOfLines={1}>
                    기준 ${basePrice.toFixed(2)} · 현재 ${currentPrice.toFixed(2)} ({gapSign}{gapProfitRate.toFixed(2)}%)
                  </Text>
                  <Text style={styles.gaugeSummaryGapText}>갭 {matchingTrade.gap}%</Text>
                </View>

                {/* 극단적으로 얇아진 게이지바 (6px) */}
                <View style={styles.gaugeBarBackground}>
                  {/* 50% 중앙 기준선 */}
                  <View style={styles.gaugeCenterLine} />
                  
                  {/* 게이지 바 채우기 */}
                  <View
                    style={[
                      styles.gaugeBarFill,
                      ratio >= 0 ? styles.gaugeBarFillUp : styles.gaugeBarFillDown,
                      ratio >= 0
                        ? { left: '50%', width: `${ratio * 50}%` }
                        : { right: '50%', width: `${Math.abs(ratio) * 50}%` }
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          {/* [우측 블록]: 오직 큼직하고 시원한 레벨 캐릭터와 레벨만을 위한 단독 럭셔리 스페이스! */}
          {hasRealtime && (
            <View style={styles.rightLevelBlock}>
              <View style={styles.levelImageWrapper}>
                {levelImage && (
                  <Image source={levelImage} style={styles.levelImage} resizeMode="contain" />
                )}
              </View>
              <Text style={styles.levelText}>LV{level}</Text>
            </View>
          )}
          
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
export default function AccountScreen() {
  const authMode = useStore((s) => s.authMode);
  const marketType = useStore((s) => s.marketType); // 'overseas' | 'domestic' — 포트폴리오 탭과 공유
  const setMarketType = useStore((s) => s.setMarketType);
  const [fullData, setFullData] = useState(null);
  const [domesticData, setDomesticData] = useState(null);
  const [realtimeTrades, setRealtimeTrades] = useState([]); // 실시간 매매 설정 목록 추가
  const [currency, setCurrency] = useState('KRW'); // 'KRW' | 'USD'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 실시간 가격 (USD) — 백엔드 WebSocket으로 수신. 키: 정규화 ticker
  const [livePricesUsd, setLivePricesUsd] = useState({});
  // 실시간 백엔드 슬라이딩 기준가
  const [liveBasesUsd, setLiveBasesUsd] = useState({});
  // 마지막 갱신 시각 (페이드 트리거용)
  const [liveTicks, setLiveTicks] = useState({});
  const wsRef = useRef(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      if (authMode === 'guest' || authMode === 'locked') {
        // 샘플 데이터 구성 (그림과 완벽히 일치하는 고화질 샘플 데이터)
        setFullData({
          krw: { totalAsset: 16861610, evalAmount: 13566520, depositAmount: 3295090, profitRate: -1.40, profitAmount: -192177 },
          usd: { totalAsset: 92450, evalAmount: 62450, depositAmount: 30000, profitRate: 15.2, profitAmount: 8200 },
          holdings: [
            {
              ticker: 'AAPL',
              name: '애플',
              qty: 1,
              profit_rate: -0.39,
              avg_price_usd: 171.80,
              current_price_usd: 171.45,
              buy_amount_usd: 171.80,
              eval_amount_usd: 171.45,
              avg_price_krw: 468727,
              current_price_krw: 466908,
              buy_amount_krw: 468727,
              eval_amount_krw: 466908,
            },
            {
              ticker: 'AMZN',
              name: '아마존닷컴',
              qty: 4,
              profit_rate: -1.20,
              avg_price_usd: 180.0,
              current_price_usd: 177.84,
              buy_amount_usd: 720.0,
              eval_amount_usd: 711.36,
              avg_price_krw: 407051,
              current_price_krw: 402151,
              buy_amount_krw: 1628206,
              eval_amount_krw: 1608604,
            },
            {
              ticker: 'CRGX/CVR01',
              name: '카고 테라퓨틱스-CVR',
              qty: 15,
              profit_rate: 0.00,
              avg_price_usd: 0.00,
              current_price_usd: 0.00,
              buy_amount_usd: 0.00,
              eval_amount_usd: 0.00,
              avg_price_krw: 0,
              current_price_krw: 0,
              buy_amount_krw: 0,
              eval_amount_krw: 0,
            },
            {
              ticker: 'GOOG',
              name: '알파벳 C',
              qty: 5,
              profit_rate: -3.25,
              avg_price_usd: 222.68,
              current_price_usd: 215.45,
              buy_amount_usd: 1113.40,
              eval_amount_usd: 1077.25,
              avg_price_krw: 578004,
              current_price_krw: 559235,
              buy_amount_krw: 2890022,
              eval_amount_krw: 2796177,
            },
            {
              ticker: 'BRK.B',
              name: '버크셔',
              qty: 1,
              profit_rate: -0.89,
              avg_price_usd: 477.82,
              current_price_usd: 473.57,
              buy_amount_usd: 477.82,
              eval_amount_usd: 473.57,
              avg_price_krw: 630000,
              current_price_krw: 624000,
              buy_amount_krw: 630000,
              eval_amount_krw: 624000,
            }
          ]
        });
        setDomesticData({
          summary: { totalAsset: 85000000, evalAmount: 55000000, depositAmount: 30000000, profitRate: 8.5, profitAmount: 4200000 },
          holdings: []
        });
        setRealtimeTrades([
          { ticker: 'AAPL', gap: 4, base_price: 176.50, gap_qty: 1 },
          { ticker: 'AMZN', gap: 5, base_price: 182.00, gap_qty: 2 },
          { ticker: 'GOOG', gap: 2, base_price: 212.51, gap_qty: 5, quantity: 5 },
          { ticker: 'BRK.B', gap: 1, base_price: 477.82, gap_qty: 1, quantity: 1 }
        ]);
        setNotice('비로그인 모드라서 샘플 계좌 데이터를 보여주고 있어요.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const [overseasRes, domesticRes] = await Promise.all([
          fetchKisFullBalance().catch(() => null),
          fetchKisDomesticBalance().catch(() => null),
        ]);
        setFullData(overseasRes || { krw: {}, usd: {}, holdings: [] });
        setDomesticData(domesticRes || { summary: {}, holdings: [] });

        // 실시간 매매 설정 정보 추가 로드
        const { data: rtData } = await fetchRealtimeTrades().catch(() => ({ data: null }));
        if (rtData) {
          setRealtimeTrades(rtData);
        }

        setNotice(null);
      } catch (e) {
        setNotice('연결 전 화면을 미리 보고 있어요. 계좌 정보는 샘플 데이터로 보여주고 있어요.');
        setFullData({
          krw: { totalAsset: 16861610, evalAmount: 13566520, depositAmount: 3295090, profitRate: -1.40, profitAmount: -192177 },
          usd: { totalAsset: 92450, evalAmount: 62450, depositAmount: 30000, profitRate: 15.2, profitAmount: 8200 },
          holdings: [
            {
              ticker: 'AAPL',
              name: '애플',
              qty: 1,
              profit_rate: -0.39,
              avg_price_usd: 171.80,
              current_price_usd: 171.45,
              buy_amount_usd: 171.80,
              eval_amount_usd: 171.45,
              avg_price_krw: 468727,
              current_price_krw: 466908,
              buy_amount_krw: 468727,
              eval_amount_krw: 466908,
            },
            {
              ticker: 'AMZN',
              name: '아마존닷컴',
              qty: 4,
              profit_rate: -1.20,
              avg_price_usd: 180.0,
              current_price_usd: 177.84,
              buy_amount_usd: 720.0,
              eval_amount_usd: 711.36,
              avg_price_krw: 407051,
              current_price_krw: 402151,
              buy_amount_krw: 1628206,
              eval_amount_krw: 1608604,
            },
            {
              ticker: 'CRGX/CVR01',
              name: '카고 테라퓨틱스-CVR',
              qty: 15,
              profit_rate: 0.00,
              avg_price_usd: 0.00,
              current_price_usd: 0.00,
              buy_amount_usd: 0.00,
              eval_amount_usd: 0.00,
              avg_price_krw: 0,
              current_price_krw: 0,
              buy_amount_krw: 0,
              eval_amount_krw: 0,
            },
            {
              ticker: 'GOOG',
              name: '알파벳 C',
              qty: 5,
              profit_rate: -3.25,
              avg_price_usd: 222.68,
              current_price_usd: 215.45,
              buy_amount_usd: 1113.40,
              eval_amount_usd: 1077.25,
              avg_price_krw: 578004,
              current_price_krw: 559235,
              buy_amount_krw: 2890022,
              eval_amount_krw: 2796177,
            },
            {
              ticker: 'BRK.B',
              name: '버크셔',
              qty: 1,
              profit_rate: -0.89,
              avg_price_usd: 477.82,
              current_price_usd: 473.57,
              buy_amount_usd: 477.82,
              eval_amount_usd: 473.57,
              avg_price_krw: 630000,
              current_price_krw: 624000,
              buy_amount_krw: 630000,
              eval_amount_krw: 624000,
            }
          ]
        });
        setDomesticData({
          summary: { totalAsset: 85000000, evalAmount: 55000000, depositAmount: 30000000, profitRate: 8.5, profitAmount: 4200000 },
          holdings: []
        });
        setRealtimeTrades([
          { ticker: 'AAPL', gap: 4, base_price: 176.50 },
          { ticker: 'AMZN', gap: 5, base_price: 182.00 },
          { ticker: 'GOOG', gap: 2, base_price: 212.51, quantity: 5 },
          { ticker: 'BRK.B', gap: 1, base_price: 477.82, quantity: 1 }
        ]);
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
      
      const jwt = await getStoredJwt();
      if (!jwt) {
        console.log('[Account WS] JWT 없음 - 연결 생략 (비로그인)');
        return;
      }
      
      const wsUrl = `${BACKEND_WS_URL}?token=${encodeURIComponent(jwt)}`;
      console.log('[Account WS] 연결 시도');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => console.log('[Account WS] 연결 성공 ✓');
      ws.onmessage = (event) => {
        try {
          const { ticker, price, base_price } = JSON.parse(event.data);
          const normalized = normalizeTicker(ticker);
          
          const numPrice = Number(price);
          if (Number.isFinite(numPrice) && numPrice > 0) {
            setLivePricesUsd((prev) =>
              prev[normalized] === numPrice ? prev : { ...prev, [normalized]: numPrice }
            );
            setLiveTicks((prev) => ({ ...prev, [normalized]: Date.now() }));
          }

          const numBase = Number(base_price);
          if (Number.isFinite(numBase) && numBase > 0) {
            setLiveBasesUsd((prev) =>
              prev[normalized] === numBase ? prev : { ...prev, [normalized]: numBase }
            );
          }
        } catch (_e) {
          console.warn('[Account WS] 메시지 파싱 실패:', _e.message);
        }
      };
      ws.onclose = () => {
        console.log('[Account WS] 연결 끊김');
        wsRef.current = null;
      };
    } catch (_e) {
      console.error('[Account WS] 연결 실패:', _e.message);
    }
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

  // ─── 마켓별 데이터 선택 ────────────────────────────────────────────
  const isOverseas = marketType === 'overseas';
  const selectedData = isOverseas ? fullData : domesticData;
  const baseSummary = isOverseas
    ? (currency === 'KRW' ? fullData?.krw : fullData?.usd)
    : domesticData?.summary;
  const baseBalance = selectedData?.holdings || [];

  // 실시간 가격이 있는 종목은 평가금액/수익률을 재계산.
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
          <View style={{ gap: 8 }}>
            <SegmentControl
              tabs={[
                { key: 'domestic', label: '국내' },
                { key: 'overseas', label: '미국' },
              ]}
              activeTab={marketType}
              onTabChange={setMarketType}
              style={styles.headerToggle}
            />
            {isOverseas && (
              <SegmentControl
                tabs={[
                  { key: 'KRW', label: '원화' },
                  { key: 'USD', label: '달러' },
                ]}
                activeTab={currency}
                onTabChange={setCurrency}
                style={styles.headerToggle}
              />
            )}
          </View>
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
              <Text style={styles.depositSubLabel}>실 자산 ({isOverseas ? currency : 'KRW'})</Text>
              <Text style={styles.depositAmount}>{formatCurrency(currentSummary?.totalAsset, isOverseas ? currency : 'KRW')}</Text>
              <View style={styles.depositSubRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.depositItemLabel}>예수금</Text>
                  <Text style={styles.depositItemValue}>{formatCurrency(currentSummary?.depositAmount, isOverseas ? currency : 'KRW')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.depositItemLabel}>평가금액</Text>
                  <Text style={styles.depositItemValue}>{formatCurrency(currentSummary?.evalAmount, isOverseas ? currency : 'KRW')}</Text>
                </View>
              </View>
            </View>

            <PortfolioSummary
              balance={balance}
              summary={currentSummary}
              currency={isOverseas ? currency : 'KRW'}
            />

            <View style={styles.holdingsHeader}>
              <Text style={styles.sectionTitle}>보유잔고 · {balance.length}개</Text>
            </View>

            <View style={styles.listCard}>
              {balance.map((item) => (
                <HoldingRow
                  key={item.ticker}
                  item={item}
                  currency={isOverseas ? currency : 'KRW'}
                  flashTick={liveTicks[normalizeTicker(item.ticker)]}
                  matchingTrade={realtimeTrades.find(
                    (t) => normalizeTicker(t.ticker) === normalizeTicker(item.ticker)
                  )}
                  liveBasePrice={liveBasesUsd[normalizeTicker(item.ticker)]}
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
          const cur = isOverseas ? currency : 'KRW';
          const evalAmt = cur === 'USD' ? selected.eval_amount_usd : (selected.eval_amount_krw || selected.eval_amount);
          const buyAmt = cur === 'USD' ? selected.buy_amount_usd : (selected.buy_amount_krw || selected.buy_amount);
          const curPrice = cur === 'USD' ? selected.current_price_usd : (selected.current_price_krw || selected.current_price);
          const profitAmt = cur === 'USD' ? selected.profit_amount_usd : (selected.profit_amount_krw || selected.profit_amount);
          return (
            <View style={{ paddingBottom: 20 }}>
              <Text style={styles.sheetCode}>{selected.ticker}</Text>
              <Text style={styles.sheetPriceMain}>{formatCurrency(curPrice, cur)}</Text>
              <View style={styles.orderRow}>
                <Text style={styles.sheetLabel}>보유 수량</Text>
                <Text style={styles.sheetValue}>{selected.qty}주</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.sheetLabel}>매입금액</Text>
                <Text style={styles.sheetValue}>{formatCurrency(buyAmt, cur)}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.sheetLabel}>평가금액</Text>
                <Text style={styles.sheetValue}>{formatCurrency(evalAmt, cur)}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.sheetLabel}>평가손익</Text>
                <Text style={[styles.sheetValue, { color: getPriceColor(profitAmt) }]}>
                  {formatSignedCurrency(profitAmt, cur)}
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
  listCard: { backgroundColor: 'transparent', borderTopWidth: 0, paddingHorizontal: 0, gap: 0 },
  
  // 개별 홀딩 카드 스타일 (좌우 꽉 차고 종목 간 간격이 없도록 원복)
  holdingCard: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: tdsDark.border,
    overflow: 'hidden',
  },
  cardTouchArea: {
    paddingHorizontal: 16,
    paddingVertical: 12, // 극도로 좁게 압축
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContentBlock: {
    flex: 1,
    paddingRight: 12,
  },
  leftTopTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1.1,
  },
  nameTickerBlock: {
    flex: 1,
  },
  cardItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    letterSpacing: -0.3,
  },
  cardItemMeta: {
    fontSize: 11,
    color: tdsDark.textTertiary,
    marginTop: 2,
  },
  priceDataBlock: {
    alignItems: 'flex-end',
    flex: 0.9,
  },
  cardItemRate: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardItemEval: {
    fontSize: 11,
    color: tdsDark.textSecondary,
    marginTop: 1,
  },
  cardItemBuy: {
    fontSize: 10,
    color: tdsDark.textTertiary,
    marginTop: 1,
  },
  
  // 인라인 실시간 게이지 영역 스타일 (좌측 하단 융합)
  gaugeInlineContainer: {
    marginTop: 6,
  },
  gaugeSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  gaugeSummaryText: {
    fontSize: 10,
    fontWeight: '600',
    color: tdsDark.textSecondary,
  },
  gaugeSummaryGapText: {
    fontSize: 10,
    fontWeight: '700',
    color: tdsDark.textSecondary,
  },
  gaugeBarBackground: {
    height: 6, // 얇고 세련된 6px 라인
    backgroundColor: tdsDark.border,
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  gaugeCenterLine: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: '100%',
    backgroundColor: tdsDark.textTertiary,
    zIndex: 1,
  },
  gaugeBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
    zIndex: 2,
  },
  gaugeBarFillUp: {
    backgroundColor: tdsColors.red500,
  },
  gaugeBarFillDown: {
    backgroundColor: tdsColors.blue500,
  },
  
  // [우측 블록] 캐릭터 레벨 전용 단독 광활 공간 스타일!
  rightLevelBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    borderLeftWidth: 1,
    borderLeftColor: tdsDark.border,
    paddingLeft: 8,
    height: 52, // 좌측 수직 높이에 딱 맞게 조율
    gap: 2,
  },
  levelImageWrapper: {
    width: 38, // 큼직하고 시원한 38px
    height: 38,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelImage: {
    width: 36, // 캐릭터 본체 36px 대형화!
    height: 36,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    textAlign: 'center',
  },
  sheetCtaRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  sheetCode: { fontSize: 13, color: tdsDark.textTertiary, marginBottom: 4 },
  sheetPriceMain: { fontSize: 32, fontWeight: '700', color: tdsDark.textPrimary, marginBottom: 16 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sheetLabel: { fontSize: 14, color: tdsDark.textSecondary },
  sheetValue: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
});
