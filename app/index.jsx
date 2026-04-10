import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../components/tds/Button';
import { tdsColors, tdsDark } from '../constants/tdsColors';
import { clearKisAuth, loginKis } from '../lib/kisApi';
import useStore from '../store/useStore';

function AppLogo() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>AT</Text>
      </View>
    </View>
  );
}

export default function Index() {
  const { authMode, startGuestSession, startLoginSession } = useStore();
  const [phase, setPhase] = useState('brand');
  const [accountNo, setAccountNo] = useState('');
  const [appkey, setAppkey] = useState('');
  const [appsecret, setAppsecret] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const brandOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.timing(brandOpacity, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      setPhase('login');
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 850);

    return () => clearTimeout(timer);
  }, [brandOpacity, formOpacity, formTranslateY]);

  if (authMode === 'guest' || authMode === 'logged-in') {
    return <Redirect href="/(tabs)/account" />;
  }

  const handleGuest = () => {
    clearKisAuth();
    startGuestSession();
  };

  const handleLogin = async () => {
    setError(null);
    if (!accountNo.trim() || !appkey.trim() || !appsecret.trim()) {
      setError('계좌, AppKey, 시크릿키를 모두 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await loginKis({
        accountNo: accountNo.trim(),
        appkey: appkey.trim(),
        appsecret: appsecret.trim(),
      });
      startLoginSession({ accountNo: accountNo.trim() });
    } catch (e) {
      setError(e.message || '로그인에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safe}
      >
        <View style={styles.container}>
          <Animated.View style={{ opacity: brandOpacity }}>
            <AppLogo />
            <Text style={styles.appName}>어시스트 트레이딩</Text>
          </Animated.View>

          {phase === 'login' && (
            <Animated.View
              style={{
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              }}
            >
              <View style={styles.card}>
                <Text style={styles.cardTitle}>로그인</Text>

                <Text style={styles.fieldLabel}>계좌</Text>
                <TextInput
                  style={styles.input}
                  value={accountNo}
                  onChangeText={setAccountNo}
                  autoCapitalize="none"
                  placeholder="계좌번호 입력"
                  placeholderTextColor={tdsDark.textTertiary}
                />

                <Text style={styles.fieldLabel}>AppKey</Text>
                <TextInput
                  style={styles.input}
                  value={appkey}
                  onChangeText={setAppkey}
                  autoCapitalize="none"
                  placeholder="AppKey 입력"
                  placeholderTextColor={tdsDark.textTertiary}
                />

                <Text style={styles.fieldLabel}>시크릿키</Text>
                <TextInput
                  style={styles.input}
                  value={appsecret}
                  onChangeText={setAppsecret}
                  autoCapitalize="none"
                  secureTextEntry
                  placeholder="시크릿키 입력"
                  placeholderTextColor={tdsDark.textTertiary}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.actionRow}>
                  <Button
                    onPress={handleGuest}
                    variant="weak"
                    color="dark"
                    style={styles.actionBtn}
                  >
                    비로그인
                  </Button>
                  <Button
                    onPress={handleLogin}
                    color="primary"
                    loading={loading}
                    style={styles.actionBtn}
                  >
                    로그인
                  </Button>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tdsDark.bgPrimary },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
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
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appName: {
    textAlign: 'center',
    color: tdsDark.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  card: {
    backgroundColor: tdsDark.bgCard,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: {
    color: tdsDark.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: tdsDark.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: tdsDark.bgSecondary,
    borderWidth: 1,
    borderColor: tdsDark.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: tdsDark.textPrimary,
  },
  errorText: {
    color: tdsColors.red600,
    marginTop: 10,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: { flex: 1 },
});
