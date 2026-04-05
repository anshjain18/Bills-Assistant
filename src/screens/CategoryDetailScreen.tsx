import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  getBillsByCategory,
  deleteBill,
  getCategories,
  updateBillCategory,
} from '../db/client';
import type { Category } from '../types';
import { formatInrFromPaise } from '../utils/inr';
import type { Bill } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { formatRangeShort } from '../utils/dateRange';
import { exportCategoryBillsZip } from '../utils/exportCategoryZip';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryDetail'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function CategoryDetailScreen({ route, navigation }: Props) {
  const { categoryId, categoryName, dateRangeStartIso, dateRangeEndIso } = route.params;
  const billRange = useMemo(() => {
    if (dateRangeStartIso && dateRangeEndIso) {
      return { startIso: dateRangeStartIso, endIso: dateRangeEndIso };
    }
    return undefined;
  }, [dateRangeStartIso, dateRangeEndIso]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [recatBill, setRecatBill] = useState<Bill | null>(null);
  const [recatCategories, setRecatCategories] = useState<Category[]>([]);
  const [recatTargetId, setRecatTargetId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const longPressHandled = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getBillsByCategory(categoryId, billRange);
      setBills(rows);
    } finally {
      setLoading(false);
    }
  }, [categoryId, billRange]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const runExportZip = useCallback(async () => {
    if (bills.length === 0) {
      Alert.alert('Nothing to export', 'There are no bills in this view.');
      return;
    }
    setExporting(true);
    try {
      await exportCategoryBillsZip({
        categoryName,
        bills,
        dateFilterLabel: formatRangeShort(billRange ?? null),
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'EMPTY'
          ? 'No bills to export.'
          : e instanceof Error && e.message.startsWith('MISSING_FILE')
            ? 'A receipt file is missing from storage.'
            : e instanceof Error && e.message === 'NO_SHARE'
              ? 'Sharing is not available on this device.'
              : 'Could not create the zip file.';
      Alert.alert('Export failed', msg);
    } finally {
      setExporting(false);
    }
  }, [bills, categoryName, billRange]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={runExportZip}
          disabled={exporting || bills.length === 0}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Export bills as zip"
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <MaterialCommunityIcons
              name="folder-zip-outline"
              size={24}
              color={bills.length === 0 ? colors.textMuted : colors.accent}
            />
          )}
        </Pressable>
      ),
    });
  }, [navigation, runExportZip, exporting, bills.length]);

  const openRecategorize = useCallback(async (b: Bill) => {
    const rows = await getCategories();
    setRecatCategories(rows);
    setRecatTargetId(b.category_id);
    setRecatBill(b);
  }, []);

  async function applyRecategorize() {
    if (recatBill == null || recatTargetId == null) return;
    if (recatTargetId === recatBill.category_id) {
      setRecatBill(null);
      return;
    }
    try {
      await updateBillCategory(recatBill.id, recatTargetId);
      setRecatBill(null);
      await load();
    } catch (e) {
      console.warn(e);
      Alert.alert('Could not update', 'Please try again.');
    }
  }

  function confirmDelete(b: Bill) {
    Alert.alert('Delete bill', 'Remove this receipt from your records?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(b.image_uri, { idempotent: true });
          } catch {
            /* file may already be gone */
          }
          await deleteBill(b.id);
          setViewerUri((u) => (u === b.image_uri ? null : u));
          await load();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (bills.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {billRange ? (
          <View style={styles.rangeBanner}>
            <Text style={styles.rangeBannerText}>{formatRangeShort(billRange)}</Text>
          </View>
        ) : null}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {billRange ? 'No bills in this category for the selected period.' : 'No bills in this category yet.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={bills}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          billRange ? (
            <View style={[styles.rangeBanner, styles.rangeBannerList]}>
              <Text style={styles.rangeBannerText}>{formatRangeShort(billRange)}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              onPress={() => {
                if (longPressHandled.current) {
                  longPressHandled.current = false;
                  return;
                }
                setViewerUri(item.image_uri);
              }}
              onLongPress={() => {
                longPressHandled.current = true;
                openRecategorize(item);
              }}
              delayLongPress={250}
              style={styles.rowMain}
              accessibilityRole="button"
              accessibilityLabel="View receipt image. Long press to change category."
            >
              <Image source={{ uri: item.image_uri }} style={styles.thumb} />
              <View style={styles.rowBody}>
                <Text style={styles.amount}>{formatInrFromPaise(item.amount_paise)}</Text>
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                {/* <Text style={styles.tapHint}>Tap to view · Long press to move</Text> */}
              </View>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => confirmDelete(item)} style={styles.trash}>
              <MaterialCommunityIcons name="delete-outline" size={24} color={colors.danger} />
            </Pressable>
          </View>
        )}
      />

      <Modal
        visible={viewerUri != null}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerUri(null)}
        presentationStyle="overFullScreen"
      >
        <StatusBar style="light" />
        <View style={styles.viewerRoot}>
          <Pressable
            style={styles.viewerTap}
            onPress={() => setViewerUri(null)}
            accessibilityRole="button"
            accessibilityLabel="Close receipt"
          >
            {viewerUri ? (
              <View pointerEvents="none">
                <Image
                  source={{ uri: viewerUri }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </Pressable>
          <SafeAreaView style={styles.viewerChrome} edges={['top']} pointerEvents="box-none">
            <Pressable
              style={styles.closeBtn}
              onPress={() => setViewerUri(null)}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={recatBill != null}
        animationType="slide"
        transparent
        onRequestClose={() => setRecatBill(null)}
      >
        <View style={styles.recatBackdrop}>
          <View style={styles.recatSheet}>
            <Text style={styles.recatTitle}>Move receipt</Text>
            <Text style={styles.recatSub}>Choose a category for this receipt.</Text>
            <View style={styles.recatChips}>
              {recatCategories.map((c) => {
                const sel = c.id === recatTargetId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setRecatTargetId(c.id)}
                    style={[styles.recatChip, sel && styles.recatChipSel]}
                  >
                    <Text style={[styles.recatChipText, sel && styles.recatChipTextSel]}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.recatActions}>
              <Pressable onPress={() => setRecatBill(null)} style={styles.recatCancel}>
                <Text style={styles.recatCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={applyRecategorize} style={styles.recatApply}>
                <Text style={styles.recatApplyText}>Move</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6, marginRight: 4 },
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    paddingRight: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#E4E4E7' },
  rowBody: { flex: 1 },
  amount: { fontSize: 17, fontWeight: '700', color: colors.text },
  date: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  tapHint: { marginTop: 6, fontSize: 12, color: colors.accent, fontWeight: '500' },
  trash: { padding: 8 },
  rangeBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeBannerList: { marginBottom: 8 },
  rangeBannerText: { fontSize: 13, fontWeight: '600', color: colors.accent, textAlign: 'center' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  viewerRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerTap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_W,
    height: Math.round(SCREEN_H * 0.82),
  },
  viewerChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    zIndex: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  recatBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  recatSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  recatTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  recatSub: { marginTop: 6, fontSize: 14, color: colors.textMuted, marginBottom: 16 },
  recatChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  recatChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  recatChipSel: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  recatChipText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  recatChipTextSel: { color: colors.accent, fontWeight: '700' },
  recatActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  recatCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  recatCancelText: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  recatApply: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  recatApplyText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});
