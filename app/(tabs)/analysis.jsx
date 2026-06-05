import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import { requestCompanyAnalysis } from '../../lib/companyAnalysisApi';
import { LogoBadge } from '../../components/tds/LogoBadge';
import { ListRow } from '../../components/tds/ListRow';
import { BottomSheet } from '../../components/tds/BottomSheet';
import { Button } from '../../components/tds/Button';
import { fetchPortfolioData } from '../../lib/portfolioApi';
import { fetchKospiMarketCap } from '../../lib/kisApi';
import { PORTFOLIO_DATA as US_FALLBACK_DATA } from '../../lib/portfolioData';
import useStore from '../../store/useStore';

const DOMESTIC_FALLBACK_DATA = [
  { stock: "005930", name: "삼성전자" },
  { stock: "000660", name: "SK하이닉스" },
  { stock: "373220", name: "LG에너지솔루션" },
  { stock: "207940", name: "삼성바이오로직스" },
  { stock: "005380", name: "현대차" },
  { stock: "000270", name: "기아" },
  { stock: "068270", name: "셀트리온" },
  { stock: "105560", name: "KB금융" },
  { stock: "055550", name: "신한지주" },
  { stock: "005490", name: "POSCO홀딩스" },
  { stock: "035420", name: "NAVER" },
  { stock: "035720", name: "카카오" },
  { stock: "247540", name: "에코프로비엠" },
  { stock: "086520", name: "에코프로" },
  { stock: "096770", name: "SK이노베이션" },
  { stock: "003550", name: "LG" },
];

const MarkdownRenderer = React.memo(({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const renderedElements = [];

  const parseInline = (text) => {
    if (!text) return null;

    // Split by bold (**bold**), italic (*italic*), or inline code (`code`)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text
            key={`bold-${index}`}
            style={{
              fontWeight: '700',
              color: tdsDark.textPrimary,
            }}
          >
            {part.slice(2, -2)}
          </Text>
        );
      }

      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <Text
            key={`italic-${index}`}
            style={{
              fontStyle: 'italic',
              color: tdsDark.textSecondary,
            }}
          >
            {part.slice(1, -1)}
          </Text>
        );
      }

      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <Text
            key={`code-${index}`}
            style={{
              fontSize: 13,
              backgroundColor: tdsDark.bgSecondary,
              color: tdsColors.blue700,
              paddingHorizontal: 4,
              borderRadius: 4,
              fontWeight: '600',
            }}
          >
            {part.slice(1, -1)}
          </Text>
        );
      }

      return (
        <Text key={`plain-${index}`} style={{ color: tdsDark.textPrimary }}>
          {part}
        </Text>
      );
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty line
    if (line.trim() === '') {
      renderedElements.push(<View key={`empty-${i}`} style={{ height: 6 }} />);
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      renderedElements.push(
        <View
          key={`hr-${i}`}
          style={{
            height: 1,
            backgroundColor: tdsDark.border,
            marginVertical: 12,
          }}
        />
      );
      continue;
    }

    // Headers (e.g., ### Title or ## Title)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];

      let fontSize = 14;
      let marginVertical = 8;
      if (level === 1) { fontSize = 19; marginVertical = 14; }
      else if (level === 2) { fontSize = 17; marginVertical = 12; }
      else if (level === 3) { fontSize = 15; marginVertical = 10; }

      renderedElements.push(
        <Text
          key={`header-${i}`}
          style={{
            fontSize,
            fontWeight: '800',
            color: tdsColors.blue600,
            marginTop: marginVertical,
            marginBottom: marginVertical / 2,
            letterSpacing: -0.3,
          }}
        >
          {parseInline(text)}
        </Text>
      );
      continue;
    }

    // Blockquotes (e.g. > Warning)
    const blockquoteMatch = line.match(/^>\s*(.+)$/);
    if (blockquoteMatch) {
      const text = blockquoteMatch[1];
      renderedElements.push(
        <View
          key={`blockquote-${i}`}
          style={{
            borderLeftWidth: 3,
            borderLeftColor: tdsColors.blue500,
            paddingLeft: 10,
            marginVertical: 8,
            backgroundColor: `${tdsColors.blue500}08`,
            borderRadius: 4,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontSize: 13.5,
              color: tdsDark.textSecondary,
              lineHeight: 19,
              fontStyle: 'italic',
            }}
          >
            {parseInline(text)}
          </Text>
        </View>
      );
      continue;
    }

    // List item (e.g., * Item or - Item)
    const listMatch = line.match(/^(\s*)([\*\-\+•])\s+(.+)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const text = listMatch[3];
      const depth = Math.floor(indent / 2);

      renderedElements.push(
        <View
          key={`list-${i}`}
          style={{
            flexDirection: 'row',
            paddingLeft: depth * 14,
            marginVertical: 3,
            alignItems: 'flex-start',
          }}
        >
          <Text
            style={{
              color: depth % 2 === 0 ? tdsColors.blue500 : tdsDark.textTertiary,
              marginRight: 6,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            {depth % 2 === 0 ? '•' : '◦'}
          </Text>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              color: tdsDark.textPrimary,
              lineHeight: 21,
            }}
          >
            {parseInline(text)}
          </Text>
        </View>
      );
      continue;
    }

    // Numbered ordered list (e.g., 1. Item)
    const orderedListMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (orderedListMatch) {
      const indent = orderedListMatch[1].length;
      const num = orderedListMatch[2];
      const text = orderedListMatch[3];
      const depth = Math.floor(indent / 2);

      renderedElements.push(
        <View
          key={`ordered-${i}`}
          style={{
            flexDirection: 'row',
            paddingLeft: depth * 14,
            marginVertical: 3,
            alignItems: 'flex-start',
          }}
        >
          <Text
            style={{
              color: tdsColors.blue500,
              marginRight: 6,
              fontSize: 14,
              fontWeight: '600',
              lineHeight: 21,
            }}
          >
            {num}.
          </Text>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              color: tdsDark.textPrimary,
              lineHeight: 21,
            }}
          >
            {parseInline(text)}
          </Text>
        </View>
      );
      continue;
    }

    // Regular paragraph
    renderedElements.push(
      <Text
        key={`para-${i}`}
        style={{
          fontSize: 14,
          color: tdsDark.textPrimary,
          lineHeight: 22,
          marginVertical: 2,
        }}
      >
        {parseInline(line)}
      </Text>
    );
  }

  return <View style={{ paddingVertical: 4 }}>{renderedElements}</View>;
});

