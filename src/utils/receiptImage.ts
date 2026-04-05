import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/** Max width (px); height scales. Large enough for crisp text on receipts. */
const RECEIPT_MAX_WIDTH = 1200;

/**
 * JPEG quality 0–1. ~0.82 keeps print and amounts clearly readable while
 * staying far below full camera resolution file sizes.
 */
const JPEG_QUALITY = 0.15;

export type CompressedReceipt = {
  uri: string;
  ext: 'jpg';
};

/**
 * Downscales very large photos and saves as JPEG for predictable, readable receipts.
 */
export async function compressReceiptForStorage(sourceUri: string): Promise<CompressedReceipt> {
  const r = await manipulateAsync(sourceUri, [{ resize: { width: RECEIPT_MAX_WIDTH } }], {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return { uri: r.uri, ext: 'jpg' };
}
