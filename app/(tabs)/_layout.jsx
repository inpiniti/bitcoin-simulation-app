import { Tabs } from 'expo-router';
import { Activity, MessageCircle, Brain, Settings } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accentBlue,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.bgSecondary,
          borderTopColor: Colors.borderColor,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.bgPrimary,
          borderBottomColor: Colors.borderColor,
          borderBottomWidth: 1,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 16,
        },
      }}
    >
      <Tabs.Screen
        name="server"
        options={{
          title: '서버상태',
          tabBarIcon: ({ color, size }) => (
            <Activity color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI 질문',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="deeplearning"
        options={{
          title: '딥러닝스튜디오',
          tabBarIcon: ({ color, size }) => (
            <Brain color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="trading"
        options={{
          title: '자동매매설정',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
