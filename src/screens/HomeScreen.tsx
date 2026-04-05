import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getTotalSpendingPaise } from '../db/client';
import { formatInrFromPaise } from '../utils/inr';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [totalPaise, setTotalPaise] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTotal = useCallback(() => {
    getTotalSpendingPaise().then(setTotalPaise);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTotal();
    }, [loadTotal])
  );

  async function openCamera() {
    setBusy(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera access',
          'Please allow camera access in Settings to capture receipts.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.75,
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      navigation
        .getParent<NativeStackNavigationProp<RootStackParamList>>()
        ?.navigate('SaveBill', { imageUri: uri });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Pressable
          style={({ pressed }) => [styles.cameraBtn, pressed && styles.cameraBtnPressed]}
          onPress={openCamera}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <MaterialCommunityIcons name="camera" size={40} color="#fff" />
              <Text style={styles.cameraLabel}>Capture receipt</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    justifyContent: 'center',
  },
  hero: { marginBottom: 40, alignItems: 'center' },
  kicker: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  total: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  hint: { marginTop: 12, fontSize: 15, color: colors.textMuted },
  cameraBtn: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cameraBtnPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  cameraLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
