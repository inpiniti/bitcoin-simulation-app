import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Activity } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/colors';

export default function ServerScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Activity color={Colors.accentBlue} size={24} />
        <Text style={styles.headerTitle}>서버 상태</Text>
      </View>

      <Card title="API 서버">
        <View style={styles.row}>
          <Text style={styles.label}>상태</Text>
          <Badge label="연결 대기" variant="default" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>URL</Text>
          <Text style={styles.value}>http://localhost:8000</Text>
        </View>
      </Card>

      <Card title="Supabase">
        <View style={styles.row}>
          <Text style={styles.label}>상태</Text>
          <Badge label="미설정" variant="default" />
        </View>
      </Card>

      <Text style={styles.hint}>
        .env 파일에 EXPO_PUBLIC_SUPABASE_URL을 설정하세요
      </Text>
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
    fontFamily: 'monospace',
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
