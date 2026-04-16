/**
 * 티커 탭 — 시장별 종목 목록 + 즉시 매수
 *
 * 데이터 소스:
 *  - 종목 목록: 백엔드 /v1/xgb/group-tickers (KOSPI200 199개, QQQ 101개, SP500 503개)
 *  - 이름+시세:  Yahoo Finance v8/finance/chart (병렬 조회)
 *  - 기본 뷰:   백엔드 /auto-trade/top-tickers (AI 상위 종목)
 *
 * 렌더링: FlatList 가상화 + 페이지당 20개 무한 스크롤
 * 정렬: 기본 / 등락률 / 현재가 / 이름 (각 오름차순/내림차순 토글)
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
  ActivityIndicator,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { ListRow } from '../../components/tds/ListRow';
import { Button } from '../../components/tds/Button';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { submitKisOrder } from '../../lib/kisApi';
import { fetchAllMarketIndices } from '../../lib/priceApi';
import {
  fetchGroupTickerList,
  fetchTickerInfoPage,
  fetchTopTickersWithPrice,
  PAGE_SIZE,
} from '../../lib/marketApi';
import { sampleTickers, sampleMarketIndices } from '../../lib/sampleData';
import useStore from '../../store/useStore';
import { getPriceColor, formatRate, formatPrice } from '../../utils/price';
import { LogoBadge } from '../../components/tds/LogoBadge';

// KOSDAQ는 백엔드 데이터 없음
const UNAVAILABLE_MARKETS = new Set(['KOSDAQ']);

// ─── 정렬 설정 ───────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'default', label: '기본' },
  { key: 'rate',    label: '등락률' },
  { key: 'price',   label: '현재가' },
  { key: 'name',    label: '이름' },
];

function applySortToTickers(list, sortKey, sortDir) {
  if (sortKey === 'default') return list;
  return [...list].sort((a, b) => {
    if (sortKey === 'name') {
      const cmp = (a.name ?? '').localeCompare(b.name ?? '', 'ko');
      return sortDir === 'asc' ? cmp : -cmp;
    }
    const valA = sortKey === 'rate' ? (a.today_rate ?? 0) : (a.current_price ?? 0);
    const valB = sortKey === 'rate' ? (b.today_rate ?? 0) : (b.current_price ?? 0);
    return sortDir === 'desc' ? valB - valA : valA - valB;
  });
}

// ─── 정렬 칩 바 ──────────────────────────────────────────────────────────────
function SortBar({ sortKey, sortDir, onSort }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.sortBarWrap}
      contentContainerStyle={styles.sortBarContent}
    >
      {SORT_OPTIONS.map((opt) => {
        const isActive = sortKey === opt.key;
        const showArrow = isActive && opt.key !== 'default';
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onSort(opt.key)}
            activeOpacity={0.75}
            style={[styles.sortChip, isActive && styles.sortChipActive]}
          >
            <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
              {opt.label}
              {showArrow ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── 스켈레튼 ────────────────────────────────────────────────────────────────

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

// ─── 종목 통계 바 ─────────────────────────────────────────────────────────────
function TickerStatsBar({ tickers, selectedIndex, total }) {
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
      {total > 0 && (
        <>
          <Text style={styles.statsSep}>·</Text>
          <Text style={styles.statsTotalText}>{tickers.length}/{total}개</Text>
        </>
      )}
    </View>
  );
}

// ─── 시장 지수 스트립 ─────────────────────────────────────────────────────────
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
        const isUnavailable = UNAVAILABLE_MARKETS.has(idx.key);
        const isUp = idx.change >= 0;
        const color = isUp ? '#f04452' : tdsColors.blue500;
        return (
          <TouchableOpacity
            key={idx.key}
            onPress={() => !isUnavailable && onSelect(isSelected ? null : idx.key)}
            activeOpacity={isUnavailable ? 1 : 0.75}
            style={[
              styles.indexCard,
              isSelected && styles.indexCardSelected,
              isUnavailable && styles.indexCardDisabled,
            ]}
          >
            <Text style={[styles.indexLabel, isSelected && styles.indexLabelSelected]}>
              {idx.label}
            </Text>
            <Text style={[styles.indexValue, isSelected && styles.indexValueSelected]}>
              {idx.value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.indexChange, { color: isUnavailable ? tdsDark.textTertiary : color }]}>
              {isUnavailable ? '준비 중' : `${isUp ? '+' : ''}${idx.change.toFixed(2)}%`}
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
  const isGuest = authMode === 'guest' || authMode === 'locked';

  const [tickers, setTickers] = useState([]);        // 현재 화면에 보이는 종목
  const [allCodes, setAllCodes] = useState([]);      // 선택된 시장의 전체 코드 목록
  const [page, setPage] = useState(0);               // 다음 로드할 페이지
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notice, setNotice] = useState(null);

  const [selected, setSelected] = useState(null);   // 상세 시트 열린 종목
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [marketIndices, setMarketIndices] = useState(sampleMarketIndices);

  const [sortKey, setSortKey] = useState('default');
  const [sortDir, setSortDir] = useState('desc');

  // 진행 중인 로드를 취소하기 위한 ref
  const loadIdRef = useRef(0);

  // ── 지수 실시간 데이터 로드 ────────────────────────────────────────────────
  useEffect(() => {
    fetchAllMarketIndices(sampleMarketIndices)
      .then((live) => {
        setMarketIndices((prev) =>
          prev.map((idx) =>
            live[idx.key]
              ? { ...idx, value: live[idx.key].value, change: live[idx.key].change }
              : idx,
          ),
        );
      })
      .catch(() => {});
  }, []);

  // ── 시장 선택 시 종목 로드 ─────────────────────────────────────────────────
  const loadMarket = useCallback(
    async (market) => {
      if (isGuest) {
        const filtered = market
          ? sampleTickers.filter((t) => t.market === market)
          : sampleTickers;
        setTickers(filtered.length > 0 ? filtered : sampleTickers);
        setAllCodes([]);
        setHasMore(false);
        setPage(0);
        setNotice(
          market
            ? `샘플 데이터예요. 로그인하면 ${market} 실제 종목을 볼 수 있어요.`
            : '비로그인 모드라서 샘플 데이터를 보여주고 있어요.',
        );
        return;
      }

      const id = ++loadIdRef.current;
      setLoading(true);
      setTickers([]);
      setAllCodes([]);
      setHasMore(false);
      setPage(0);
      setNotice(null);

      try {
        let firstPage;

        if (!market) {
          // 전체: AI 상위 종목 (이름 포함)
          firstPage = await fetchTopTickersWithPrice();
          if (id !== loadIdRef.current) return;
          setAllCodes([]);
          setHasMore(false);
        } else if (UNAVAILABLE_MARKETS.has(market)) {
          // 데이터 없는 시장
          if (id !== loadIdRef.current) return;
          setTickers([]);
          setNotice(`${market} 종목 데이터는 아직 준비 중이에요.`);
          return;
        } else {
          // 특정 시장: 코드 목록 먼저 받고 첫 페이지 시세 조회
          const codes = await fetchGroupTickerList(market);
          if (id !== loadIdRef.current) return;
          setAllCodes(codes);
          setHasMore(codes.length > PAGE_SIZE);
          firstPage = await fetchTickerInfoPage(codes, market, 0);
          if (id !== loadIdRef.current) return;
          setPage(1);
        }

        setTickers(firstPage);
      } catch {
        if (id !== loadIdRef.current) return;
        // 실패 시 샘플 폴백
        setTickers(sampleTickers);
        setNotice('시세를 불러오는 중 오류가 발생했어요. 샘플 데이터를 보여줄게요.');
      } finally {
        if (id === loadIdRef.current) setLoading(false);
      }
    },
    [isGuest],
  );

  useEffect(() => {
    loadMarket(selectedIndex);
  }, [selectedIndex, loadMarket]);

  // ── 무한 스크롤 ────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !selectedIndex || allCodes.length === 0) return;
    setLoadingMore(true);
    try {
      const next = await fetchTickerInfoPage(allCodes, selectedIndex, page);
      setTickers((prev) => [...prev, ...next]);
      const nextPage = page + 1;
      setPage(nextPage);
      setHasMore(nextPage * PAGE_SIZE < allCodes.length);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, selectedIndex, allCodes, page]);

  const handleSelectIndex = useCallback((key) => {
    setSelectedIndex(key);
    // 시장 전환 시 정렬 초기화
    setSortKey('default');
    setSortDir('desc');
  }, []);

  const handleSort = useCallback((key) => {
    if (key === 'default') {
      setSortKey('default');
      return;
    }
    setSortKey((prev) => {
      if (prev === key) {
        // 같은 키 재선택 → 방향 토글
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
        return key;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  const handleSelectTicker = useCallback((item) => {
    setSelected(item);
    setSheetOpen(true);
  }, []);

  const sortedTickers = useMemo(
    () => applySortToTickers(tickers, sortKey, sortDir),
    [tickers, sortKey, sortDir],
  );

  const renderItem = useCallback(
    ({ item }) => <TickerRow item={item} onPress={handleSelectTicker} />,
    [handleSelectTicker],
  );

  const keyExtractor = useCallback((item) => item.ticker, []);

  const totalCount = selectedIndex && !UNAVAILABLE_MARKETS.has(selectedIndex)
    ? allCodes.length || tickers.length
    : 0;

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
          onSelect={handleSelectIndex}
        />
        {!loading && tickers.length > 0 && (
          <>
            <TickerStatsBar
              tickers={sortedTickers}
              selectedIndex={selectedIndex}
              total={totalCount}
            />
            <SortBar sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          </>
        )}
      </>
    ),
    [notice, marketIndices, selectedIndex, tickers, sortedTickers, loading, totalCount, sortKey, sortDir, handleSelectIndex, handleSort],
  );

  const ListFooter = useMemo(
    () =>
      loadingMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={tdsColors.blue500} />
          <Text style={styles.footerLoaderText}>종목 불러오는 중...</Text>
        </View>
      ) : null,
    [loadingMore],
  );

  const ListEmpty = useMemo(
    () =>
      loading ? (
        <View style={styles.listCard}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyTitle}>
            {selectedIndex
              ? `${selectedIndex} 종목이 없어요`
              : '종목을 불러오는 중이에요'}
          </Text>
          <Text style={styles.emptyDesc}>
            상단 지수 카드를 눌러 시장을 선택하세요
          </Text>
        </View>
      ),
    [loading, selectedIndex],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={loading ? [] : sortedTickers}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
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
        useSampleData={isGuest}
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
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: { fontSize: 13, color: tdsDark.textSecondary },
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
    backgroundColor: '#2a2e3a',
    marginRight: 12,
  },
  skeletonBody: { flex: 1 },
  skeletonRight: { alignItems: 'flex-end' },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2a2e3a',
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
  indexCardDisabled: { opacity: 0.45 },
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
  statsTotalText: { fontSize: 12, color: tdsDark.textTertiary },
  sortBarWrap: { flexGrow: 0, marginBottom: 2 },
  sortBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: tdsDark.bgSecondary,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  sortChipActive: {
    backgroundColor: tdsColors.blue500,
    borderColor: tdsColors.blue500,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: tdsDark.textSecondary,
  },
  sortChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
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
