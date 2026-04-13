import { useEffect, useRef } from 'react';
import { useRouter, Redirect } from 'expo-router';
import {
  Animated,
  Easing,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { tdsColors, tdsDark } from '../constants/tdsColors';
import useStore from '../store/useStore';

export default function IntroScreen() {
  const authMode = useStore((s) => s.authMode);
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 1050);

    return () => clearTimeout(timer);
  }, [opacity, router]);

  if (authMode === 'guest' || authMode === 'logged-in') {
    return <Redirect href="/(tabs)/account" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View style={{ opacity }}>
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>AT</Text>
            </View>
          </View>
          <Text style={styles.appName}>어시스트 트레이딩</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: -30,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: tdsColors.blue500,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  logoText: {
    color: tdsColors.white,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appName: {
    textAlign: 'center',
    color: tdsDark.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
});
