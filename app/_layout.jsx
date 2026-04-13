import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#1e1e1e" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="train" options={{ headerShown: false }} />
        <Stack.Screen name="predict" options={{ headerShown: false }} />
        <Stack.Screen name="schedule-detail" options={{ headerShown: false }} />
        <Stack.Screen name="schedule-form" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
