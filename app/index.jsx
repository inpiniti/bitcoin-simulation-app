import useStore from '../store/useStore';
import { Redirect } from 'expo-router';

export default function Index() {
  const authMode = useStore((s) => s.authMode);
  if (authMode === 'guest' || authMode === 'logged-in') {
    return <Redirect href="/(tabs)/account" />;
  }
  return <Redirect href="/intro" />;
}
