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
          height: 74,
          paddingBottom: 18,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingTop: 0,
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
              name="wallet"
              color={focused ? tdsColors.blue700 : tdsColors.grey400}
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
              name="hardware-chip"
              color={focused ? tdsColors.blue700 : tdsColors.grey400}
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
              name="time"
              color={focused ? tdsColors.blue700 : tdsColors.grey400}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: '뉴스',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="newspaper"
              color={focused ? tdsColors.blue700 : tdsColors.grey400}
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
              name="bar-chart"
              color={focused ? tdsColors.blue700 : tdsColors.grey400}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
