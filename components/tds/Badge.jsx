import { View, Text, StyleSheet } from 'react-native';
import { tdsColors } from '../../constants/tdsColors';

const colorMap = {
  blue: {
    fill: tdsColors.blue500,
    weak: tdsColors.blue50,
    text: tdsColors.blue600,
  },
  green: {
    fill: tdsColors.green500,
    weak: tdsColors.green50,
    text: tdsColors.green500,
  },
  red: {
    fill: tdsColors.red500,
    weak: tdsColors.red50,
    text: tdsColors.red600,
  },
  orange: {
    fill: tdsColors.orange500,
    weak: '#fff3e0',
    text: tdsColors.orange500,
  },
  grey: {
    fill: tdsColors.grey500,
    weak: tdsColors.grey100,
    text: tdsColors.grey600,
  },
};

const sizeMap = {
  xsmall: { paddingH: 4, paddingV: 1, fontSize: 10, borderRadius: 3 },
  small: { paddingH: 6, paddingV: 2, fontSize: 11, borderRadius: 4 },
  medium: { paddingH: 8, paddingV: 3, fontSize: 13, borderRadius: 4 },
  large: { paddingH: 10, paddingV: 4, fontSize: 15, borderRadius: 6 },
};

export function Badge({
  children,
  variant = 'fill',
  color = 'blue',
  size = 'small',
}) {
  const c = colorMap[color] ?? colorMap.blue;
  const s = sizeMap[size] ?? sizeMap.small;
  const bgColor = variant === 'fill' ? c.fill : c.weak;
  const textColor = variant === 'fill' ? '#fff' : c.text;

  return (
    <View
      style={[
        {
          backgroundColor: bgColor,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
          borderRadius: s.borderRadius,
          alignSelf: 'flex-start',
        },
      ]}
    >
      <Text
        style={{ color: textColor, fontSize: s.fontSize, fontWeight: '600' }}
      >
        {children}
      </Text>
    </View>
  );
}

export default Badge;
