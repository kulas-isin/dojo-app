import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/theme';

export default function RootLayout() {
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
        <Stack.Screen name="stray/[id]" options={{ title: '浪浪檔案' }} />
        <Stack.Screen name="stray/post" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen
          name="stray/create"
          options={{ title: '建立浪浪檔案', presentation: 'modal' }}
        />
        <Stack.Screen
          name="stray/add-post"
          options={{ title: '新增紀錄', presentation: 'modal' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
