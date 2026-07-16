import { Tabs } from 'expo-router';
import { Compass, Home, Map, PawPrint, Trophy } from 'lucide-react-native';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '地圖',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Map size={focused ? 26 : 23} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: '探索',
          tabBarIcon: ({ color, focused }) => (
            <Compass size={focused ? 26 : 23} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="space"
        options={{
          title: '空間',
          tabBarIcon: ({ color, focused }) => (
            <Home size={focused ? 26 : 23} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: '人氣賽',
          tabBarIcon: ({ color, focused }) => (
            <Trophy size={focused ? 26 : 23} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, focused }) => (
            <PawPrint size={focused ? 26 : 23} color={color} strokeWidth={2.2} />
          ),
        }}
      />
    </Tabs>
  );
}
