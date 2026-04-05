import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useHeaderHeight } from '@react-navigation/elements';
import * as FileSystem from 'expo-file-system/legacy';
import { compressReceiptForStorage } from '../utils/receiptImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCategories, insertBill } from '../db/client';
import { formatInrFromPaise, parseInrInputToPaise } from '../utils/inr';
import type { Category } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'SaveBill'>;

export function SaveBillScreen({ route, navigation }: Props) {
  const { imageUri } = route.params;
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef<ScrollView>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [amountText, setAmountText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const rows = await getCategories();
    setCategories(rows);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (categories.length === 0) return;
    setSelectedId((prev) => {
      if (prev != null) return prev;
      const def = categories.find((c) => c.is_default === 1);
      return def?.id ?? categories[0].id;
    });
  }, [categories]);

  const paise = parseInrInputToPaise(amountText);
  const canSave =
    selectedId != null && paise != null && paise > 0 && !saving;

  async function onSave() {
    if (selectedId == null || paise == null || paise <= 0) return;
    setSaving(true);
    try {
      const base = FileSystem.documentDirectory;
      if (!base) {
        Alert.alert('Storage unavailable', 'Cannot save files in this environment.');
        return;
      }
      const { uri: compressedUri, ext } = await compressReceiptForStorage(imageUri);
      const dest = `${base}receipt_${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: compressedUri, to: dest });
      await insertBill(selectedId, paise, dest);
      navigation.goBack();
    } catch (e) {
      console.warn(e);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function scrollAmountIntoView() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }

  const preview = paise != null ? formatInrFromPaise(paise) : '—';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          </View>

          {categories.length === 0 ? (
            <View style={styles.warn}>
              <Text style={styles.warnText}>
                Add at least one category in the Categories tab before saving.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Category</Text>
              <View style={styles.chips}>
                {categories.map((c) => {
                  const selected = c.id === selectedId;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setSelectedId(c.id)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.label}>Amount (INR)</Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
            onFocus={scrollAmountIntoView}
          />
          <Text style={styles.previewAmount}>Preview: {preview}</Text>

          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={onSave}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save bill</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scrollView: { flex: 1 },
  scroll: {
    padding: 16,
    paddingBottom: 48,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  preview: { width: '100%', height: 180, backgroundColor: '#E4E4E7' },
  warn: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    marginBottom: 16,
  },
  warnText: { color: '#92400E', fontSize: 15, lineHeight: 22 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  chipTextSelected: { color: colors.accent, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  previewAmount: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
