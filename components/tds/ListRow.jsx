import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { tdsDark } from '../../constants/tdsColors';

export function ListRow({ left, title, subtitle, right, onPress, border = true, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.row, border && styles.border, style]}
    >
      {left && <View style={styles.leftSlot}>{left}</View>}
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.rightSlot}>{right}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tdsDark.border,
  },
  leftSlot: { marginRight: 12 },
  rightSlot: { marginLeft: 12 },
  center: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: tdsDark.textPrimary, lineHeight: 22.5 },
  subtitle: { fontSize: 13, color: tdsDark.textSecondary, lineHeight: 19.5, marginTop: 2 },
});

export default ListRow;
