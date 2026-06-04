import React, { useState } from 'react';
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

export default function AnalysisScreen() {
  const [ticker, setTicker] = useState('');
  const [analysisType, setAnalysisType] = useState('market'); // 'market' or 'earnings'
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [metaInfo, setMetaInfo] = useState(null);

  const handleRequestAnalysis = async () => {
    if (!ticker.trim()) {
      setErrorMsg('티커(예: AAPL, TSLA)를 입력해 주세요.');
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
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="주식 티커 입력 (예: TSLA, NVDA)"
            placeholderTextColor={tdsDark.textTertiary}
            value={ticker}
            onChangeText={(text) => {
              setTicker(text);
              setErrorMsg('');
            }}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={handleRequestAnalysis}
          />
          {ticker.length > 0 && (
            <TouchableOpacity onPress={() => setTicker('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={tdsDark.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 분석 타입 탭 선택 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.typeTab, analysisType === 'market' && styles.typeTabActive]}
            onPress={() => setAnalysisType('market')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="business-outline"
              size={16}
              color={analysisType === 'market' ? '#fff' : tdsDark.textSecondary}
            />
            <Text style={[styles.tabText, analysisType === 'market' && styles.tabTextActive]}>
              기업 분석 (Market)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeTab, analysisType === 'earnings' && styles.typeTabActive]}
            onPress={() => setAnalysisType('earnings')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={analysisType === 'earnings' ? '#fff' : tdsDark.textSecondary}
            />
            <Text style={[styles.tabText, analysisType === 'earnings' && styles.tabTextActive]}>
              실적 리뷰 (Earnings)
            </Text>
          </TouchableOpacity>
        </View>

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
                분석일: {metaInfo?.analysis_date} | {metaInfo?.analysis_type === 'market' ? '기업 기본 분석' : '분시 실적 리뷰'}
              </Text>
            </View>
            <Text style={styles.reportMarkdown}>{report}</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={48} color={tdsDark.textTertiary} />
            <Text style={styles.emptyTitle}>보고서가 없습니다</Text>
            <Text style={styles.emptyDesc}>분석하고자 하는 미국 주식 티커를 입력하고 리포트 생성을 눌러보세요.</Text>
          </View>
        )}
      </ScrollView>
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: tdsDark.textPrimary,
    fontWeight: '600',
  },
  clearBtn: { padding: 4 },

  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: tdsDark.bgSecondary,
    borderWidth: 1,
    borderColor: tdsDark.border,
  },
  typeTabActive: {
    backgroundColor: tdsColors.blue700,
    borderColor: tdsColors.blue700,
  },
  tabText: {
    fontSize: 13,
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
