import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import { tdsDark, tdsColors } from '../../constants/tdsColors';

export function MiniSparkline({
  data,           // [{ dateStr, close }, ...]
  tradeDate,      // 분석 날짜 (YYYY-MM-DD)
  prediction,     // "up" | "down"
  width = 260,
  height = 60,
}) {
  const paths = useMemo(() => {
    if (!data || data.length < 2) return null;

    const closes = data.map((d) => d.close);
    const minClose = Math.min(...closes);
    const maxClose = Math.max(...closes);
    const range = maxClose - minClose || 1;

    const padX = 0;
    const padTop = 4;
    const padBottom = 14; // 레이블 공간
    const w = width - padX * 2;
    const h = height - padTop - padBottom;

    const pts = data.map((item, i) => ({
      x: padX + (i / (data.length - 1)) * w,
      y: padTop + (1 - (item.close - minClose) / range) * h,
      dateStr: item.dateStr,
    }));

    // tradeDate 기준 분기
    const splitIdx = pts.findIndex((p) => p.dateStr >= tradeDate);
    const hasSplit = splitIdx > 0 && splitIdx < pts.length;

    const beforePts = hasSplit ? pts.slice(0, splitIdx + 1) : pts;
    const afterPts = hasSplit ? pts.slice(splitIdx) : [];

    // cubic bezier 부드러운 곡선
    function cubicPath(points) {
      if (points.length < 2) return '';
      let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let i = 1; i < points.length; i++) {
        const dx = (points[i].x - points[i - 1].x) * 0.4;
        d += ` C ${(points[i - 1].x + dx).toFixed(1)} ${points[i - 1].y.toFixed(1)},`;
        d += ` ${(points[i].x - dx).toFixed(1)} ${points[i].y.toFixed(1)},`;
        d += ` ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
      }
      return d;
    }

    const tradeX = hasSplit ? pts[splitIdx].x : null;
    const labelY = height - 3;

    return {
      before: cubicPath(beforePts),
      after: cubicPath(afterPts),
      tradeX,
      labelY,
    };
  }, [data, tradeDate, width, height]);

  if (!paths) return null;

  const afterColor = prediction === 'up' ? tdsColors.red500 : tdsDark.priceDown;

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        {/* 분석일 이전 회색 라인 */}
        {paths.before ? (
          <Path
            d={paths.before}
            stroke={tdsDark.textTertiary}
            strokeWidth={1.5}
            fill="none"
            strokeOpacity={0.6}
          />
        ) : null}
        {/* 분석일 이후 예측색 라인 */}
        {paths.after ? (
          <Path
            d={paths.after}
            stroke={afterColor}
            strokeWidth={2}
            fill="none"
          />
        ) : null}
        {/* 분석일 수직 점선 */}
        {paths.tradeX != null ? (
          <Line
            x1={paths.tradeX}
            y1={4}
            x2={paths.tradeX}
            y2={height - 14}
            stroke={tdsDark.textTertiary}
            strokeWidth={1}
            strokeDasharray="2,3"
            strokeOpacity={0.4}
          />
        ) : null}
        {/* 레이블: 예측시점 */}
        {paths.tradeX != null ? (
          <SvgText
            x={paths.tradeX}
            y={paths.labelY}
            textAnchor="middle"
            fontSize={9}
            fill={tdsDark.textTertiary}
            fontWeight="500"
          >
            예측시점
          </SvgText>
        ) : null}
        {/* 레이블: 현재 */}
        <SvgText
          x={width - 2}
          y={paths.labelY}
          textAnchor="end"
          fontSize={9}
          fill={tdsDark.textTertiary}
          fontWeight="500"
        >
          현재
        </SvgText>
      </Svg>
    </View>
  );
}

