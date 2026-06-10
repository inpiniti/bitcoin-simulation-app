import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../../constants/tdsColors';
import Markdown from 'react-native-markdown-display';
import { fetchMacroData, requestMacroAnalysis } from '../../lib/companyAnalysisApi';

const markdownStyles = {
  body: {
    color: tdsDark.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  heading1: {
    color: tdsColors.blue600,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heading2: {
    color: tdsColors.blue600,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heading3: {
    color: tdsColors.blue600,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  strong: {
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  em: {
    fontStyle: 'italic',
    color: tdsDark.textSecondary,
  },
  hr: {
    backgroundColor: tdsDark.border,
    height: 1,
    marginVertical: 12,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: tdsColors.blue500,
    backgroundColor: `${tdsColors.blue500}08`,
    paddingLeft: 10,
    paddingVertical: 6,
    marginVertical: 8,
    borderRadius: 4,
  },
  code_inline: {
    fontSize: 13,
    backgroundColor: tdsDark.bgSecondary,
    color: tdsColors.blue700,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontWeight: '600',
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
};

const MarkdownRenderer = React.memo(({ content }) => {
  if (!content) return null;
  return (
    <Markdown style={markdownStyles}>
      {content}
    </Markdown>
  );
});

export default function MacroScreen() {
  const [macroData, setMacroData] = useState(null);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [report, setReport] = useState('');
  const [analysisDate, setAnalysisDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 실시간 매크로 지표만 신속 로드
  const loadMacroIndicators = useCallback(async (silent = false) => {
    if (!silent) setIndicatorsLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchMacroData();
      if (data && data.macro_data) {
        setMacroData(data.macro_data);
      } else {
        console.warn('[MacroScreen] Failed to fetch macro data response structure');
      }
    } catch (e) {
      console.error('[MacroScreen] fetch macro data error:', e);
      if (!silent) setErrorMsg('실시간 거시경제 지표를 불러오는 중 오류가 발생했습니다.');
    } finally {
      if (!silent) setIndicatorsLoading(false);
    }
  }, []);

  // 화면 마운트 시 실시간 지표 로드
  useEffect(() => {
    loadMacroIndicators();
  }, [loadMacroIndicators]);

  // AI 거시경제 리포트 생성 요청
  const handleRequestMacroAnalysis = async () => {
    setAnalysisLoading(true);
    setErrorMsg('');
    setReport('');
    setAnalysisDate('');

    try {
      const data = await requestMacroAnalysis();
      if (data && data.report) {
        setReport(data.report);
        setAnalysisDate(data.analysis_date);
        // 최신 리얼타임 지수도 응답 데이터에서 동기화
        if (data.macro_data) {
          setMacroData(data.macro_data);
        }
      } else {
        setErrorMsg('리포트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (e) {
      setErrorMsg(e.message || 'AI 거시경제 분석 요청 중 오류가 발생했습니다.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.headerEyebrow}>Google Gemini 2.0 & Anthropic Prompts</Text>
          <Text style={styles.headerTitle}>글로벌 거시경제</Text>
          <Text style={styles.headerSub}>실시간 시장 지표와 AI가 분석한 자산 배분 비중</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color={tdsColors.red500} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* 1. 실시간 거시경제 지표 상황판 */}
        <View style={styles.macroCard}>
          <View style={styles.macroHeader}>
            <Text style={styles.macroTitle}>실시간 거시경제 지표</Text>
            <TouchableOpacity 
              onPress={() => loadMacroIndicators(false)} 
              disabled={indicatorsLoading}
              style={styles.refreshBtn}
              activeOpacity={0.7}
            >
              {indicatorsLoading ? (
                <ActivityIndicator size="small" color={tdsColors.blue700} />
              ) : (
                <Ionicons name="refresh" size={18} color={tdsColors.blue700} />
              )}
            </TouchableOpacity>
          </View>

          {macroData ? (
            <View style={styles.indicatorsGrid}>
              {Object.values(macroData).map((item, idx) => {
                const isUp = item.changePercent > 0;
                const isZero = item.changePercent === 0;
                let changeColor = '#3b82f6';
                if (isUp) changeColor = '#ef4444';
                if (isZero) changeColor = tdsDark.textSecondary;

                const arrow = isUp ? '▲' : (isZero ? '' : '▼');
                let formattedPrice = item.price.toLocaleString(undefined, { maximumFractionDigits: 2 });
                if (item.name.includes("환율")) {
                  formattedPrice = item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }

                return (
                  <View key={idx} style={styles.indicatorCard}>
                    <Text style={styles.indicatorName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.indicatorPrice}>{formattedPrice}</Text>
                    <Text style={[styles.indicatorChange, { color: changeColor }]}>
                      {arrow} {Math.abs(item.changePercent).toFixed(2)}%
                    </Text>
                    {item.twoHundredDayMaDiff !== undefined && item.fiftyTwoWeekPercentile !== undefined && (
                      <Text style={styles.indicatorTrendSub}>
                        200일선 {item.twoHundredDayMaDiff >= 0 ? '+' : ''}{item.twoHundredDayMaDiff.toFixed(1)}% (52주 {item.fiftyTwoWeekPercentile.toFixed(0)}%)
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : !indicatorsLoading ? (
            <Text style={styles.emptyGridText}>지표 데이터를 로드할 수 없습니다.</Text>
          ) : (
            <ActivityIndicator size="medium" color={tdsColors.blue700} style={{ marginVertical: 20 }} />
          )}
        </View>

        {/* 2. AI 분석 버튼 */}
        <TouchableOpacity
          style={[styles.submitBtn, (analysisLoading || indicatorsLoading) && styles.submitBtnDisabled]}
          onPress={handleRequestMacroAnalysis}
          disabled={analysisLoading || indicatorsLoading}
          activeOpacity={0.8}
        >
          {analysisLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.submitBtnInner}>
              <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>AI 거시경제 보고서 생성하기</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 3. 분석 결과 영역 */}
        {analysisLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tdsColors.blue500} />
            <Text style={styles.loadingText}>
              Gemini AI가 글로벌 채권, 유가, VIX 공포지수 및 주요국 증시를 분석하여 거시경제 정세를 진단하고 있습니다...
            </Text>
          </View>
        ) : report ? (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={styles.reportBadge}>
                <Text style={styles.reportBadgeText}>MACRO</Text>
              </View>
              <Text style={styles.reportDate}>분석일: {analysisDate} | 거시 지표 및 자산 배분 가이드</Text>
            </View>

            {/* 권장 자산배분 바 차트 시각화 */}
            <MacroAssetAllocationGauge report={report} />

            {/* 리포트 마크다운 본문 */}
            <MarkdownRenderer content={report} />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="earth" size={48} color={tdsDark.textTertiary} />
            <Text style={styles.emptyTitle}>거시경제 보고서가 없습니다</Text>
            <Text style={styles.emptyDesc}>
              위의 버튼을 눌러 실시간 지표 기반의 AI 글로벌 마켓 국면 진단 및 자산 배분 조언을 받아보세요.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// 자산배분 추천 비중 게이지바 컴포넌트
function MacroAssetAllocationGauge({ report }) {
  let stockRatio = 50;
  let cashRatio = 50;

  if (report) {
    const match1 = report.match(/주식\s*(?:비중)?\s*(\d+)\s*%\s*(?:vs|대)?\s*현금\s*(?:비중)?\s*(\d+)\s*%/);
    const match2 = report.match(/주식\s*(?:비중)?\s*(\d+)\s*%[^0-9]+현금\s*(?:비중)?\s*(\d+)\s*%/);
    const match3 = report.match(/주식\s*:\s*현금\s*=\s*(\d+)\s*:\s*(\d+)/);

    const match = match1 || match2 || match3;
    if (match) {
      const s = parseInt(match[1], 10);
      const c = parseInt(match[2], 10);
      if (s + c === 100 || (s > 0 && c > 0 && s + c <= 100)) {
        stockRatio = s;
        cashRatio = c;
      }
    }
  }

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeTitle}>권장 자산 배분 비중</Text>
        <Text style={styles.gaugeSub}>포트폴리오 매니저의 거시경제 기반 권고</Text>
      </View>
      <View style={styles.gaugeBarWrapper}>
        <View style={[styles.gaugeBarCash, { flex: cashRatio }]} />
        <View style={[styles.gaugeBarStock, { flex: stockRatio }]} />
      </View>
      <View style={styles.gaugeLabelRow}>
        <View style={styles.gaugeLabelItem}>
          <View style={[styles.colorDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.gaugeLabelText}>현금 보유 {cashRatio}%</Text>
        </View>
        <View style={styles.gaugeLabelItem}>
          <View style={[styles.colorDot, { backgroundColor: '#ff5c00' }]} />
          <Text style={styles.gaugeLabelText}>주식 투자 {stockRatio}%</Text>
        </View>
      </View>
    </View>
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

  scrollContent: {
    paddingBottom: 40,
  },

  macroCard: {
    marginHorizontal: 16,
    backgroundColor: tdsDark.bgCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: tdsDark.border,
    marginBottom: 16,
    shadowColor: tdsDark.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  macroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  refreshBtn: {
    padding: 4,
  },
  emptyGridText: {
    color: tdsDark.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 10,
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  indicatorCard: {
    width: '48.5%',
    backgroundColor: tdsDark.bgSecondary,
    borderWidth: 1,
    borderColor: tdsDark.border,
    borderRadius: 12,
    padding: 10,
  },
  indicatorName: {
    fontSize: 11,
    fontWeight: '600',
    color: tdsDark.textSecondary,
    marginBottom: 4,
  },
  indicatorPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: tdsDark.textPrimary,
    marginBottom: 2,
  },
  indicatorChange: {
    fontSize: 11,
    fontWeight: '700',
  },
  indicatorTrendSub: {
    fontSize: 9.5,
    color: tdsDark.textTertiary,
    marginTop: 3,
    fontWeight: '500',
  },

  submitBtn: {
    backgroundColor: tdsColors.blue700,
    marginHorizontal: 16,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${tdsColors.red500}10`,
    borderColor: `${tdsColors.red500}30`,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: tdsColors.red500,
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 13,
    color: tdsDark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  reportCard: {
    marginHorizontal: 16,
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
    marginBottom: 16,
  },
  reportBadge: {
    backgroundColor: tdsColors.blue700,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reportBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  reportDate: {
    fontSize: 11,
    color: tdsDark.textSecondary,
    flex: 1,
  },

  gaugeContainer: {
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: tdsDark.border,
    marginBottom: 16,
  },
  gaugeHeader: {
    marginBottom: 10,
  },
  gaugeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: tdsDark.textPrimary,
  },
  gaugeSub: {
    fontSize: 11,
    color: tdsDark.textSecondary,
    marginTop: 2,
  },
  gaugeBarWrapper: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: tdsDark.border,
    marginVertical: 4,
  },
  gaugeBarStock: {
    backgroundColor: '#ff5c00', // 주식 오렌지
  },
  gaugeBarCash: {
    backgroundColor: '#10b981', // 현금 그린
  },
  gaugeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gaugeLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gaugeLabelText: {
    fontSize: 11,
    color: tdsDark.textSecondary,
    fontWeight: '600',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tdsDark.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: tdsDark.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
