import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { tdsColors } from '../../constants/tdsColors';

const colorMap = {
  primary: { fill: tdsColors.blue500, weak: tdsColors.blue50,  text: '#fff', weakText: tdsColors.blue600 },
  dark:    { fill: tdsColors.grey800, weak: tdsColors.grey100, text: '#fff', weakText: tdsColors.grey800 },
  danger:  { fill: tdsColors.red500,  weak: tdsColors.red50,   text: '#fff', weakText: tdsColors.red600 },
};

const sizeMap = {
  small:  { height: 32, paddingH: 12, fontSize: 13 },
  medium: { height: 40, paddingH: 16, fontSize: 15 },
  large:  { height: 48, paddingH: 20, fontSize: 16 },
  xlarge: { height: 56, paddingH: 24, fontSize: 17 },
};

export function Button({
  children,
  onPress,
  variant = 'fill',
  color = 'primary',
  size = 'large',
  display = 'inline',
  loading = false,
  disabled = false,
  style,
}) {
  const c = colorMap[color] ?? colorMap.primary;
  const s = sizeMap[size] ?? sizeMap.large;
  const bgColor   = variant === 'fill' ? c.fill : c.weak;
  const textColor = variant === 'fill' ? c.text : c.weakText;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        { backgroundColor: bgColor, height: s.height, paddingHorizontal: s.paddingH },
        display === 'full' && styles.full,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={{ color: textColor, fontSize: s.fontSize, fontWeight: '600' }}>{children}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  full: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.4,
  },
});

export default Button;
