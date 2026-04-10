/**
 * 계좌 탭 — KIS 잔고 + 예수금 + 매수/매도
 */
import { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { ListRow } from '../../components/tds/ListRow';
import { Button } from '../../components/tds/Button';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { fetchKisBalance, submitKisOrder } from '../../lib/kisApi';
import { sampleAccount } from '../../lib/sampleData';
import { getPriceColor, formatRate, formatPrice } from '../../utils/price';

// ─── 스켈레튼 행 ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '55%' }]} />
        <View style={[styles.skeletonLine, { width: '35%', marginTop: 8 }]} />
      </View>
      <View style={styles.skeletonRight}>
        <View style={[styles.skeletonLine, { width: 56 }]} />
        <View style={[styles.skeletonLine, { width: 48, marginTop: 8 }]} />
      </View>
    </View>
  );
}

// ─── 이니셜 뱃지 ──────────────────────────────────────────────────────────────

const BADGE_COLORS = ['#3182f6', '#f04452', '#03b26c', '#fe9800', '#8b5cf6', '#06b6d4'];

function InitialBadge({ name, ticker }) {
  const display = name || ticker || '?';
  const letter = display[0].toUpperCase();
  const bg = BADGE_COLORS[display.charCodeAt(0) % BADGE_COLORS.length];
  return (
    <View style={[styles.initialBadge, { backgroundColor: bg }]}>
      <Text style={styles.initialText}>{letter}</Text>
    </View>
  );
}

// ─── 포트폴리오 요약 ──────────────────────────────────────────────────────────

