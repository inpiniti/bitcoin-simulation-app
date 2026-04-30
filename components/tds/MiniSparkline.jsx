import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { tdsColors, tdsDark } from '../../constants/tdsColors';

/**
 * SVG 기반 미니 라인 차트
 * 분석 날짜를 기준으로 차트를 두 구간으로 나눔:
 * - tradeDate 이전: 회색
 * - tradeDate 이후: 예측 방향에 따라 빨강(up) 또는 파랑(down)
 */
export function MiniSparkline({
  data,           // [{ dateStr, close }, ...]
  tradeDate,      // 분석 날짜 (YYYY-MM-DD)
  prediction,     // "up" | "down"
  width = 260,
  height = 50,
  compact = false, // true면 배경 없음, 여백 최소
}) {
  const padding = { left: 8, right: 8, top: 8, bottom: 8 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    if (!data || data.length === 0) return [];

    const closes = data.map((d) => d.close);
    const minClose = Math.min(...closes);
    const maxClose = Math.max(...closes);
    const range = maxClose - minClose || 1;

    return data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * innerWidth;
      const y =
        padding.top +
        innerHeight -
        ((d.close - minClose) / range) * innerHeight;
      const isBeforeTrade = d.dateStr < tradeDate;
      return { x, y, dateStr: d.dateStr, close: d.close, isBeforeTrade };
    });
  }, [data, tradeDate, width, height]);

  if (points.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Svg width={width} height={height}>
          <SvgText
            x={width / 2}
            y={height / 2}
            fontSize="12"
            fill={tdsDark.textTertiary}
            textAnchor="middle"
          >
            데이터 없음
          </SvgText>
        </Svg>
      </View>
    );
  }

  // 분석 날짜 위치 찾기
  const tradePointIndex = points.findIndex((p) => p.dateStr === tradeDate);
  const tradePointX = tradePointIndex >= 0 ? points[tradePointIndex].x : null;

  // 구간별 polyline 생성
  const beforePoints = points.filter((p) => p.isBeforeTrade);
  const afterPoints = points.filter((p) => !p.isBeforeTrade);

  const getLineColor = () => {
    return prediction === 'up' ? tdsColors.red500 : tdsDark.priceDown;
  };

  const polylineStr = (pts) =>
    pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={[compact ? styles.containerCompact : styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* 분석 날짜 수직선 */}
        {tradePointX != null && (
          <Line
            x1={tradePointX}
            y1={padding.top}
            x2={tradePointX}
            y2={height - padding.bottom}
            stroke={tdsDark.border}
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        )}

        {/* 과거 구간 (회색) */}
        {beforePoints.length > 1 && (
          <Polyline
            points={polylineStr(beforePoints)}
            stroke={tdsColors.grey500}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* 미래 구간 (예측 색상) */}
        {afterPoints.length > 1 && (
          <Polyline
            points={polylineStr(afterPoints)}
            stroke={getLineColor()}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* 분석 날짜 포인트 강조 */}
        {tradePointIndex >= 0 && (
          <G>
            <Circle
              cx={points[tradePointIndex].x}
              cy={points[tradePointIndex].y}
              r="4"
              fill={tdsColors.blue500}
              stroke={tdsColors.white}
              strokeWidth="1.5"
            />
          </G>
        )}

        {/* Y축 라벨 (최고가, 최저가) */}
        {points.length > 0 && (
          <>
            <SvgText
              x={padding.left - 2}
              y={padding.top + 10}
              fontSize="9"
              fill={tdsDark.textTertiary}
              textAnchor="end"
            >
              {Math.max(...points.map((p) => p.close)).toFixed(0)}
            </SvgText>
            <SvgText
              x={padding.left - 2}
              y={height - padding.bottom + 3}
              fontSize="9"
              fill={tdsDark.textTertiary}
              textAnchor="end"
            >
              {Math.min(...points.map((p) => p.close)).toFixed(0)}
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  containerCompact: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    overflow: 'hidden',
  },
});
