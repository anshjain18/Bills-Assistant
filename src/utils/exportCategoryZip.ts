import JSZip from 'jszip';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import type { Bill } from '../types';
import { formatInrFromPaise } from './inr';

function safeFolderName(name: string): string {
  const s = name.replace(/[/\\:*?"<>|]/g, '_').trim().slice(0, 80);
  return s.length > 0 ? s : 'category';
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** e.g. receipt_12.webp from stored path */
function imageFileNameForBill(b: Bill): string {
  const leaf = b.image_uri.split('/').pop() ?? '';
  if (leaf.includes('receipt_') && leaf.includes('.')) return leaf;
  const ext = leaf.split('.').pop() ?? 'jpg';
  return `receipt_${b.id}.${ext}`;
}

/**
 * Builds a zip of receipt images plus CSV metadata for the given bills (already filtered).
 */
export async function exportCategoryBillsZip(params: {
  categoryName: string;
  bills: Bill[];
  /** Shown in export_info.txt (e.g. from formatRangeShort). */
  dateFilterLabel: string;
}): Promise<void> {
  const { categoryName, bills, dateFilterLabel } = params;
  if (bills.length === 0) {
    throw new Error('EMPTY');
  }

  const base = FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('NO_CACHE');
  }

  const zip = new JSZip();
  const folderName = safeFolderName(categoryName);
  const root = zip.folder(folderName) ?? zip;

  for (const bill of bills) {
    const info = await FileSystem.getInfoAsync(bill.image_uri);
    if (!info.exists) {
      throw new Error(`MISSING_FILE:${bill.id}`);
    }
    const base64 = await FileSystem.readAsStringAsync(bill.image_uri, {
      encoding: 'base64',
    });
    root.file(imageFileNameForBill(bill), base64, { base64: true });
  }

  const zipBase64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const outName = `${folderName}_${Date.now()}.zip`;
  const outPath = `${base}${outName}`;

  await FileSystem.writeAsStringAsync(outPath, zipBase64, {
    encoding: 'base64',
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('NO_SHARE');
  }

  await Sharing.shareAsync(outPath, {
    mimeType: 'application/zip',
    UTI: 'public.zip-archive',
    dialogTitle: `Export ${folderName}`,
  });
}