function PortfolioSummary({ balance }) {
  if (!balance || balance.length === 0) return null;
  const avgRate = balance.reduce((sum, b) => sum + (b.profit_rate || 0), 0) / balance.length;
  const rateColor = getPriceColor(avgRate);
  return (
    <View style={styles.portfolioCard}>
      <View style={styles.portfolioTopRow}>
        <Text style={styles.portfolioTitle}>{balance.length}종목 보유 중</Text>
        <Text style={[styles.portfolioAvgRate, { color: rateColor }]}>
          평균 {formatRate(avgRate)}
        </Text>
      </View>
      <View style={styles.portfolioChips}>
        {balance.map((b) => (
          <View key={b.ticker} style={styles.portfolioChip}>
            <Text style={styles.portfolioChipName}>{b.name}</Text>
            <Text style={[styles.portfolioChipRate, { color: getPriceColor(b.profit_rate) }]}>
              {formatRate(b.profit_rate)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── 주문 BottomSheet ─────────────────────────────────────────────────────────

function OrderSheet({ item, side, open, onClose, useSampleData }) {
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleOrder = useCallback(async () => {
    const quantity = parseInt(qty, 10);
    if (!quantity || quantity <= 0) {
      Alert.alert('오류', '올바른 수량을 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      if (!useSampleData) {
        await submitKisOrder({ ticker: item.ticker, quantity, side });
      }
      const label = side === 'buy' ? '매수' : '매도';
      const message = useSampleData
        ? `${item.name} ${quantity}주 ${label} 흐름을 샘플로 보여주고 있어요.`
        : `${item.name} ${quantity}주 ${label} 주문이 완료되었습니다.`;
      Alert.alert('주문 확인', message);
      onClose();
    } catch (e) {
      Alert.alert('주문 실패', e.message);
    } finally {
      setLoading(false);
    }
  }, [item, qty, side, onClose]);

  if (!item) return null;

  const label = side === 'buy' ? '매수' : '매도';
  const btnColor = side === 'buy' ? 'primary' : 'danger';

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${item.name} ${label}`}
      cta={
        <Button onPress={handleOrder} display="full" loading={loading} color={btnColor}>
          {label}하기
        </Button>
      }
    >
      <View style={styles.orderRow}>
        <Text style={styles.sheetLabel}>현재가</Text>
        <Text style={styles.sheetValue}>{formatPrice(item.current_price)}</Text>
      </View>
      <View style={styles.orderRow}>
        <Text style={styles.sheetLabel}>평균 구매가</Text>
        <Text style={styles.sheetValue}>{formatPrice(item.avg_price)}</Text>
      </View>
      <Text style={[styles.sheetLabel, { marginTop: 16, marginBottom: 6 }]}>수량</Text>
      <TextInput
        style={styles.qtyInput}
        value={qty}
        onChangeText={setQty}
        keyboardType="numeric"
        placeholder="수량 입력"
        placeholderTextColor={tdsDark.textTertiary}
      />
    </BottomSheet>
  );
}

// ─── 잔고 카드 ────────────────────────────────────────────────────────────────

function BalanceCard({ item, onOrder }) {
  const rateColor = getPriceColor(item.profit_rate);

  return (
    <ListRow
      left={<InitialBadge name={item.name} ticker={item.ticker} />}
      title={item.name}
      subtitle={item.ticker}
      right={
        <View style={styles.rightBlock}>
          <Text style={[styles.rateText, { color: rateColor }]}>
            {formatRate(item.profit_rate)}
          </Text>
          <Text style={styles.priceSmall}>
            구매 {formatPrice(item.avg_price)}
          </Text>
          <Text style={styles.priceSmall}>
            현재 {formatPrice(item.current_price)}
          </Text>
          <View style={styles.orderBtns}>
            <Button
              onPress={() => onOrder(item, 'sell')}
              size="small"
              variant="weak"
              color="danger"
              style={{ marginRight: 6 }}
            >
              매도
            </Button>
            <Button
              onPress={() => onOrder(item, 'buy')}
              size="small"
              variant="weak"
              color="primary"
            >
              매수
            </Button>
          </View>
        </View>
      }
    />
  );
}

// ─── 예수금 헤더 ──────────────────────────────────────────────────────────────

function DepositHeader({ deposit, balance }) {
  const evalAmount = balance.reduce(
    (sum, b) => sum + (b.current_price || b.avg_price || 0) * (b.qty || 0), 0
  );
  const total = deposit + evalAmount;
  return (
    <View style={styles.depositSection}>
      <Text style={styles.depositSubLabel}>싙 자산</Text>
      <Text style={styles.depositAmount}>{formatPrice(total)}</Text>
      <View style={styles.depositSubRow}>
        <View>
          <Text style={styles.depositItemLabel}>예수금</Text>
          <Text style={styles.depositItemValue}>{formatPrice(deposit)}</Text>
        </View>
        <View style={styles.depositVDivider} />
        <View>
          <Text style={styles.depositItemLabel}>평가금액</Text>
          <Text style={styles.depositItemValue}>{formatPrice(evalAmount)}</Text>
        </View>
      </View>
    </View>
  );
}

function ScreenHeader() {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  return (
    <View style={styles.screenHeader}>
      <View>
        <Text style={styles.headerEyebrow}>계좌 · 자산</Text>
        <Text style={styles.headerTitle}>내 자산</Text>
        <Text style={styles.headerSub}>{today} 업데이트 기준으로 보여줘요</Text>
      </View>
      <View style={styles.headerPill}>
        <Text style={styles.headerPillText}>실시간</Text>
      </View>
    </View>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const [balance, setBalance] = useState([]);
  const [deposit, setDeposit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [orderSide, setOrderSide] = useState('buy');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [useSampleData, setUseSampleData] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchKisBalance();
      setBalance(data.balance || []);
      setDeposit(data.deposit ?? null);
      setUseSampleData(false);
      setNotice(null);
    } catch (e) {
      setBalance(sampleAccount.balance);
      setDeposit(sampleAccount.deposit);
      setUseSampleData(true);
      setNotice('연결 전 화면을 미리 보고 있어요. 계좌 정보는 샘플 데이터로 보여주고 있어요.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOrder = useCallback((item, side) => {
    setSelected(item);
    setOrderSide(side);
    setSheetOpen(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={tdsColors.blue500}
          />
        }
      >
        <ScreenHeader />
        {notice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}
        {deposit != null && <DepositHeader deposit={deposit} balance={balance} />}
        {balance.length > 0 && <PortfolioSummary balance={balance} />}

        <Text style={styles.sectionTitle}>보유잔고</Text>
        {loading ? (
          <View style={styles.listCard}>
            {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </View>
        ) : balance.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>아직 보유한 종목이 없어요</Text>
            <Text style={styles.emptyDesc}>티커 탭에서 관심 종목을 매수하면 여기에 나타나요</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {balance.map((item) => (
              <BalanceCard key={item.ticker} item={item} onOrder={handleOrder} />
            ))}
          </View>
        )}
      </ScrollView>

      <OrderSheet
        item={selected}
        side={orderSide}
        open={sheetOpen}
        useSampleData={useSampleData}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  scroll: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  screenHeader: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerEyebrow: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: tdsDark.textPrimary, letterSpacing: -0.5 },
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
  headerPillText: { fontSize: 12, color: tdsColors.blue700, fontWeight: '600' },
  noticeBox: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tdsColors.blue50,
    borderRadius: 16,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: tdsColors.blue700 },

  depositSection: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 24,
    backgroundColor: tdsDark.bgCard,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  depositSubLabel: { fontSize: 13, color: tdsDark.textTertiary, marginBottom: 4 },
  depositSubRow: { flexDirection: 'row', marginTop: 16, gap: 24, alignItems: 'center' },
  depositVDivider: { width: 1, height: 28, backgroundColor: tdsDark.border },
  depositItemLabel: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 3 },
  depositItemValue: { fontSize: 15, fontWeight: '600', color: tdsDark.textSecondary },
  depositAmount: { fontSize: 28, fontWeight: '700', color: tdsDark.textPrimary },

  sectionTitle: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  listCard: {
    marginTop: 4,
    backgroundColor: tdsDark.bgCard,
  },

  rightBlock: { alignItems: 'flex-end' },
  rateText: { fontSize: 15, fontWeight: '700' },
  priceSmall: { fontSize: 12, color: tdsDark.textSecondary, marginTop: 2 },
  orderBtns: { flexDirection: 'row', marginTop: 8 },

  initialBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  portfolioCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: tdsDark.bgCard,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  portfolioTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portfolioTitle: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
  portfolioAvgRate: { fontSize: 16, fontWeight: '700' },
  portfolioChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portfolioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  portfolioChipName: { fontSize: 13, color: tdsDark.textSecondary },
  portfolioChipRate: { fontSize: 13, fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: tdsDark.textSecondary, fontSize: 14 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: tdsDark.textPrimary, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: tdsDark.textSecondary, textAlign: 'center', lineHeight: 19 },

  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8ecef',
    marginRight: 12,
  },
  skeletonBody: { flex: 1 },
  skeletonRight: { alignItems: 'flex-end' },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e8ecef',
  },

  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetLabel: { fontSize: 13, color: tdsDark.textSecondary },
  sheetValue: { fontSize: 15, fontWeight: '600', color: tdsDark.textPrimary },
  qtyInput: {
    backgroundColor: tdsDark.bgSecondary,
    borderWidth: 1,
    borderColor: tdsDark.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: tdsDark.textPrimary,
  },
});
