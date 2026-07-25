import { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';

// Never shown: the trigger is `disabled`, so tapping the Log tab emits
// tabPress without switching tabs, and we open the log modal instead.
export default function LogTab() {
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    return navigation.addListener('tabPress' as never, () => {
      router.push('/log/capture');
    });
  }, [navigation, router]);

  return <View />;
}
