import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { tdsDark, tdsColors } from '../../constants/tdsColors';

export function MiniSparkline({
  data,           // [{ dateStr, open, high, low, close }, ...]
  tradeDate,      // 분석 날짜 (YYYY-MM-DD)
  prediction,     // "up" | "down"
  width = 260,
  height = 60,
}) {
  const { candles, tradeX, labelY } = useMemo(() => {
    if (!data || data.length < 1) return {};

    const highs = data.map((d) => d.high ?? d.close);
    const lows = data.map((d) => d.low ?? d.close);
    const maxP = Math.max(...highs);
    const minP = Math.min(...lows);
    const range = maxP - minP || 1;

    const padX = 6;
    const padTop = 4;
    const padBottom = 14;
    const w = width - padX * 2;
    const h = height - padTop - padBottom;

    const toY = (price) => padTop + (1 - (price - minP) / range) * h;

    const n = data.length;
    const spacing = n > 1 ? w / (n - 1) : w;
    const candleW = Math.max(2, spacing * 0.55);

    const tradeIdx = data.findIndex((d) => d.dateStr >= tradeDate);

    const built = data.map((d, i) => {
      const x = padX + (n > 1 ? (i / (n - 1)) * w : w / 2);
      const openY = toY(d.open ?? d.close);
      const closeY = toY(d.close);
      const highY = toY(d.high ?? Math.max(d.open ?? d.close, d.close));
      const lowY = toY(d.low ?? Math.min(d.open ?? d.close, d.close));

      const isAfterTrade = tradeIdx >= 0 && i >= tradeIdx;
      const isCandleUp = d.close >= (d.open ?? d.close);

      let color;
      if (!isAfterTrade) {
        color = tdsDark.textTertiary;
      } else {
        color = isCandleUp ? tdsColors.red500 : tdsDark.priceDown;
      }

      const bodyTop = Math.min(openY, closeY);
      const bodyH = Math.max(1, Math.abs(openY - closeY));

      return { x, highY, lowY, bodyTop, bodyH, color, candleW };
    });

    const tx = tradeIdx >= 0 ? built[tradeIdx]?.x : null;

    return {
      candles: built,
      tradeX: tx,
      labelY: height - 3,
    };
  }, [data, tradeDate, prediction, width, height]);

  if (!candles || candles.length === 0) return null;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* 분석일 수직 점선 */}
        {tradeX != null ? (
          <Line
            x1={tradeX}
            y1={4}
            x2={tradeX}
            y2={height - 14}
            stroke={tdsDark.textTertiary}
            strokeWidth={1}
            strokeDasharray="2,3"
            strokeOpacity={0.4}
          />
        ) : null}

        {/* 캔들스틱 */}
        {candles.map((c, i) => (
          <React.Fragment key={i}>
            {/* 심지 (고가~저가) */}
            <Line
              x1={c.x}
              y1={c.highY}
              x2={c.x}
              y2={c.lowY}
              stroke={c.color}
              strokeWidth={1}
              strokeOpacity={0.7}
            />
            {/* 몸통 (시가~종가) */}
            <Rect
              x={c.x - c.candleW / 2}
              y={c.bodyTop}
              width={c.candleW}
              height={c.bodyH}
              fill={c.color}
              opacity={0.85}
            />
          </React.Fragment>
        ))}

        {/* 레이블: 예측시점 */}
        {tradeX != null ? (
          <SvgText
            x={tradeX}
            y={labelY}
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
          x={width - 4}
          y={labelY}
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
