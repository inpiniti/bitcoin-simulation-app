import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initLogoCache } from '../lib/logoCache';

export default function RootLayout() {
  useEffect(() => { initLogoCache(); }, []);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#f7f9fc" />
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