export default function AnalysisScreen() {
  const marketType = useStore((s) => s.marketType);
  const setMarketType = useStore((s) => s.setMarketType);
  const authMode = useStore((s) => s.authMode);

  const [ticker, setTicker] = useState('');
  const [tickerName, setTickerName] = useState('');
  const [analysisType, setAnalysisType] = useState('market'); // 'market', 'earnings', 'valuation', 'preview', 'moat', 'risk'
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [metaInfo, setMetaInfo] = useState(null);
  
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 주식 목록 저장을 위한 상태
  const [overseasStocks, setOverseasStocks] = useState([]);
  const [domesticStocks, setDomesticStocks] = useState([]);
  const [stocksLoading, setStocksLoading] = useState(false);

  // 해외/국내 주식 목록 불러오기
  const loadStocks = useCallback(async () => {
    setStocksLoading(true);
    try {
      if (marketType === 'overseas') {
        if (overseasStocks.length > 0) return;
        try {
          const res = await fetchPortfolioData();
          setOverseasStocks(res.based_on_stock || US_FALLBACK_DATA);
        } catch (e) {
          console.warn('[Analysis] Fetch overseas stocks failed, fallback used');
          setOverseasStocks(US_FALLBACK_DATA);
        }
      } else {
        if (domesticStocks.length > 0) return;
        try {
          if (authMode !== 'guest' && authMode !== 'locked') {
            const rows = await fetchKospiMarketCap('2001');
            const stocks = rows.map(r => ({ stock: r.stock, name: r.name }));
            setDomesticStocks(stocks.length > 0 ? stocks : DOMESTIC_FALLBACK_DATA);
          } else {
            setDomesticStocks(DOMESTIC_FALLBACK_DATA);
          }
        } catch (e) {
          console.warn('[Analysis] Fetch domestic stocks failed, fallback used');
          setDomesticStocks(DOMESTIC_FALLBACK_DATA);
        }
      }
    } finally {
      setStocksLoading(false);
    }
  }, [marketType, overseasStocks.length, domesticStocks.length, authMode]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  // 마켓 타입 변경 시 선택 종목 초기화
  useEffect(() => {
    setTicker('');
    setTickerName('');
    setSearchQuery('');
  }, [marketType]);

  const currentStocks = useMemo(() => {
    return marketType === 'overseas' ? overseasStocks : domesticStocks;
  }, [marketType, overseasStocks, domesticStocks]);

  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return currentStocks;
    const q = searchQuery.toLowerCase().trim();
    return currentStocks.filter(
      (s) =>
        s.stock.toLowerCase().includes(q) ||
        (s.name && s.name.toLowerCase().includes(q))
    );
  }, [searchQuery, currentStocks]);

  const analysisTypes = [
    { id: 'market', label: '기업 분석', icon: 'business-outline' },
    { id: 'earnings', label: '실적 리뷰', icon: 'document-text-outline' },
    { id: 'valuation', label: '적정 가치', icon: 'scale-outline' },
    { id: 'preview', label: '실적 프리뷰', icon: 'trending-up-outline' },
    { id: 'moat', label: '해자 분석', icon: 'shield-checkmark-outline' },
    { id: 'risk', label: '리스크 감지', icon: 'alert-circle-outline' },
  ];

  const getAnalysisTypeLabel = (type) => {
    switch (type) {
      case 'market': return '기업 기본 분석';
      case 'earnings': return '실적 리뷰';
      case 'valuation': return '적정 가치 평가';
      case 'preview': return '실적 프리뷰';
      case 'moat': return '해자 및 AI 준비도';
      case 'risk': return '리스크 & 경고 신호';
      default: return '기업 분석';
    }
  };

  const handleRequestAnalysis = async () => {
    if (!ticker) {
      setErrorMsg(marketType === 'overseas' ? '분석할 미국 주식을 선택해 주세요.' : '분석할 국내 주식을 선택해 주세요.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    setReport('');
    setMetaInfo(null);

    try {
      const data = await requestCompanyAnalysis(ticker.trim(), analysisType);
      if (data && data.report) {
        setReport(data.report);
        setMetaInfo({
          ticker: data.ticker,
          analysis_type: data.analysis_type,
          analysis_date: data.analysis_date,
        });
      } else {
        setErrorMsg('리포트 생성에 실패했습니다. 데이터를 다시 확인해주세요.');
      }
    } catch (e) {
      setErrorMsg(e.message || '요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.headerEyebrow}>Google Gemini 2.0 & Anthropic Prompts</Text>
          <Text style={styles.headerTitle}>AI 기업분석</Text>
          <Text style={styles.headerSub}>기업 재무와 뉴스를 바탕으로 지능형 보고서를 작성해요</Text>
        </View>
      </View>

      {/* 입력 폼 */}
      <View style={styles.formCard}>
        <View style={styles.inputRow}>
          {/* 종목 선택 버튼 */}
          <TouchableOpacity 
            style={styles.stockSelectBtn} 
            onPress={() => {
              setSearchQuery('');
              setShowBottomSheet(true);
            }}
            activeOpacity={0.7}
          >
            {ticker ? (
              <View style={styles.selectedStockContainer}>
                <LogoBadge ticker={ticker} name={tickerName} size={24} />
                <Text style={styles.selectedStockText} numberOfLines={1}>
                  {ticker}  <Text style={styles.selectedStockName}>{tickerName}</Text>
                </Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>분석할 종목을 선택하세요</Text>
            )}
            <Ionicons name="chevron-down" size={16} color={tdsDark.textTertiary} style={styles.chevronIcon} />
          </TouchableOpacity>

          {/* 미장 / 국장 토글 버튼 */}
          <View style={styles.marketToggleContainer}>
            <TouchableOpacity 
              style={[styles.marketBtn, marketType === 'overseas' && styles.marketBtnActive]}
              onPress={() => setMarketType('overseas')}
              activeOpacity={0.7}
            >
              <Text style={[styles.marketBtnText, marketType === 'overseas' && styles.marketBtnTextActive]}>미장</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.marketBtn, marketType === 'domestic' && styles.marketBtnActive]}
              onPress={() => setMarketType('domestic')}
              activeOpacity={0.7}
            >
              <Text style={[styles.marketBtnText, marketType === 'domestic' && styles.marketBtnTextActive]}>국장</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 분석 타입 칩 리스트 선택 */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabScrollContainer}
          contentContainerStyle={styles.tabContainer}
        >
          {analysisTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typeTab, analysisType === type.id && styles.typeTabActive]}
              onPress={() => setAnalysisType(type.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={type.icon}
                size={14}
                color={analysisType === type.id ? '#fff' : tdsDark.textSecondary}
              />
              <Text style={[styles.tabText, analysisType === type.id && styles.tabTextActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 실행 버튼 */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleRequestAnalysis}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>분석 보고서 생성하기</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 결과 영역 */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color={tdsColors.red500} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tdsColors.blue500} />
            <Text style={styles.loadingText}>Gemini AI가 실시간 재무 분석 및 최근 뉴스를 정리하고 있습니다...</Text>
          </View>
        ) : report ? (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={styles.reportBadge}>
                <Text style={styles.reportBadgeText}>{metaInfo?.ticker}</Text>
              </View>
              <Text style={styles.reportDate}>
                분석일: {metaInfo?.analysis_date} | {getAnalysisTypeLabel(metaInfo?.analysis_type)}
              </Text>
            </View>
            <MarkdownRenderer content={report} />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={48} color={tdsDark.textTertiary} />
            <Text style={styles.emptyTitle}>보고서가 없습니다</Text>
            <Text style={styles.emptyDesc}>분석하고자 하는 주식을 선택하고 리포트 생성을 눌러보세요.</Text>
          </View>
        )}
      </ScrollView>

      {/* 종목 선택 BottomSheet */}
      <BottomSheet
        open={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title={marketType === 'overseas' ? '미국 주식 선택' : '국내 주식 선택'}
        cta={
          <Button onPress={() => setShowBottomSheet(false)} variant="weak" style={styles.sheetCloseBtn}>
            닫기
          </Button>
        }
      >
        <View style={styles.sheetContent}>
          {/* 검색 바 */}
          <View style={styles.sheetSearchWrapper}>
            <Ionicons name="search" size={16} color={tdsDark.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.sheetSearchInput}
              placeholder="종목명 또는 티커 검색"
              placeholderTextColor={tdsDark.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <Ionicons name="close-circle" size={16} color={tdsDark.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* 종목 리스트 */}
          <ScrollView 
            style={styles.sheetScroll} 
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {stocksLoading ? (
              <View style={styles.sheetLoadingContainer}>
                <ActivityIndicator size="small" color={tdsColors.blue500} />
                <Text style={styles.sheetLoadingText}>종목 목록을 불러오고 있습니다...</Text>
              </View>
            ) : filteredStocks.length > 0 ? (
              filteredStocks.map((item) => (
                <ListRow
                  key={item.stock}
                  onPress={() => {
                    setTicker(item.stock);
                    setTickerName(item.name || item.stock);
                    setShowBottomSheet(false);
                  }}
                  left={<LogoBadge ticker={item.stock} name={item.name} size={36} />}
                  title={item.name || item.stock}
                  subtitle={item.stock}
                  border={true}
                  style={styles.sheetRow}
                />
              ))
            ) : (
              <View style={styles.sheetEmptyContainer}>
                <Text style={styles.sheetEmptyText}>검색 결과가 없습니다.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  
  screenHeader: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  headerEyebrow: { fontSize: 11, color: tdsColors.blue700, fontWeight: '700', marginBottom: 2 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 13, color: tdsDark.textSecondary, marginTop: 2 },

  formCard: {
    marginHorizontal: 16,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: tdsDark.border,
    marginBottom: 12,
    shadowColor: tdsDark.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stockSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  selectedStockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedStockText: {
    fontSize: 14,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    flex: 1,
  },
  selectedStockName: {
    fontSize: 12,
    fontWeight: '500',
    color: tdsDark.textSecondary,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
    color: tdsDark.textTertiary,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  marketToggleContainer: {
    flexDirection: 'row',
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 12,
    padding: 3,
    height: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  marketBtn: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
  },
  marketBtnActive: {
    backgroundColor: tdsDark.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  marketBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: tdsDark.textSecondary,
  },
  marketBtnTextActive: {
    color: tdsColors.blue500,
    fontWeight: '700',
  },
  sheetCloseBtn: {
    width: '100%',
  },
  sheetContent: {
    paddingTop: 8,
  },
  sheetSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  searchIcon: {
    marginRight: 6,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 13,
    color: tdsDark.textPrimary,
    fontWeight: '500',
  },
  searchClearBtn: {
    padding: 4,
  },
  sheetScroll: {
    maxHeight: 350,
  },
  sheetScrollContent: {
    paddingBottom: 16,
  },
  sheetRow: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  sheetLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  sheetLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: tdsDark.textSecondary,
  },
  sheetEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  sheetEmptyText: {
    fontSize: 13,
    color: tdsDark.textTertiary,
  },

  tabScrollContainer: {
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  typeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: tdsDark.bgSecondary,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  typeTabActive: {
    backgroundColor: tdsColors.blue700,
    borderColor: tdsColors.blue700,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: tdsDark.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },

  submitBtn: {
    backgroundColor: tdsColors.blue700,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: tdsColors.grey400,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: tdsDark.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${tdsColors.red500}10`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: tdsColors.red600,
    fontWeight: '600',
    flex: 1,
  },

  reportCard: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: tdsDark.border,
    shadowColor: tdsDark.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: tdsDark.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  reportBadge: {
    backgroundColor: tdsColors.blue50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reportBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: tdsColors.blue700,
  },
  reportDate: {
    fontSize: 12,
    color: tdsDark.textSecondary,
    fontWeight: '500',
  },
  reportMarkdown: {
    fontSize: 14,
    color: tdsDark.textPrimary,
    lineHeight: 22,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tdsDark.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 30,
  },
});
