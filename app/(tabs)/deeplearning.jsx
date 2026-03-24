import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Brain } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/colors';

export default function DeepLearningScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Brain color={Colors.accentBlue} size={24} />
        <Text style={styles.headerTitle}>딥러닝 스튜디오</Text>
      </View>

      <Card title="모델 현황">
        <Text style={styles.placeholder}>
          딥러닝 모델 관리 기능은 추후 구현 예정입니다.
        </Text>
        <Text style={styles.hint}>
          모델 학습, 예측 결과, 성능 지표(F1/AUC/Precision/Recall)를 확인할 수 있습니다.
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
