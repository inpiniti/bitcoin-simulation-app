/**
 * 계좌 탭 — KIS 잔고 + 예수금 + 매수/매도 (원화/달러 토글 추가)
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
  ActivityIndicator,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { ListRow } from '../../components/tds/ListRow';
import { Button } from '../../components/tds/Button';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { SegmentControl } from '../../components/tds/SegmentControl';
import { fetchKisFullBalance, submitKisOrder } from '../../lib/kisApi';
import { sampleAccount } from '../../lib/sampleData';
import useStore from '../../store/useStore';
import { getPriceColor, formatRate, formatPrice } from '../../utils/price';
import { LogoBadge } from '../../components/tds/LogoBadge';

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

      <View style={styles.portfolioChips}>
        {balance.map((b) => (
          <View key={b.ticker} style={styles.portfolioChip}>
            <Text style={styles.portfolioChipName}>{b.name}</Text>
            <Text
              style={[
                styles.portfolioChipRate,
                { color: getPriceColor(b.profit_rate) },
              ]}
            >
              {formatRate(b.profit_rate)}
            </Text>
          </View>
        ))}
      </View>
    </View>
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

  const currentSummary = currency === 'KRW' ? fullData?.krw : fullData?.usd;
  const balance = fullData?.holdings || [];

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
                <ListRow
                  key={item.ticker}
                  onPress={() => {
                    setSelected(item);
                    setSheetOpen(true);
                  }}
                  left={<LogoBadge name={item.name} ticker={item.ticker} size={44} />}
                  title={item.name}
                  subtitle={item.ticker}
                  right={
                    <View style={styles.rightBlock}>
                      <Text style={[styles.rateText, { color: getPriceColor(item.profit_rate) }]}>
                        {formatRate(item.profit_rate)}
                      </Text>
                      <Text style={styles.priceSmall}>
                        {currency === 'USD' ? `$${item.eval_amount_foreign?.toFixed(2)}` : formatPrice(item.eval_amount)}
                      </Text>
                    </View>
                  }
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
        {selected && (
          <View style={{ paddingBottom: 20 }}>
            <Text style={styles.sheetCode}>{selected.ticker}</Text>
            <Text style={styles.sheetPriceMain}>
              {currency === 'USD' ? `$${selected.current_price?.toFixed(2)}` : formatPrice(selected.current_price)}
            </Text>
            <View style={styles.orderRow}>
              <Text style={styles.sheetLabel}>보유 수량</Text>
              <Text style={styles.sheetValue}>{selected.qty}주</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.sheetLabel}>평가 손익</Text>
              <Text style={[styles.sheetValue, { color: getPriceColor(selected.profit_rate) }]}>
                {formatSignedCurrency(currency === 'USD' ? (selected.eval_amount_foreign - selected.buy_amount / selected.exchange_rate) : selected.profit_amount, currency)}
              </Text>
            </View>
          </View>
        )}
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
  portfolioTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  portfolioTitle: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
  portfolioMetaRight: { alignItems: 'flex-end', gap: 4 },
  portfolioAvgRate: { fontSize: 16, fontWeight: '700' },
  portfolioProfit: { fontSize: 13, fontWeight: '600' },
  portfolioChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portfolioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  portfolioChipName: { fontSize: 12, color: tdsDark.textSecondary },
  portfolioChipRate: { fontSize: 12, fontWeight: '600' },
  holdingsHeader: { marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 13, color: tdsDark.textSecondary, marginHorizontal: 20, fontWeight: '600' },
  listCard: { backgroundColor: tdsDark.bgCard, borderTopWidth: 1, borderTopColor: tdsDark.border },
  rightBlock: { alignItems: 'flex-end' },
  rateText: { fontSize: 15, fontWeight: '700' },
  priceSmall: { fontSize: 12, color: tdsDark.textSecondary, marginTop: 2 },
  sheetCtaRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  sheetCode: { fontSize: 13, color: tdsDark.textTertiary, marginBottom: 4 },
  sheetPriceMain: { fontSize: 32, fontWeight: '700', color: tdsDark.textPrimary, marginBottom: 16 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sheetLabel: { fontSize: 14, color: tdsDark.textSecondary },
  sheetValue: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary },
});
