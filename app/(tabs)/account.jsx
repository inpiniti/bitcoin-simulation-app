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
  ActivityIndicator,
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

// ─── 이니셜 뱃지 ──────────────────────────────────────────────────────────────

function InitialBadge({ ticker }) {
  return (
    <View style={styles.initialBadge}>
      <Text style={styles.initialText}>{(ticker || '?')[0]}</Text>
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
      left={<InitialBadge ticker={item.ticker} />}
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

function DepositHeader({ deposit }) {
  return (
    <View style={styles.depositSection}>
      <Text style={styles.depositLabel}>예수금</Text>
      <Text style={styles.depositAmount}>{formatPrice(deposit)}</Text>
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
      {loading && !refreshing && (
        <View style={styles.center}>
          <ActivityIndicator color={tdsColors.blue500} size="large" />
        </View>
      )}

      {!loading && (
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
          {notice && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}
          {deposit != null && <DepositHeader deposit={deposit} />}

          <Text style={styles.sectionTitle}>보유잔고</Text>
          {balance.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>보유 종목이 없습니다</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {balance.map((item) => (
                <BalanceCard key={item.ticker} item={item} onOrder={handleOrder} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

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
  content: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
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
  depositLabel: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 4 },
  depositAmount: { fontSize: 28, fontWeight: '700', color: tdsDark.textPrimary },

  sectionTitle: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  listCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: tdsDark.bgCard,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  rightBlock: { alignItems: 'flex-end' },
  rateText: { fontSize: 15, fontWeight: '700' },
  priceSmall: { fontSize: 12, color: tdsDark.textSecondary, marginTop: 2 },
  orderBtns: { flexDirection: 'row', marginTop: 8 },

  initialBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tdsDark.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: { color: tdsDark.textPrimary, fontSize: 17, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: tdsDark.textSecondary, fontSize: 14 },

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
