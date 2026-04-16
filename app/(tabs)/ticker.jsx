/**
 * 티커 탭 — 관심 종목 목록 + 즉시 매수
 *
 * 개선 사항:
 * - FlatList 가상화로 보이는 영역만 렌더링
 * - 상단 지수 카드 선택 시 해당 시장 종목 필터링
 * - Yahoo Finance로 실제 지수 데이터 조회
 * - 현재가(current_price) 기준 표시
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  FlatList,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { ListRow } from '../../components/tds/ListRow';
import { Button } from '../../components/tds/Button';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { supabase } from '../../lib/supabaseClient';
import { submitKisOrder } from '../../lib/kisApi';
import { fetchAllMarketIndices } from '../../lib/priceApi';
import { sampleTickers, sampleMarketIndices } from '../../lib/sampleData';
import useStore from '../../store/useStore';
import { getPriceColor, formatRate, formatPrice } from '../../utils/price';
import { LogoBadge } from '../../components/tds/LogoBadge';

// ─── 스켈레튼 행 ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '50%' }]} />
        <View style={[styles.skeletonLine, { width: '30%', marginTop: 8 }]} />
      </View>
      <View style={styles.skeletonRight}>
        <View style={[styles.skeletonLine, { width: 52 }]} />
        <View style={[styles.skeletonLine, { width: 40, marginTop: 8 }]} />
      </View>
    </View>
  );
}

// ─── 종목 통계 바 ─────────────────────────────────────────────────────────
function TickerStatsBar({ tickers, selectedIndex }) {
  if (!tickers || tickers.length === 0) return null;
  const ups = tickers.filter((t) => t.today_rate > 0).length;
  const downs = tickers.filter((t) => t.today_rate < 0).length;
  const avgRate =
    tickers.reduce((s, t) => s + t.today_rate, 0) / tickers.length;
  return (
    <View style={styles.statsBar}>
      {selectedIndex && (
        <Text style={styles.statsMarket}>{selectedIndex}</Text>
      )}
      {selectedIndex && <Text style={styles.statsSep}>·</Text>}
      <Text style={[styles.statsChip, { color: '#f04452' }]}>↑ {ups}</Text>
      <Text style={styles.statsSep}>·</Text>
      <Text style={[styles.statsChip, { color: tdsColors.blue500 }]}>
        ↓ {downs}
      </Text>
      <Text style={styles.statsSep}>·</Text>
      <Text style={[styles.statsChip, { color: getPriceColor(avgRate) }]}>
        평균 {formatRate(avgRate)}
      </Text>
    </View>
  );
}

// ─── 시장 지수 스트립 ─────────────────────────────────────────────────────
function MarketIndexStrip({ indices, selectedKey, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.indexStrip}
      contentContainerStyle={styles.indexStripContent}
    >
      {indices.map((idx) => {
        const isSelected = idx.key === selectedKey;
        const isUp = idx.change >= 0;
        const color = isUp ? '#f04452' : tdsColors.blue500;
        return (
          <TouchableOpacity
            key={idx.key}
            onPress={() => onSelect(isSelected ? null : idx.key)}
            activeOpacity={0.75}
            style={[
              styles.indexCard,
              isSelected && styles.indexCardSelected,
            ]}
          >
            <Text style={[styles.indexLabel, isSelected && styles.indexLabelSelected]}>
              {idx.label}
            </Text>
            <Text style={[styles.indexValue, isSelected && styles.indexValueSelected]}>
              {idx.value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.indexChange, { color }]}>
              {isUp ? '+' : ''}
              {idx.change.toFixed(2)}%
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── 종목 상세 BottomSheet ────────────────────────────────────────────────────

function TickerDetailSheet({ item, open, onClose, useSampleData }) {
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleOrder = useCallback(
    async (side) => {
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
        Alert.alert(
          '주문 확인',
          useSampleData
            ? `${item.name} ${quantity}주 ${label} 흐름을 샘플로 보여주고 있어요.`
            : `${item.name} ${quantity}주 ${label} 주문이 완료되었습니다.`,
        );
        onClose();
      } catch (e) {
        Alert.alert('주문 실패', e.message);
      } finally {
        setLoading(false);
      }
    },
    [item, qty, onClose, useSampleData],
  );

  if (!item) return null;
  const rateColor = getPriceColor(item.today_rate);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={item.name}
      cta={
        <View style={styles.detailCta}>
          <Button
            onPress={() => handleOrder('sell')}
            color="danger"
            variant="weak"
            style={styles.detailCtaBtn}
            loading={loading}
          >
            매도
          </Button>
          <Button
            onPress={() => handleOrder('buy')}
            color="primary"
            style={styles.detailCtaBtn}
            loading={loading}
          >
            매수
          </Button>
        </View>
      }
    >
      <View style={styles.detailMeta}>
        <Text style={styles.detailCode}>{item.ticker}</Text>
        {item.market && (
          <Text style={styles.detailMarket}>{item.market}</Text>
        )}
        <Text style={[styles.detailRate, { color: rateColor }]}>
          {formatRate(item.today_rate)}
        </Text>
      </View>
      <Text style={styles.detailPrice}>{formatPrice(item.current_price)}</Text>
      <Text style={[styles.sheetLabel, { marginTop: 20, marginBottom: 6 }]}>
        수량
      </Text>
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

function TickerRow({ item, onPress }) {
  const rateColor = getPriceColor(item.today_rate);

  return (
    <ListRow
      onPress={() => onPress(item)}
      left={<LogoBadge name={item.name} ticker={item.ticker} size={40} />}
      title={item.name}
      subtitle={item.ticker}
      right={
        <View style={styles.rightBlock}>
          <Text style={[styles.rateText, { color: rateColor }]}>
            {formatRate(item.today_rate)}
          </Text>
          <Text style={styles.priceText}>
            {formatPrice(item.current_price)}
          </Text>
        </View>
      }
    />
  );
}

function ScreenHeader() {
  const now = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <View style={styles.screenHeader}>
      <View>
        <Text style={styles.headerEyebrow}>티커 · 시장 흐름</Text>
        <Text style={styles.headerTitle}>오늘의 종목</Text>
        <Text style={styles.headerSub}>{now} 기준 시세를 보여줘요</Text>
      </View>
      <View style={styles.headerPill}>
        <Text style={styles.headerPillText}>LIVE</Text>
      </View>
    </View>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function TickerScreen() {
  const authMode = useStore((s) => s.authMode);
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [useSampleData, setUseSampleData] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [marketIndices, setMarketIndices] = useState(sampleMarketIndices);

  // 실제 지수 데이터 로드 (Yahoo Finance)
  const loadMarketIndices = useCallback(async () => {
    try {
      const live = await fetchAllMarketIndices(sampleMarketIndices);
      setMarketIndices((prev) =>
        prev.map((idx) =>
          live[idx.key]
            ? { ...idx, value: live[idx.key].value, change: live[idx.key].change }
            : idx,
        ),
      );
    } catch {
      // 실패 시 샘플 데이터 유지
    }
  }, []);

  const loadTickers = useCallback(async () => {
    setLoading(true);
    if (authMode === 'guest' || authMode === 'locked') {
      setTickers(sampleTickers);
      setUseSampleData(true);
      setNotice('비로그인 모드라서 샘플 티커 데이터를 먼저 보여주고 있어요.');
      setLoading(false);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from('ticker_group')
        .select('ticker, name, current_price, today_rate, market')
        .order('name');
      if (err) throw new Error(err.message);
      setTickers(data || []);
      setUseSampleData(false);
      setNotice(null);
    } catch {
      setTickers(sampleTickers);
      setUseSampleData(true);
      setNotice(
        '티커 목록을 연결하기 전이라서 샘플 데이터를 먼저 보여주고 있어요.',
      );
    } finally {
      setLoading(false);
    }
  }, [authMode]);

  useEffect(() => {
    loadTickers();
    loadMarketIndices();
  }, [loadTickers, loadMarketIndices]);

  // 선택된 지수에 맞춰 종목 필터링
  const filteredTickers = useMemo(() => {
    if (!selectedIndex) return tickers;
    // market 필드가 있는 경우 우선 사용
    const byField = tickers.filter((t) => t.market === selectedIndex);
    if (byField.length > 0) return byField;
    // market 필드가 없으면 ticker 패턴으로 분류
    const isDomestic = selectedIndex === 'KOSPI' || selectedIndex === 'KOSDAQ';
    return tickers.filter((t) =>
      isDomestic ? /^\d{6}$/.test(t.ticker) : !/^\d{6}$/.test(t.ticker),
    );
  }, [tickers, selectedIndex]);

  const handleSelect = useCallback((item) => {
    setSelected(item);
    setSheetOpen(true);
  }, []);

  const renderItem = useCallback(
    ({ item }) => <TickerRow item={item} onPress={handleSelect} />,
    [handleSelect],
  );

  const keyExtractor = useCallback((item) => item.ticker, []);

  const ListHeader = useMemo(
    () => (
      <>
        <ScreenHeader />
        {notice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}
        <MarketIndexStrip
          indices={marketIndices}
          selectedKey={selectedIndex}
          onSelect={setSelectedIndex}
        />
        <TickerStatsBar tickers={filteredTickers} selectedIndex={selectedIndex} />
      </>
    ),
    [notice, marketIndices, selectedIndex, filteredTickers],
  );

  const ListEmpty = useMemo(
    () =>
      loading ? (
        <View style={styles.listCard}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyTitle}>
            {selectedIndex ? `${selectedIndex} 종목이 없어요` : '관심 종목이 없어요'}
          </Text>
          <Text style={styles.emptyDesc}>
            다양한 시장의 종목을 곧 만나실 수 있어요
          </Text>
        </View>
      ),
    [loading, selectedIndex],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={loading ? [] : filteredTickers}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        style={styles.scroll}
      />

      <TickerDetailSheet
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
  screenHeader: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerEyebrow: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 2 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    letterSpacing: -0.5,
  },
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
  headerPillText: { fontSize: 12, color: tdsColors.blue700, fontWeight: '700' },
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
    marginTop: 4,
    backgroundColor: tdsDark.bgCard,
  },
  rightBlock: { alignItems: 'flex-end' },
  rateText: { fontSize: 14, fontWeight: '600' },
  priceText: { fontSize: 13, color: tdsDark.textSecondary, marginTop: 2 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: tdsDark.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  indexStrip: { flexGrow: 0, marginBottom: 4 },
  indexStripContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  indexCard: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 90,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  indexCardSelected: {
    borderColor: tdsColors.blue500,
    backgroundColor: `${tdsColors.blue500}18`,
  },
  indexLabel: { fontSize: 11, color: tdsDark.textTertiary, marginBottom: 2 },
  indexLabelSelected: { color: tdsColors.blue500 },
  indexValue: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsDark.textPrimary,
    marginBottom: 2,
  },
  indexValueSelected: { color: tdsDark.textPrimary },
  indexChange: { fontSize: 12, fontWeight: '600' },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailCode: { fontSize: 13, color: tdsDark.textTertiary },
  detailMarket: {
    fontSize: 11,
    color: tdsColors.blue500,
    fontWeight: '600',
    backgroundColor: `${tdsColors.blue500}18`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detailRate: { fontSize: 13, fontWeight: '600' },
  detailPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    letterSpacing: -0.5,
  },
  detailCta: { flexDirection: 'row', gap: 10 },
  detailCtaBtn: { flex: 1 },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  statsMarket: {
    fontSize: 13,
    fontWeight: '700',
    color: tdsColors.blue500,
  },
  statsChip: { fontSize: 13, fontWeight: '600' },
  statsSep: { fontSize: 13, color: tdsDark.textTertiary },
  sheetLabel: { fontSize: 13, color: tdsDark.textSecondary, marginBottom: 4 },
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
