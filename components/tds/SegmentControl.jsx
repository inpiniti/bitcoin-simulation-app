import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';

export function SegmentControl({ tabs, activeTab, onTabChange, style }) {
  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={[styles.tab, isActive && styles.activeTab]}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: tdsDark.bgSecondary,
    borderRadius: 18,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 14,
  },
  activeTab: {
    backgroundColor: tdsColors.blue500,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: tdsDark.textSecondary,
  },
  activeLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default SegmentControl;
