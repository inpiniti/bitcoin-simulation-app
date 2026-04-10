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
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          borderRadius: 26,
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 10,
          height: 74,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#0f172a',
          shadowOpacity: 0.1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
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
