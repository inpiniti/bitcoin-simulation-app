import { Tabs } from 'expo-router';
import { Wallet, Brain, Clock, BarChart2 } from 'lucide-react-native';
import { tdsDark, tdsColors } from '../../constants/tdsColors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tdsColors.blue500,
        tabBarInactiveTintColor: tdsDark.textSecondary,
        tabBarStyle: {
          backgroundColor: tdsDark.bgCard,
          borderTopColor: tdsDark.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: tdsDark.bgCard,
          borderBottomColor: tdsDark.border,
          borderBottomWidth: 1,
        },
        headerTintColor: tdsDark.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="account"
        options={{
          title: '계좌',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="model"
        options={{
          title: '모델',
          tabBarIcon: ({ color, size }) => <Brain color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '예약',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ticker"
        options={{
          title: '티커',
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
