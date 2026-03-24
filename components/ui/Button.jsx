import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

/**
 * 공통 버튼 컴포넌트
 * variant: 'primary' | 'secondary' | 'danger' | 'outline'
 */
export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  testID,
  style,
  textStyle,
}) {
  const buttonStyle = [
    styles.base,
    styles[variant] ?? styles.primary,
    disabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`${variant}Label`] ?? styles.primaryLabel,
    disabled && styles.disabledLabel,
    textStyle,
  ];

  return (
    <TouchableOpacity
      testID={testID}
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.textPrimary} />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  primary: {
    backgroundColor: Colors.accentBlue,
  },
  primaryLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondary: {
    backgroundColor: Colors.bgTertiary,
  },
  secondaryLabel: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  danger: {
    backgroundColor: Colors.signalBuy,
  },
  dangerLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accentBlue,
  },
  outlineLabel: {
    color: Colors.accentBlue,
    fontWeight: '600',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledLabel: {
    color: Colors.textDisabled,
  },
  label: {
    fontSize: 14,
  },
});

export default Button;
