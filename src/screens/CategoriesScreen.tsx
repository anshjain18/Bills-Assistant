import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  getCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
} from '../db/client';
import type { Category } from '../types';
import { colors } from '../theme/colors';

export function CategoriesScreen() {
  const [items, setItems] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);

  const load = useCallback(async () => {
    const rows = await getCategories();
    setItems(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openAdd() {
    setEditId(null);
    setNameInput('');
    setMakeDefault(false);
    setModalOpen(true);
  }

  function openEdit(c: Category) {
    setEditId(c.id);
    setNameInput(c.name);
    setMakeDefault(c.is_default === 1);
    setModalOpen(true);
  }

  async function saveModal() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a category name.');
      return;
    }
    try {
      if (editId == null) {
        await insertCategory(trimmed, { makeDefault });
      } else {
        await updateCategory(editId, trimmed, { makeDefault });
      }
      setModalOpen(false);
      await load();
    } catch {
      Alert.alert('Could not save', 'That name may already exist.');
    }
  }

  function confirmDelete(c: Category) {
    Alert.alert('Delete category', `Remove “${c.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteCategory(c.id);
          if (!result.ok) {
            Alert.alert(
              'Cannot delete',
              'Move or delete bills in this category first.'
            );
            return;
          }
          await load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          <Text style={styles.addBtnText}>New category</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No categories yet</Text>
          <Text style={styles.emptySub}>
            Add categories like Groceries, Fuel, or Dining so you can tag receipts after you capture them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowTitleWrap}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                {item.is_default === 1 ? (
                  <Text style={styles.defaultBadge}>Default</Text>
                ) : null}
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  hitSlop={8}
                  onPress={() => openEdit(item)}
                  style={styles.iconBtn}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.accent} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => confirmDelete(item)}
                  style={styles.iconBtn}
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editId == null ? 'New category' : 'Edit category'}
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. Groceries"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={saveModal}
            />
            <View style={styles.switchRow}>
              <View style={styles.switchLabelWrap}>
                <Text style={styles.switchLabel}>Default for new receipts</Text>
                <Text style={styles.switchHint}>
                  Preselected when you capture a receipt. Only one category can be default.
                </Text>
              </View>
              <Switch
                value={makeDefault}
                onValueChange={setMakeDefault}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={makeDefault ? colors.accent : '#f4f3f4'}
              />
            </View>
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveModal} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  toolbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTitleWrap: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  defaultBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 4 },
  empty: { paddingHorizontal: 32, paddingTop: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  emptySub: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
    paddingVertical: 4,
  },
  switchLabelWrap: { flex: 1, marginRight: 8 },
  switchLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  switchHint: { marginTop: 4, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
    marginBottom: 20,
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  secondaryBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  secondaryBtnText: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  primaryBtnText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
