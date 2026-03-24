import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

/**
 * 공통 뱃지 컴포넌트
 * variant: 'default' | 'buy' | 'sell' | 'success' | 'warning' | 'error'
 */
export function Badge({ label, variant = 'default', testID, style }) {
  const badgeStyle = [
    styles.base,
    styles[variant] ?? styles.default,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`${variant}Text`] ?? styles.defaultText,
  ];

  return (
    <View testID={testID} style={badgeStyle}>
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  // default
  default: {
    backgroundColor: Colors.bgTertiary,
  },
  defaultText: {
    color: Colors.textPrimary,
  },
  // buy (매수 - 빨강)
  buy: {
    backgroundColor: `${Colors.signalBuy}33`,
    borderWidth: 1,
    borderColor: Colors.signalBuy,
  },
  buyText: {
    color: Colors.signalBuy,
  },
  // sell (매도 - 초록)
  sell: {
    backgroundColor: `${Colors.signalSell}33`,
    borderWidth: 1,
    borderColor: Colors.signalSell,
  },
  sellText: {
    color: Colors.signalSell,
  },
  // success
  success: {
    backgroundColor: `${Colors.success}33`,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  successText: {
    color: Colors.success,
  },
  // warning
  warning: {
    backgroundColor: `${Colors.warning}33`,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningText: {
    color: Colors.warning,
  },
  // error
  error: {
    backgroundColor: `${Colors.error}33`,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
  },
});

export default Badge;
