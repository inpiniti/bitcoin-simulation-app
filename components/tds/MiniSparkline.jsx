import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { tdsDark, tdsColors } from '../../constants/tdsColors';

export function MiniSparkline({
  data,           // [{ dateStr, close }, ...]
  tradeDate,      // 분석 날짜 (YYYY-MM-DD)
  prediction,     // "up" | "down"
  width = 260,
  height = 50,
}) {
  const paths = useMemo(() => {
    if (!data || data.length < 2) return null;

    const closes = data.map((d) => d.close);
    const minClose = Math.min(...closes);
    const maxClose = Math.max(...closes);
    const range = maxClose - minClose || 1;

    const padX = 2;
    const padY = 5;
    const w = width - padX * 2;
    const h = height - padY * 2;

    const pts = data.map((item, i) => ({
      x: padX + (i / (data.length - 1)) * w,
      y: padY + (1 - (item.close - minClose) / range) * h,
      dateStr: item.dateStr,
    }));

    // tradeDate에서 분기
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

    return {
      before: cubicPath(beforePts),
      after: cubicPath(afterPts),
      tradeX: hasSplit ? pts[splitIdx].x : null,
    };
  }, [data, tradeDate, width, height]);

  if (!paths) return null;

  const afterColor = prediction === 'up' ? tdsColors.red500 : tdsDark.priceDown;

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        {paths.before ? (
          <Path
            d={paths.before}
            stroke={tdsDark.textTertiary}
            strokeWidth={1.5}
            fill="none"
            strokeOpacity={0.6}
          />
        ) : null}
        {paths.after ? (
          <Path
            d={paths.after}
            stroke={afterColor}
            strokeWidth={2}
            fill="none"
          />
        ) : null}
        {paths.tradeX != null ? (
          <Line
            x1={paths.tradeX}
            y1={4}
            x2={paths.tradeX}
            y2={height - 4}
            stroke={tdsDark.textTertiary}
            strokeWidth={1}
            strokeDasharray="2,3"
            strokeOpacity={0.45}
          />
        ) : null}
      </Svg>
    </View>
  );
}
