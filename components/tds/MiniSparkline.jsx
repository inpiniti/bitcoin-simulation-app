import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { tdsDark, tdsColors } from '../../constants/tdsColors';

/**
 * 라인 차트 — gifted-charts 기반
 * - 부드러운 곡선 (SVG 대신 Canvas)
 * - Y축/X축/마커 제거
 * - 최소 여백
 */
export function MiniSparkline({
  data,           // [{ dateStr, close }, ...]
  tradeDate,      // 분석 날짜 (YYYY-MM-DD)
  prediction,     // "up" | "down"
  width = 260,
  height = 50,
}) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 분석일 이전/이후 구분해서 색상 변경
    return data.map((item) => {
      const isBeforeTrade = item.dateStr < tradeDate;
      const color = isBeforeTrade ? tdsDark.textTertiary : prediction === 'up' ? tdsColors.red500 : tdsDark.priceDown;
      return {
        value: item.close,
        dataPointText: '',
        color,
      };
    });
  }, [data, tradeDate, prediction]);

  if (!chartData || chartData.length === 0) {
    return null;
  }

  const lineColor = prediction === 'up' ? tdsColors.red500 : tdsDark.priceDown;

  return (
    <View style={[styles.container, { width, height }]}>
      <LineChart
        data={{ data: chartData }}
        width={width}
        height={height}
        hideDataPoints={true}
        hideAxesAndRules={true}
        color={lineColor}
        thickness={2.5}
        curved={true}
        isAnimated={false}
        startFillColor={`${lineColor}10`}
        endFillColor={`${lineColor}00`}
        startOpacity={0.2}
        endOpacity={0}
        containerHeight={height}
        initialSpacing={0}
        endSpacing={0}
        spacing={(width - 8) / Math.max(chartData.length - 1, 1)}
        pointerConfig={{ pointerStripHeight: height, pointerStripColor: 'transparent', pointerConfig: { radius: 0 } }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
