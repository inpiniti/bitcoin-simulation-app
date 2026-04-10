/**
 * 티커 탭 — 관심 종목 목록 + 즉시 매수
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
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { ListRow } from '../../components/tds/ListRow';
import { Badge } from '../../components/tds/Badge';
import { Button } from '../../components/tds/Button';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { supabase } from '../../lib/supabaseClient';
import { submitKisOrder } from '../../lib/kisApi';
import { sampleTickers, sampleMarketIndices } from '../../lib/sampleData';
import { getPriceColor, formatRate, formatPrice } from '../../utils/price';

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

// ─── 시장 지수 스트립 ─────────────────────────────────────────────────────

function MarketIndexStrip({ indices }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.indexStrip}
      contentContainerStyle={styles.indexStripContent}
    >
      {indices.map((idx) => {
        const isUp = idx.change >= 0;
        const color = isUp ? '#f04452' : '#03b26c';
        return (
          <View key={idx.key} style={styles.indexCard}>
            <Text style={styles.indexLabel}>{idx.label}</Text>
            <Text style={styles.indexValue}>
              {idx.value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.indexChange, { color }]}>
              {isUp ? '+' : ''}{idx.change.toFixed(1)}%
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── 매수 BottomSheet ─────────────────────────────────────────────────────────

function BuySheet({ item, open, onClose, useSampleData }) {
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleBuy = useCallback(async () => {
    const quantity = parseInt(qty, 10);
    if (!quantity || quantity <= 0) {
      Alert.alert('오류', '올바른 수량을 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      if (!useSampleData) {
        await submitKisOrder({ ticker: item.ticker, quantity, side: 'buy' });
      }
      Alert.alert(
        '주문 확인',
        useSampleData
          ? `${item.name} ${quantity}주 매수 흐름을 샘플로 보여주고 있어요.`
          : `${item.name} ${quantity}주 매수 주문이 완료되었습니다.`
      );
      onClose();
    } catch (e) {
      Alert.alert('주문 실패', e.message);
    } finally {
      setLoading(false);
    }
  }, [item, qty, onClose]);

  if (!item) return null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${item.name} 매수`}
      cta={
        <Button
          onPress={handleBuy}
          display="full"
          loading={loading}
          color="primary"
        >
          매수하기
        </Button>
      }
    >
      <Text style={styles.sheetLabel}>현재가</Text>
      <Text style={styles.sheetPrice}>{formatPrice(item.current_price)}</Text>
      <Text style={[styles.sheetLabel, { marginTop: 16 }]}>수량</Text>
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

// ─── 티커 행 ──────────────────────────────────────────────────────────────────

function TickerRow({ item, onBuy }) {
  const rateColor = getPriceColor(item.today_rate);

  return (
    <ListRow
      left={<InitialBadge name={item.name} ticker={item.ticker} />}
      title={item.name}
      subtitle={item.ticker}
      right={
        <View style={styles.rightBlock}>
          <Text style={[styles.rateText, { color: rateColor }]}>
            {formatRate(item.today_rate)}
          </Text>
          <Text style={styles.priceText}>{formatPrice(item.current_price)}</Text>
          <Button
            onPress={() => onBuy(item)}
            size="small"
            variant="weak"
            color="primary"
            style={{ marginTop: 6 }}
          >
            매수
          </Button>
        </View>
      }
    />
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function TickerScreen() {
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [useSampleData, setUseSampleData] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadTickers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('ticker_group')
        .select('ticker, name, current_price, today_rate')
        .order('name');
      if (err) throw new Error(err.message);
      setTickers(data || []);
      setUseSampleData(false);
      setNotice(null);
    } catch (e) {
      setTickers(sampleTickers);
      setUseSampleData(true);
      setNotice('티커 목록을 연결하기 전이라서 샘플 데이터를 먼저 보여주고 있어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTickers(); }, [loadTickers]);

  const handleBuy = useCallback((item) => {
    setSelected(item);
    setSheetOpen(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={tdsColors.blue500} size="large" />
        </View>
      )}

      {!loading && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {notice && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}
          <MarketIndexStrip indices={sampleMarketIndices} />
          {tickers.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>등록된 종목이 없습니다</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {tickers.map((item) => (
                <TickerRow key={item.ticker} item={item} onBuy={handleBuy} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <BuySheet
        item={selected}
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
  noticeBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tdsColors.blue50,
    borderRadius: 16,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: tdsColors.blue700 },
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
  rateText: { fontSize: 14, fontWeight: '600' },
  priceText: { fontSize: 13, color: tdsDark.textSecondary, marginTop: 2 },
  emptyText: { color: tdsDark.textSecondary, fontSize: 14 },
  initialBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  indexStrip: { flexGrow: 0, marginBottom: 4 },
  indexStripContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 10 },
  indexCard: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 90,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  indexLabel: { fontSize: 11, color: tdsDark.textTertiary, marginBottom: 2 },
  indexValue: { fontSize: 14, fontWeight: '600', color: tdsDark.textPrimary, marginBottom: 2 },
  indexChange: { fontSize: 12, fontWeight: '600' },
  sheetLabel: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 4 },
  sheetPrice: { fontSize: 22, fontWeight: '700', color: tdsDark.textPrimary },
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
