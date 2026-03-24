import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Settings } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/colors';

export default function TradingScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Settings color={Colors.accentBlue} size={24} />
        <Text style={styles.headerTitle}>자동매매 설정</Text>
      </View>

      <Card title="매매 상태">
        <View style={styles.row}>
          <Text style={styles.label}>자동매매</Text>
          <Badge label="비활성" variant="default" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>전략</Text>
          <Text style={styles.value}>미설정</Text>
        </View>
      </Card>

      <Card title="시그널 색상 가이드">
        <View style={styles.row}>
          <Badge label="BUY" variant="buy" />
          <Text style={styles.hint}>매수 시그널</Text>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Badge label="SELL" variant="sell" />
          <Text style={styles.hint}>매도 시그널</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 14,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
});
