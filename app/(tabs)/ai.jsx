import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/colors';

export default function AiScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <MessageCircle color={Colors.accentBlue} size={24} />
        <Text style={styles.headerTitle}>AI 질문</Text>
      </View>

      <Card title="AI 분석">
        <Text style={styles.placeholder}>
          AI 질문 기능은 추후 구현 예정입니다.
        </Text>
        <Text style={styles.hint}>
          bitcoin-ai-backend 서버와 연동하여 시장 분석 질문을 할 수 있습니다.
        </Text>
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
  placeholder: {
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 8,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
});
