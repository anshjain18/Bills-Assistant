# Bills Assistant

**Bills Assistant** is a cross-platform mobile app for capturing receipt photos, tagging them with custom categories, and tracking spending in Indian Rupees (INR). It is built with [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/), stores data locally with SQLite, and keeps receipt images on device after compression.

---

## Features

### Home (Bills tab)

- **Capture receipt**: Opens the device camera to photograph a receipt, then opens the **Save receipt** flow.
- **Lifetime total**: Shows aggregate spending across all saved bills (all time), refreshed when you return to this screen.

### Save receipt (modal)

- Preview of the captured image.
- **Amount** in INR (supports decimals; amounts are stored internally as **paise**, 1 ₹ = 100 paise).
- **Category** picker populated from your categories; the category marked as **default** (if any) is preselected for new receipts.
- On save, the image is **resized and compressed** to JPEG (max width 1200px) and copied into app document storage; metadata is written to SQLite.

### Spending tab

- **Total** and **per-category** breakdowns for the selected period.
- **Date presets**: All time, last 7 days, last 30 days, or **custom** range with start/end pickers (platform-native date/time behavior on iOS and Android).
- Tapping a category row opens **Category detail** for that category, carrying the **same date range** so lists match the summary.

### Categories tab

- **Create**, **rename**, and **delete** categories (names must be unique).
- **Default category**: Optional toggle so one category is preselected when saving a new receipt; only one default at a time.
- Categories that still contain bills **cannot** be deleted until bills are moved or removed from **Category detail**.

### Category detail

- Lists bills in the category (optionally filtered by the date range passed from Spending).
- **View** receipt images (full-screen style viewer).
- **Move** a bill to another category or **delete** it.
- **Export** (header action): Builds a **ZIP** of receipt image files for the current view, plus CSV/metadata (via `jszip` + share sheet). Useful for backups or bookkeeping outside the app.

---

## Tech stack

| Area | Choice |
|------|--------|
| Runtime | Expo SDK ~54, React 19, React Native 0.81 |
| Language | TypeScript (strict mode) |
| Navigation | React Navigation 7 — native stack + bottom tabs |
| Local database | `expo-sqlite` (`bills_sorting.db`) |
| Images | `expo-image-picker` (camera), `expo-image-manipulator` (compression), `expo-file-system` (paths / copy / read) |
| Sharing exports | `expo-sharing`, `jszip` |
| Date UI | `@react-native-community/datetimepicker` |
| Icons | `@expo/vector-icons` (Material Community Icons) |

The app enables the **React Native New Architecture** (`newArchEnabled` in `app.json`).

---

## Requirements

- **Node.js** (LTS recommended) and npm.
- For physical devices: **Expo Go** or a development build; iOS/Android simulators work for development.
- **Camera** permission is required to capture receipts from the Home screen (photo library strings are configured for potential future flows).

---

## Getting started

Clone the repository and install dependencies:

```bash
cd bills_sorting
npm install
```

Start the Metro bundler:

```bash
npm start
```

Then:

- Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go on a device.

Other scripts:

| Script | Command |
|--------|---------|
| Start (default) | `npm start` |
| Android | `npm run android` |
| iOS | `npm run ios` |
| Web | `npm run web` |

> **Note:** This app is optimized for **iOS and Android**. Web may have limitations (e.g. camera, file paths, SQLite behavior).

---

## Project structure

```
bills_sorting/
├── App.tsx                 # Root: DB init, navigation, safe area, status bar
├── index.ts                # Expo entry (`registerRootComponent`)
├── app.json                # Expo config, permissions, plugins
├── package.json
├── src/
│   ├── db/
│   │   └── client.ts       # SQLite schema, migrations, queries
│   ├── navigation/         # Root stack, tab navigator, param types
│   ├── screens/            # Home, Spending, Categories, SaveBill, CategoryDetail
│   ├── theme/
│   │   └── colors.ts
│   ├── types/
│   │   └── index.ts        # Category, Bill, CategorySpendingRow
│   └── utils/
│       ├── dateRange.ts    # Local day boundaries, presets, range labels
│       ├── exportCategoryZip.ts
│       ├── inr.ts          # INR formatting and amount parsing
│       └── receiptImage.ts # Receipt JPEG compression pipeline
└── assets/                 # App icon, splash, favicon
```

---

## Data model (SQLite)

- **`categories`**: `id`, `name` (unique), `sort_order`, `created_at`, `is_default` (0/1).
- **`bills`**: `id`, `category_id` (FK to `categories`, `ON DELETE RESTRICT`), `amount_paise`, `image_uri` (local file path), `created_at` (ISO string for filtering).

Indexes and foreign keys are enabled in schema setup; a small migration adds `is_default` if upgrading an older database.

---

## Currency

- Display uses **INR** via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- User input accepts whole or decimal rupees; storage is **integer paise** to avoid floating-point issues.

---

## Permissions (see `app.json`)

- **iOS**: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (camera is primary for capture).
- **Android**: Standard Expo/adaptive icon config; edge-to-edge enabled.

`expo-image-picker` plugin strings describe camera and photo library access for the store build.

---

## Development notes

- Database opens on app launch in `App.tsx`; a loading indicator is shown until `openDatabase()` completes.
- Receipt files live under the app **document directory**; deleting the app removes local data unless exported.
- For questions about navigation types, see `src/navigation/types.ts` (`RootStackParamList`, `MainTabParamList`).

---

## License

Private project (`"private": true` in `package.json`). Adjust licensing if you publish the repository.
