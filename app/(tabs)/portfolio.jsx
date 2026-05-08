/**
 * 포트폴리오 탭 — 투자자 기반 자산 배분 제안
 * 
 * 기능:
 *  - 투자자 포트폴리오 데이터 조회
 *  - 총자산 기반 종목별 권장 수량 계산
 *  - 종목 수, 현금 비중, 가중치 방식 조정 (Tweak)
 *  - 투자자별/종목별 뷰 전환
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { ListRow } from '../../components/tds/ListRow';
import { Button } from '../../components/tds/Button';
import { SegmentControl } from '../../components/tds/SegmentControl';
import { LogoBadge } from '../../components/tds/LogoBadge';
import { fetchPortfolioData } from '../../lib/portfolioApi';
import { PORTFOLIO_DATA as FALLBACK_DATA } from '../../lib/portfolioData';
import { formatPrice, formatRate, getPriceColor } from '../../utils/price';

// ─── 유틸리티 ───────────────────────────────────────────────────────────────

function formatNumber(val) {
  return val.toLocaleString('ko-KR');
}

// ─── 컴포넌트: 수치 조절기 (Slider 대용) ───────────────────────────────────────

function ValueStepper({ label, value, onValueChange, step, min, max, unit = '' }) {
  return (
    <View style={styles.stepperContainer}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity 
          onPress={() => onValueChange(Math.max(min, value - step))}
          style={styles.stepperBtn}
        >
          <Text style={styles.stepperBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}{unit}</Text>
        <TouchableOpacity 
          onPress={() => onValueChange(Math.min(max, value + step))}
          style={styles.stepperBtn}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── 메인 스크린 ─────────────────────────────────────────────────────────────

export default function PortfolioScreen() {
  const [data, setData] = useState({ based_on_person: [], based_on_stock: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('stocks'); // 'investors' | 'stocks'
  
  // Tweak States
  const [totalAssets, setTotalAssets] = useState(100000000); // 기본 1억
  const [tickerCount, setTickerCount] = useState(15);
  const [cashRatio, setCashRatio] = useState(0.1);
  const [weightMode, setWeightMode] = useState('person_count'); // 'person_count' | 'sum_ratio'

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await fetchPortfolioData();
      setData(result);
    } catch (err) {
      console.warn('[Portfolio] API failed, using fallback');
      setData({ 
        based_on_person: [], 
        based_on_stock: FALLBACK_DATA, 
        meta: { source: 'fallback' } 
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 상위 종목 가중치 계산 및 제안 수량 산출
  const proposedPortfolio = useMemo(() => {
    if (!data.based_on_stock.length) return [];

    // 가중치 방식에 따른 정렬 및 슬라이싱
    const sorted = [...data.based_on_stock].sort((a, b) => {
      const valA = weightMode === 'person_count' ? a.person_count : a.sum_ratio;
      const valB = weightMode === 'person_count' ? b.person_count : b.sum_ratio;
      return valB - valA;
    });

    const topStocks = sorted.slice(0, tickerCount).map(s => ({
      ...s,
      weight: weightMode === 'person_count' ? s.person_count : s.sum_ratio
    }));

    const totalWeight = topStocks.reduce((sum, s) => sum + s.weight, 0);
    const availableCash = totalAssets * (1 - cashRatio);

    return topStocks.map(s => {
      const allocation = availableCash * (s.weight / totalWeight);
      const qty = s.close ? Math.floor(allocation / s.close) : 0;
      return { ...s, suggestedQty: qty, allocation };
    });
  }, [data, totalAssets, tickerCount, cashRatio, weightMode]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerEyebrow}>포트폴리오 · 자산 배분</Text>
      <Text style={styles.headerTitle}>투자자 제안</Text>
      <Text style={styles.headerSub}>
        {data.meta?.source === 'fallback' ? '샘플 데이터를 보여주고 있어요' : '투자자들의 실시간 비중을 분석했어요'}
      </Text>
    </View>
  );

  const renderViewToggle = () => (
    <SegmentControl
      tabs={[
        { key: 'stocks', label: '종목별 비중' },
        { key: 'investors', label: '투자자별 목록' },
      ]}
      activeTab={viewMode}
      onTabChange={setViewMode}
    />
  );

  const renderSummaryCard = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>운용 자산</Text>
        <TextInput
          style={styles.assetsInput}
          value={String(totalAssets)}
          onChangeText={(val) => setTotalAssets(Number(val.replace(/[^0-9]/g, '')))}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>현금 비중</Text>
          <Text style={styles.summaryItemValue}>{Math.round(cashRatio * 100)}%</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>추천 종목 수</Text>
          <Text style={styles.summaryItemValue}>{tickerCount}개</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>가용 현금</Text>
          <Text style={styles.summaryItemValue}>{formatPrice(totalAssets * (1 - cashRatio))}</Text>
        </View>
      </View>
    </View>
  );

  const renderTweaks = () => (
    <View style={styles.tweakPanel}>
      <Text style={styles.sectionTitle}>매개변수 조정</Text>
      <ValueStepper 
        label="종목 수" 
        value={tickerCount} 
        onValueChange={setTickerCount} 
        step={5} min={5} max={50} unit="개"
      />
      <ValueStepper 
        label="현금 비중" 
        value={Math.round(cashRatio * 100)} 
        onValueChange={(v) => setCashRatio(v / 100)} 
        step={5} min={0} max={50} unit="%"
      />
      
      <View style={styles.weightToggleContainer}>
        <Text style={styles.stepperLabel}>가중치 기준</Text>
        <View style={styles.weightBtnRow}>
          <TouchableOpacity 
            onPress={() => setWeightMode('person_count')}
            style={[styles.weightBtn, weightMode === 'person_count' && styles.weightBtnActive]}
          >
            <Text style={[styles.weightBtnText, weightMode === 'person_count' && styles.weightBtnTextActive]}>투자자 수</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setWeightMode('sum_ratio')}
            style={[styles.weightBtn, weightMode === 'sum_ratio' && styles.weightBtnActive]}
          >
            <Text style={[styles.weightBtnText, weightMode === 'sum_ratio' && styles.weightBtnTextActive]}>비중 합계</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
        {renderHeader()}
        {renderViewToggle()}
        {viewMode === 'stocks' && renderSummaryCard()}
        {viewMode === 'stocks' && renderTweaks()}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            {viewMode === 'stocks' ? '권장 포트폴리오' : '상위 투자자 목록'}
          </Text>
          <Text style={styles.listSubText}>
            {viewMode === 'stocks' 
              ? '운용 자산에 따른 제안 수량입니다' 
              : '포트폴리오가 공개된 주요 투자자들입니다'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={tdsColors.blue500} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.listContainer}>
            {viewMode === 'stocks' ? (
              proposedPortfolio.map((item) => (
                <ListRow
                  key={item.stock}
                  left={<LogoBadge name={item.name} ticker={item.stock} size={44} />}
                  title={item.name}
                  subtitle={`${item.stock} · ${formatPrice(item.close)}`}
                  right={
                    <View style={styles.rightBlock}>
                      <Text style={styles.suggestedQtyText}>{formatNumber(item.suggestedQty)}주</Text>
                      <Text style={styles.allocationText}>{formatPrice(item.allocation)}</Text>
                    </View>
                  }
                />
              ))
            ) : (
              data.based_on_person.map((person) => (
                <ListRow
                  key={person.person}
                  left={<LogoBadge name={person.person} ticker={person.person} size={44} />}
                  title={person.person}
                  subtitle={`${person.holdings?.length || 0}개 종목 보유 중`}
                  right={
                    <View style={styles.rightBlock}>
                      <Text style={styles.suggestedQtyText}>{person.sum_ratio.toFixed(1)}%</Text>
                      <Text style={styles.allocationText}>포트폴리오 비중</Text>
                    </View>
                  }
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  header: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  headerEyebrow: { fontSize: 13, color: tdsDark.textTertiary, marginBottom: 4 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 14, color: tdsDark.textSecondary, marginTop: 4 },
  
  summaryCard: {
    marginHorizontal: 16,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 15, fontWeight: '600', color: tdsDark.textSecondary },
  assetsInput: {
    fontSize: 20,
    fontWeight: '700',
    color: tdsColors.blue500,
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  divider: {
    height: 1,
    backgroundColor: tdsDark.border,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: { flex: 1 },
  summaryItemLabel: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 4 },
  summaryItemValue: { fontSize: 15, fontWeight: '600', color: tdsDark.textPrimary },
  
  tweakPanel: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    marginBottom: 12,
    marginLeft: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: tdsDark.bgCard,
    padding: 12,
    borderRadius: 12,
  },
  stepperLabel: { fontSize: 14, color: tdsDark.textSecondary, fontWeight: '500' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tdsDark.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 20, color: tdsDark.textPrimary, fontWeight: '600' },
  stepperValue: { fontSize: 15, fontWeight: '700', color: tdsColors.blue600, minWidth: 40, textAlign: 'center' },
  
  weightToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tdsDark.bgCard,
    padding: 12,
    borderRadius: 12,
  },
  weightBtnRow: { flexDirection: 'row', gap: 8 },
  weightBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: tdsDark.bgSecondary,
  },
  weightBtnActive: { backgroundColor: tdsColors.blue500 },
  weightBtnText: { fontSize: 12, color: tdsDark.textSecondary, fontWeight: '600' },
  weightBtnTextActive: { color: '#fff' },
  
  listHeader: { marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  listSubText: { fontSize: 13, color: tdsDark.textTertiary, marginTop: -8, marginLeft: 4, marginBottom: 12 },
  listContainer: { backgroundColor: tdsDark.bgCard, borderTopWidth: 1, borderTopColor: tdsDark.border },
  
  rightBlock: { alignItems: 'flex-end' },
  suggestedQtyText: { fontSize: 16, fontWeight: '700', color: tdsColors.blue600 },
  allocationText: { fontSize: 12, color: tdsDark.textTertiary, marginTop: 2 },
});
