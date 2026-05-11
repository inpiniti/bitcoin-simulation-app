import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../components/tds/Button';
import { tdsColors, tdsDark } from '../constants/tdsColors';
import { clearKisAuth, loginKis } from '../lib/kisApi';
import { ensureWebSocketKey, saveKisCredentials } from '../lib/realtimeApi';
import useStore from '../store/useStore';

const KIS_CREDENTIALS_KEY = 'kis.credentials.v1';

export default function LoginScreen() {
  const { authMode, startGuestSession, startLoginSession } = useStore();
  const [accountNo, setAccountNo] = useState('');
  const [appkey, setAppkey] = useState('');
  const [appsecret, setAppsecret] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSavedCredentials = async () => {
      try {
        const savedRaw = await AsyncStorage.getItem(KIS_CREDENTIALS_KEY);
        if (!savedRaw || !mounted) return;

        const saved = JSON.parse(savedRaw);
        setAccountNo(saved?.accountNo || '');
        setAppkey(saved?.appkey || '');
        setAppsecret(saved?.appsecret || '');
      } catch (_e) {
        // 저장 데이터가 깨졌으면 무시하고 수동 입력으로 진행합니다.
      }
    };

    loadSavedCredentials();
    return () => {
      mounted = false;
    };
  }, []);

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

      await AsyncStorage.setItem(
        KIS_CREDENTIALS_KEY,
        JSON.stringify({
          accountNo: accountNo.trim(),
          appkey: appkey.trim(),
          appsecret: appsecret.trim(),
        }),
      );

      // WebSocket 키 자동 발급 (로그인 후 실행)
      const wsKeyResult = await ensureWebSocketKey(appkey.trim(), appsecret.trim());
      if (!wsKeyResult.success) {
        Alert.alert(
          '⚠️ WebSocket 키 발급',
          `키 발급에 실패했습니다.\n\n오류: ${wsKeyResult.error?.message || '알 수 없는 오류'}\n\n(실시간 매매 사용 시에만 필요합니다)`,
          [{ text: '확인', onPress: () => {} }]
        );
      }

      // KIS 자격증명을 Supabase에 저장 (서버 자동매매용)
      const credResult = await saveKisCredentials({
        accountNo: accountNo.trim(),
        appkey: appkey.trim(),
        appsecret: appsecret.trim(),
      });
      if (credResult.error) {
        Alert.alert(
          '⚠️ 자격증명 저장',
          `Supabase 저장 실패: ${credResult.error.message || '알 수 없는 오류'}\n\n(서버 자동매매가 동작하지 않을 수 있습니다)`
        );
      }

      startLoginSession({ accountNo: accountNo.trim() });
    } catch (e) {
      setError(e.message || '로그인에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safe}
        >
          <View style={styles.container}>
            <Text style={styles.title}>로그인</Text>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>계좌</Text>
              <TextInput
                style={styles.input}
                value={accountNo}
                onChangeText={setAccountNo}
                autoCapitalize="none"
                placeholder="계좌번호 입력 (12345678-01 또는 1234567801)"
                placeholderTextColor={tdsDark.textTertiary}
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>AppKey</Text>
              <TextInput
                style={styles.input}
                value={appkey}
                onChangeText={setAppkey}
                autoCapitalize="none"
                placeholder="AppKey 입력"
                placeholderTextColor={tdsDark.textTertiary}
                returnKeyType="next"
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
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
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
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
  title: {
    color: tdsDark.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 18,
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
