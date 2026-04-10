import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tdsDark, tdsColors } from '../../constants/tdsColors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tdsColors.blue700,
        tabBarInactiveTintColor: tdsDark.textSecondary,
        tabBarStyle: {
          backgroundColor: tdsDark.bgCard,
          borderTopColor: tdsDark.border,
          borderTopWidth: 1,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          height: 80,
          paddingBottom: 14,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        headerShown: false,
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
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              color={focused ? tdsColors.blue700 : tdsColors.grey500}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="model"
        options={{
          title: '모델',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'hardware-chip' : 'hardware-chip-outline'}
              color={focused ? tdsColors.blue700 : tdsColors.grey500}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '예약',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={focused ? tdsColors.blue700 : tdsColors.grey500}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ticker"
        options={{
          title: '티커',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              color={focused ? tdsColors.blue700 : tdsColors.grey500}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
