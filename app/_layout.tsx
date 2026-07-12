import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/auth/authStore';
import { useStore } from '@/store/useStore';
import { colors } from '@/theme';

export default function RootLayout() {
  const userId = useAuthStore((s) => s.session?.user.id);

  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  // 啟動與登入狀態改變時，從雲端同步社群資料
  useEffect(() => {
    useStore.getState().syncSocial();
  }, [userId]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="gym/[id]" options={{ title: '道館' }} />
        <Stack.Screen
          name="gym/create"
          options={{ title: '建立道館', presentation: 'modal' }}
        />
        <Stack.Screen
          name="gym/challenge"
          options={{ title: '發起挑戰', presentation: 'modal' }}
        />
        <Stack.Screen name="pet/[id]" options={{ title: '寵物檔案' }} />
        <Stack.Screen name="pet/post" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen name="pet/comments" options={{ title: '留言', presentation: 'modal' }} />
        <Stack.Screen
          name="pet/create"
          options={{ title: '建立檔案', presentation: 'modal' }}
        />
        <Stack.Screen
          name="pet/add-post"
          options={{ title: '新增紀錄', presentation: 'modal' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
