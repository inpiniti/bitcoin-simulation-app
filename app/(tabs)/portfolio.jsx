/**
 * 포트폴리오 탭 — 투자자 기반 자산 배분 제안
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/tds/Button';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { ListRow } from '../../components/tds/ListRow';
import { LogoBadge } from '../../components/tds/LogoBadge';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { fetchPortfolioData } from '../../lib/portfolioApi';
import { fetchKisFullBalance } from '../../lib/kisApi';
import { PORTFOLIO_DATA as FALLBACK_DATA } from '../../lib/portfolioData';
import { formatPrice } from '../../utils/price';
import useStore from '../../store/useStore';

// ─── 유틸리티 ───────────────────────────────────────────────────────────────

function formatNumber(val) {
  return val.toLocaleString('ko-KR');
}

// ─── 컴포넌트: 수치 조절기 ───────────────────────────────────────────────────

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
  const authMode = useStore((s) => s.authMode);
  const [data, setData] = useState({ based_on_person: [], based_on_stock: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  // Tweak States
  const [totalAssets, setTotalAssets] = useState(100000); // 기본 $100,000 (USD 기준)
  const [tickerCount, setTickerCount] = useState(15);
  const [cashRatio, setCashRatio] = useState(0.1);
  const [sortMode, setSortMode] = useState('investor'); // 'investor' (투자자 수) | 'ratio' (비중 합계)
  const [weightMode, setWeightMode] = useState('ratio'); // 'ratio' (비중 합계) | 'investor' (투자자 수)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // 1. 포트폴리오 메타 데이터 조회
      const result = await fetchPortfolioData();
      setData(result);

      // 2. 실계좌 자산 정보 조회 (USD 기준)
      if (authMode !== 'guest' && authMode !== 'locked') {
        const fullBalance = await fetchKisFullBalance();
        if (fullBalance.usd?.totalAsset > 0) {
          setTotalAssets(fullBalance.usd.totalAsset);
        }
      }
    } catch (err) {
      console.warn('[Portfolio] Load failed, using fallback');
      setData({ based_on_person: [], based_on_stock: FALLBACK_DATA, meta: { source: 'fallback' } });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authMode]);

  useEffect(() => {
    load();
  }, [load]);

  // 상위 종목 가중치 계산 및 제안 수량 산출
  const proposedPortfolio = useMemo(() => {
    if (!data.based_on_stock.length) return [];

    // 1. 정렬
    const sorted = [...data.based_on_stock].sort((a, b) => {
      const valA = sortMode === 'investor' ? a.person_count : a.sum_ratio;
      const valB = sortMode === 'investor' ? b.person_count : b.sum_ratio;
      return valB - valA;
    });

    // 2. 선택된 상위 종목
    const topStocks = sorted.slice(0, tickerCount).map(s => ({
      ...s,
      weightValue: weightMode === 'investor' ? s.person_count : s.sum_ratio
    }));

    const totalWeightValue = topStocks.reduce((sum, s) => sum + s.weightValue, 0);
    const availableCash = totalAssets * (1 - cashRatio);

    return topStocks.map(s => {
      const weightRatio = s.weightValue / totalWeightValue; // 정규화된 비중
      const allocation = availableCash * weightRatio;
      const qty = s.close ? Math.floor(allocation / s.close) : 0;
      const weightPercent = weightRatio * (1 - cashRatio) * 100;
      return { ...s, suggestedQty: qty, allocation, weightPercent };
    });
  }, [data, totalAssets, tickerCount, cashRatio, sortMode, weightMode]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerEyebrow}>포트폴리오 가이드</Text>
      <Text style={styles.headerTitle}>현명한 투자자 포트폴리오</Text>
      <Text style={styles.headerSub}>
        유명 투자자 80명의 보유 데이터를 종합해 비중 가이드를 제안합니다.
      </Text>
    </View>
  );

  const renderAllocationChart = () => {
    if (!proposedPortfolio.length) return null;
    
    // 상위 10개 색상 (TDS 색상 및 보조색)
    const CHART_COLORS = [
      '#3182f6', '#f04452', '#03b26c', '#fe9800', '#8b5cf6', 
      '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#6366f1'
    ];

    const displayItems = proposedPortfolio.slice(0, 10);
    const othersWeight = proposedPortfolio.slice(10).reduce((sum, s) => sum + s.weightPercent, 0);
    const cashWeight = cashRatio * 100;

    return (
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>선택 종목 · {tickerCount}</Text>
        <Text style={styles.chartSubText}>투자자 데이터 기반의 참고 수치입니다.</Text>
        
        {/* Stacked Bar Chart */}
        <View style={styles.stackedBar}>
          {displayItems.map((s, i) => (
            <View 
              key={s.stock} 
              style={[styles.barSegment, { width: `${s.weightPercent}%`, backgroundColor: CHART_COLORS[i] }]} 
            />
          ))}
          {othersWeight > 0 && (
            <View style={[styles.barSegment, { width: `${othersWeight}%`, backgroundColor: '#e5e8eb' }]} />
          )}
          <View style={[styles.barSegment, { width: `${cashWeight}%`, backgroundColor: '#b0b8c1' }]} />
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {displayItems.map((s, i) => (
            <View key={s.stock} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: CHART_COLORS[i] }]} />
              <Text style={styles.legendLabel}>{s.stock}</Text>
              <Text style={styles.legendValue}>{s.weightPercent.toFixed(1)}%</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#b0b8c1' }]} />
            <Text style={styles.legendLabel}>현금</Text>
            <Text style={styles.legendValue}>{cashWeight.toFixed(0)}%</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSummaryCard = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>총자산 (USD)</Text>
        <TextInput
          style={styles.assetsInput}
          value={String(totalAssets)}
          onChangeText={(val) => setTotalAssets(Number(val.replace(/[^0-9]/g, '')))}
          keyboardType="numeric"
          placeholder="달러로 입력"
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.tweakGrid}>
        <View style={styles.tweakItem}>
          <ValueStepper 
            label="조회 종목 수" 
            value={tickerCount} 
            onValueChange={setTickerCount} 
            step={1} min={1} max={50}
          />
        </View>
        <View style={styles.tweakItem}>
          <ValueStepper 
            label="현금 비중" 
            value={Math.round(cashRatio * 100)} 
            onValueChange={(v) => setCashRatio(v / 100)} 
            step={1} min={0} max={95} unit="%"
          />
        </View>
      </View>
      
      <View style={styles.modeToggleRow}>
        <View style={styles.modeToggleItem}>
          <Text style={styles.modeLabel}>정렬 기준</Text>
          <View style={styles.modeBtnGroup}>
            <TouchableOpacity 
              onPress={() => setSortMode('investor')}
              style={[styles.modeBtn, sortMode === 'investor' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, sortMode === 'investor' && styles.modeBtnTextActive]}>투자자 수</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setSortMode('ratio')}
              style={[styles.modeBtn, sortMode === 'ratio' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, sortMode === 'ratio' && styles.modeBtnTextActive]}>비중 합계</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.modeToggleItem}>
          <Text style={styles.modeLabel}>비중 산정 기준</Text>
          <View style={styles.modeBtnGroup}>
            <TouchableOpacity 
              onPress={() => setWeightMode('ratio')}
              style={[styles.modeBtn, weightMode === 'ratio' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, weightMode === 'ratio' && styles.modeBtnTextActive]}>비중 합계</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setWeightMode('investor')}
              style={[styles.modeBtn, weightMode === 'investor' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, weightMode === 'investor' && styles.modeBtnTextActive]}>투자자 수</Text>
            </TouchableOpacity>
          </View>
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
        {renderSummaryCard()}
        {renderAllocationChart()}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>권장 포트폴리오</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={tdsColors.blue500} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.listContainer}>
            {proposedPortfolio.map((item, idx) => (
              <ListRow
                key={item.stock}
                onPress={() => {
                  setSelectedStock(item);
                  setShowActionSheet(true);
                }}
                left={<View style={styles.rankWrap}><Text style={styles.rankText}>{idx + 1}</Text><LogoBadge name={item.name} ticker={item.stock} size={40} /></View>}
                title={item.name}
                subtitle={`${item.stock} · $${item.close}`}
                right={
                  <View style={styles.rightBlock}>
                    <Text style={styles.suggestedQtyText}>{formatNumber(item.suggestedQty)}주</Text>
                    <View style={styles.weightBarWrap}>
                      <View style={[styles.weightBar, { width: `${item.weightPercent}%` }]} />
                      <Text style={styles.weightPercentText}>{item.weightPercent.toFixed(1)}%</Text>
                    </View>
                  </View>
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* 액션 시트 */}
      <BottomSheet
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title={selectedStock ? `${selectedStock.stock}` : ''}
        cta={
          <View style={styles.sheetCtaRow}>
            <Button onPress={() => setShowActionSheet(false)} variant="weak" style={{ flex: 1 }}>닫기</Button>
            <Button
              onPress={() => {
                setShowActionSheet(false);
                if (selectedStock) {
                  router.push({
                    pathname: '/realtime-form',
                    params: {
                      ticker: selectedStock.stock,
                      market: 'NAS',
                      auto_fetch_price: 'true',
                    },
                  });
                }
              }}
              style={{ flex: 1 }}
            >
              실시간 등록
            </Button>
          </View>
        }
      >
        {selectedStock && (
          <View style={{ paddingBottom: 20 }}>
            <Text style={styles.sheetSubtitle}>{selectedStock.name}</Text>
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                setShowActionSheet(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-down-circle-outline" size={20} color={tdsColors.blue500} />
              <Text style={styles.actionOptionText}>매수</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                setShowActionSheet(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-up-circle-outline" size={20} color={tdsColors.red500} />
              <Text style={[styles.actionOptionText, { color: tdsColors.red500 }]}>매도</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
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
    fontSize: 26,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 14, color: tdsDark.textSecondary, marginTop: 6, lineHeight: 20 },
  
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
  summaryLabel: { fontSize: 14, fontWeight: '600', color: tdsDark.textSecondary },
  assetsInput: {
    fontSize: 20,
    fontWeight: '700',
    color: tdsColors.blue500,
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: tdsDark.border,
    marginBottom: 16,
  },
  tweakGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tweakItem: { flex: 1 },
  
  stepperContainer: {
    backgroundColor: tdsDark.bgSecondary,
    padding: 10,
    borderRadius: 16,
  },
  stepperLabel: { fontSize: 12, color: tdsDark.textSecondary, marginBottom: 6, fontWeight: '600' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tdsDark.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 18, color: tdsDark.textPrimary, fontWeight: '600' },
  stepperValue: { fontSize: 15, fontWeight: '700', color: tdsColors.blue600 },

  modeToggleRow: { flexDirection: 'row', gap: 12 },
  modeToggleItem: { flex: 1 },
  modeLabel: { fontSize: 12, color: tdsDark.textTertiary, marginBottom: 6 },
  modeBtnGroup: { flexDirection: 'row', backgroundColor: tdsDark.bgSecondary, borderRadius: 10, padding: 2 },
  modeBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: tdsDark.bgCard },
  modeBtnText: { fontSize: 11, color: tdsDark.textSecondary, fontWeight: '600' },
  modeBtnTextActive: { color: tdsColors.blue600 },

  chartSection: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 24,
    padding: 20,
  },
  chartSubText: { fontSize: 13, color: tdsDark.textTertiary, marginTop: -8, marginBottom: 16 },
  stackedBar: {
    height: 36,
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: tdsDark.bgSecondary,
    marginBottom: 16,
  },
  barSegment: { height: '100%' },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', width: '22%' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendLabel: { fontSize: 11, color: tdsDark.textSecondary, flex: 1 },
  legendValue: { fontSize: 11, color: tdsDark.textTertiary, fontWeight: '500' },

  listHeader: { marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  listContainer: { backgroundColor: tdsDark.bgCard, borderTopWidth: 1, borderTopColor: tdsDark.border },
  
  rankWrap: { flexDirection: 'row', alignItems: 'center' },
  rankText: { fontSize: 13, color: tdsDark.textTertiary, fontWeight: '600', marginRight: 12, width: 14 },
  
  rightBlock: { alignItems: 'flex-end', width: 120 },
  suggestedQtyText: { fontSize: 16, fontWeight: '700', color: tdsDark.textPrimary },
  weightBarWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 4, width: '100%', justifyContent: 'flex-end' },
  weightBar: { height: 4, backgroundColor: tdsColors.blue500, borderRadius: 2, marginRight: 8, maxWidth: 60 },
  weightPercentText: { fontSize: 12, color: tdsColors.blue600, fontWeight: '700' },

  sheetCtaRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  sheetSubtitle: { fontSize: 13, color: tdsDark.textTertiary, marginBottom: 16 },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  actionOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: tdsColors.blue500,
  },
});
