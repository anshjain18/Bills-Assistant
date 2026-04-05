import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSpendingByCategory,
  getSpendingByCategoryInRange,
  getTotalSpendingPaise,
  getTotalSpendingPaiseInRange,
} from '../db/client';
import { formatInrFromPaise } from '../utils/inr';
import type { CategorySpendingRow } from '../types';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import {
  type DateRange,
  endOfDayLocal,
  formatRangeShort,
  lastNDaysInclusive,
  startOfDayLocal,
} from '../utils/dateRange';

type Preset = 'all' | '7d' | '30d' | 'custom';

function getRangeForPreset(preset: Preset, customRange: DateRange): DateRange | null {
  if (preset === 'all') return null;
  if (preset === '7d') return lastNDaysInclusive(7);
  if (preset === '30d') return lastNDaysInclusive(30);
  return customRange;
}

export function SpendingScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [totalPaise, setTotalPaise] = useState<number | null>(null);
  const [rows, setRows] = useState<CategorySpendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('30d');
  const [customRange, setCustomRange] = useState<DateRange>(() => lastNDaysInclusive(7));
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [draftStart, setDraftStart] = useState(() => startOfDayLocal(new Date()));
  const [draftEnd, setDraftEnd] = useState(() => endOfDayLocal(new Date()));
  const [iosPicker, setIosPicker] = useState<'start' | 'end' | null>(null);
  const [androidPicker, setAndroidPicker] = useState<'start' | 'end' | null>(null);

  const activeRange = getRangeForPreset(preset, customRange);

  const openCustomModal = useCallback(() => {
    const r =
      preset === 'custom'
        ? customRange
        : preset === 'all'
          ? lastNDaysInclusive(30)
          : getRangeForPreset(preset, customRange)!;
    setDraftStart(new Date(r.startIso));
    setDraftEnd(new Date(r.endIso));
    setIosPicker(null);
    setAndroidPicker(null);
    setCustomModalVisible(true);
  }, [preset, customRange]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = getRangeForPreset(preset, customRange);
      if (r == null) {
        const [t, rowData] = await Promise.all([
          getTotalSpendingPaise(),
          getSpendingByCategory(),
        ]);
        setTotalPaise(t);
        setRows(rowData);
      } else {
        const [t, rowData] = await Promise.all([
          getTotalSpendingPaiseInRange(r.startIso, r.endIso),
          getSpendingByCategoryInRange(r.startIso, r.endIso),
        ]);
        setTotalPaise(t);
        setRows(rowData);
      }
    } finally {
      setLoading(false);
    }
  }, [preset, customRange]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function applyCustomRange() {
    const s = startOfDayLocal(draftStart);
    const e = endOfDayLocal(draftEnd);
    if (s.getTime() > e.getTime()) {
      Alert.alert('Invalid range', 'End date must be on or after the start date.');
      return;
    }
    setCustomRange({ startIso: s.toISOString(), endIso: e.toISOString() });
    setPreset('custom');
    setCustomModalVisible(false);
  }

  function openCategoryDetail(item: CategorySpendingRow) {
    const nav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    const r = activeRange;
    nav?.navigate('CategoryDetail', {
      categoryId: item.category_id,
      categoryName: item.name,
      ...(r ? { dateRangeStartIso: r.startIso, dateRangeEndIso: r.endIso } : {}),
    });
  }

  if (loading && totalPaise === null) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  const hasAnyBills = (totalPaise ?? 0) > 0;
  const rangeLabel = formatRangeShort(activeRange);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable
            style={[styles.filterChip, preset === 'all' && styles.filterChipOn]}
            onPress={() => setPreset('all')}
          >
            <Text style={[styles.filterChipText, preset === 'all' && styles.filterChipTextOn]}>All time</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, preset === '7d' && styles.filterChipOn]}
            onPress={() => setPreset('7d')}
          >
            <Text style={[styles.filterChipText, preset === '7d' && styles.filterChipTextOn]}>Last 7 days</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, preset === '30d' && styles.filterChipOn]}
            onPress={() => setPreset('30d')}
          >
            <Text style={[styles.filterChipText, preset === '30d' && styles.filterChipTextOn]}>Last 30 days</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, preset === 'custom' && styles.filterChipOn]}
            onPress={openCustomModal}
          >
            <Text style={[styles.filterChipText, preset === 'custom' && styles.filterChipTextOn]}>
              Custom…
            </Text>
          </Pressable>
        </ScrollView>
        <Text style={styles.rangeHint} numberOfLines={2}>
          {rangeLabel}
        </Text>
      </View>

      <View style={styles.headerCard}>
        <Text style={styles.headerLabel}>Total ({rangeLabel})</Text>
        <Text style={styles.headerTotal}>
          {totalPaise === null ? '—' : formatInrFromPaise(totalPaise)}
        </Text>
      </View>

      {!hasAnyBills ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No spending in this period</Text>
          <Text style={styles.emptySub}>
            {activeRange
              ? 'Try another date range or capture a receipt from Home.'
              : 'Capture a receipt from the Home tab to see totals here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.category_id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptySub}>Add categories, then capture receipts from Home.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => openCategoryDetail(item)}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.bill_count} {item.bill_count === 1 ? 'bill' : 'bills'}
                </Text>
              </View>
              <Text style={styles.rowAmount}>{formatInrFromPaise(item.total_paise)}</Text>
            </Pressable>
          )}
        />
      )}

      <Modal visible={customModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.customSheet}>
            <Text style={styles.customTitle}>Custom date range</Text>
            <Text style={styles.customSub}>Choose start and end dates (your local timezone).</Text>

            <Pressable
              style={styles.dateRow}
              onPress={() => {
                if (Platform.OS === 'android') setAndroidPicker('start');
                else setIosPicker((p) => (p === 'start' ? null : 'start'));
              }}
            >
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>{draftStart.toLocaleDateString()}</Text>
            </Pressable>
            {Platform.OS === 'ios' && iosPicker === 'start' ? (
              <DateTimePicker
                value={draftStart}
                mode="date"
                display="spinner"
                themeVariant="light"
                onChange={(_, date) => {
                  if (date) setDraftStart(startOfDayLocal(date));
                }}
              />
            ) : null}

            <Pressable
              style={styles.dateRow}
              onPress={() => {
                if (Platform.OS === 'android') setAndroidPicker('end');
                else setIosPicker((p) => (p === 'end' ? null : 'end'));
              }}
            >
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateValue}>{draftEnd.toLocaleDateString()}</Text>
            </Pressable>
            {Platform.OS === 'ios' && iosPicker === 'end' ? (
              <DateTimePicker
                value={draftEnd}
                mode="date"
                display="spinner"
                themeVariant="light"
                onChange={(_, date) => {
                  if (date) setDraftEnd(endOfDayLocal(date));
                }}
              />
            ) : null}

            {Platform.OS === 'android' && androidPicker ? (
              <DateTimePicker
                value={androidPicker === 'start' ? draftStart : draftEnd}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  const which = androidPicker;
                  setAndroidPicker(null);
                  if (event.type === 'dismissed' || !date || !which) return;
                  if (which === 'start') setDraftStart(startOfDayLocal(date));
                  else setDraftEnd(endOfDayLocal(date));
                }}
              />
            ) : null}

            <View style={styles.customActions}>
              <Pressable
                onPress={() => {
                  setCustomModalVisible(false);
                  setIosPicker(null);
                }}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  applyCustomRange();
                  setIosPicker(null);
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Apply</Text>
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
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  filterBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  filterChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  filterChipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  filterChipTextOn: { color: colors.accent },
  rangeHint: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  headerTotal: { marginTop: 6, fontSize: 28, fontWeight: '700', color: colors.text },
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
  rowPressed: { opacity: 0.9 },
  rowText: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  rowMeta: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  rowAmount: { fontSize: 17, fontWeight: '700', color: colors.accent },
  empty: { paddingHorizontal: 32, paddingTop: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  emptySub: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  customSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  customTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  customSub: { marginTop: 6, fontSize: 14, color: colors.textMuted, marginBottom: 16 },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dateLabel: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  dateValue: { fontSize: 16, fontWeight: '600', color: colors.accent },
  customActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  secondaryBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  secondaryBtnText: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  primaryBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});
