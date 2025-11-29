# Expo File Download POC - PDF Download with Notifications

## Core Purpose

This is a React Native (Expo) Proof of Concept (POC) that demonstrates how to download PDF files (or any files) from remote URLs with the following features:

1. **Multi-file Download**: Download multiple files in parallel
2. **Progress Tracking**: Real-time download progress with notifications
3. **Notification System**:
   - Individual file notifications with progress bars
   - Summary notification grouping all downloads
   - Cancel action buttons in notifications
4. **Storage Management**:
   - Automatic storage permission handling
   - Disk space checking before download
   - File size validation
5. **Platform Support**: Works on both Android and iOS with platform-specific optimizations
6. **File Sharing**: Automatic file sharing/saving after successful downloads

## Architecture Overview

The codebase follows a modular architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (index.tsx)                      │
│              Triggers download with file list                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              download-file.ts (Orchestrator)                 │
│  - Manages parallel downloads                                │
│  - Coordinates notifications                                 │
│  - Handles success/failure logic                            │
└──────┬───────────────────────────────┬───────────────────────┘
       │                               │
       ▼                               ▼
┌──────────────┐              ┌──────────────────┐
│ file-system  │              │     notifee      │
│   (Download) │              │  (Notifications) │
└──────────────┘              └──────────────────┘
       │                               │
       └───────────┬───────────────────┘
                   ▼
         ┌─────────────────┐
         │  share-file.ts  │
         │  (File Sharing) │
         └─────────────────┘
```

---

## File Documentation

### 1. Type Definitions

**File Path**: `utils/types.ts`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/utils/types.ts`

**Purpose**: Defines TypeScript type definitions used throughout the download functionality.

**Contents**:

#### Type: `DownloadFile`

```typescript
export type DownloadFile = {
  url: string; // Remote URL of the file to download
  filename: string; // Name to save the file as
  headers?: Record<string, string>; // Optional HTTP headers (e.g., Authorization)
  size?: number; // Optional file size in bytes (for validation)
};
```

**Description**:

- `url`: The complete HTTP/HTTPS URL from which to download the file
- `filename`: The name that will be used when saving the file locally
- `headers`: Optional object containing HTTP headers (commonly used for authentication tokens)
- `size`: Optional file size in bytes, used for disk space validation if remote file size cannot be fetched

**Usage Example**:

```typescript
const file: DownloadFile = {
  url: "https://example.com/document.pdf",
  filename: "document.pdf",
  headers: { Authorization: "Bearer token123" },
  size: 1024000,
};
```

---

### 2. Storage Utilities

**File Path**: `utils/storage.ts`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/utils/storage.ts`

**Purpose**: Provides persistent storage functionality using MMKV (fast key-value storage) for storing app state, particularly notification permission status.

**Dependencies**:

- `react-native-mmkv`: Fast key-value storage library

**Contents**:

#### Enum: `StorageKey`

```typescript
export enum StorageKey {
  isNotificationPermissionShown = "isNotificationPermissionShown",
}
```

**Description**: Enumeration of all storage keys used in the application. Currently only tracks whether notification permission dialog has been shown to the user.

#### Constant: `storage`

```typescript
export const storage = new MMKV();
```

**Description**: Singleton instance of MMKV storage. Used throughout the app for persistent data storage.

#### Function: `loadString(key: StorageKey): string | null`

**Parameters**:

- `key`: Storage key to fetch

**Returns**: `string | null` - The stored string value or null if not found/error

**Description**: Loads a string value from MMKV storage. Returns null if key doesn't exist or on error.

**Usage**: Used internally by `load()` function.

#### Function: `saveString(key: StorageKey, value: string): boolean`

**Parameters**:

- `key`: Storage key to save
- `value`: String value to store

**Returns**: `boolean` - true if successful, false on error

**Description**: Saves a string value to MMKV storage.

**Usage**: Used internally by `save()` function.

#### Function: `load<T>(key: StorageKey): T | null`

**Parameters**:

- `key`: Storage key to fetch
- Generic `T`: Type of the value to load

**Returns**: `T | null` - Parsed object/value or null if not found/error

**Description**:

- Loads a value from storage and parses it as JSON
- If parsing fails, returns the raw string value cast to type T
- Returns null if key doesn't exist

**Usage Example**:

```typescript
const permissionShown = load<boolean>(StorageKey.isNotificationPermissionShown);
```

#### Function: `save(key: StorageKey, value: unknown): boolean`

**Parameters**:

- `key`: Storage key to save
- `value`: Any value to store (will be JSON stringified)

**Returns**: `boolean` - true if successful, false on error

**Description**: Saves any value to storage by converting it to JSON string first.

**Usage Example**:

```typescript
save(StorageKey.isNotificationPermissionShown, true);
```

#### Function: `remove(key: StorageKey): void`

**Parameters**:

- `key`: Storage key to remove

**Returns**: `void`

**Description**: Deletes a specific key from storage. Silently handles errors.

**Usage Example**:

```typescript
remove(StorageKey.isNotificationPermissionShown);
```

#### Function: `clear(): void`

**Parameters**: None

**Returns**: `void`

**Description**: Clears all keys from storage. Used for resetting app state. Silently handles errors.

---

### 3. Format Utilities

**File Path**: `utils/format.ts`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/utils/format.ts`

**Purpose**: Provides string formatting utilities for filenames, particularly for truncating long filenames in notifications.

**Contents**:

#### Function: `truncate(name: string, maxLength: number = 40): string`

**Parameters**:

- `name`: The filename string to truncate
- `maxLength`: Maximum length (default: 40 characters)

**Returns**: `string` - Truncated filename with ellipsis

**Description**:

- Truncates long filenames to fit in notification titles
- Preserves file extension
- Uses ellipsis (`...`) in the middle
- If filename is shorter than maxLength, returns as-is
- Format: `start...end.extension`

**Algorithm**:

1. If name length <= maxLength, return name
2. Extract extension (everything after last dot)
3. Calculate available space: `maxLength - extension.length - 3` (for "...")
4. Split available space: half at start, half at end
5. Return: `start + "..." + end + extension`

**Usage Example**:

```typescript
truncate("very-long-filename-that-exceeds-limit.pdf", 30);
// Returns: "very-lo...limit.pdf"
```

#### Function: `splitFileName(filename: string): { name: string; extension: string }`

**Parameters**:

- `filename`: Complete filename with or without extension

**Returns**: `{ name: string; extension: string }` - Object with separated name and extension

**Description**:

- Splits a filename into name and extension parts
- Finds the last dot in the filename
- Returns name (before last dot) and extension (including the dot)
- If no dot found, returns filename as name and empty string as extension

**Usage Example**:

```typescript
splitFileName("document.pdf");
// Returns: { name: "document", extension: ".pdf" }

splitFileName("archive.tar.gz");
// Returns: { name: "archive.tar", extension: ".gz" }

splitFileName("noextension");
// Returns: { name: "noextension", extension: "" }
```

---

### 4. Global Download State Management

**File Path**: `utils/global.ts`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/utils/global.ts`

**Purpose**: Manages global state for active downloads, allowing cancellation of downloads from notifications.

**Dependencies**:

- `expo-file-system`: For `FileSystem.DownloadResumable` type

**Contents**:

#### Constant: `activeDownloads`

```typescript
export const activeDownloads: Record<string, FileSystem.DownloadResumable> = {};
```

**Description**:

- In-memory dictionary storing all active download instances
- Key: notification ID (generated from filename)
- Value: `DownloadResumable` object that can be cancelled
- Used to track downloads so they can be cancelled when user taps "Cancel" in notification

#### Function: `fetchDownload(id: string): FileSystem.DownloadResumable | undefined`

**Parameters**:

- `id`: Notification ID (or download ID)

**Returns**: `FileSystem.DownloadResumable | undefined` - The download instance or undefined if not found

**Description**: Retrieves an active download instance by its ID. Used when cancelling downloads from notification actions.

**Usage**: Called from notification cancel handler to get the download to cancel.

#### Function: `storeDownload(id: string, downloadResumable: FileSystem.DownloadResumable): void`

**Parameters**:

- `id`: Notification ID (or download ID)
- `downloadResumable`: The download instance to store

**Returns**: `void`

**Description**: Stores a download instance in the global `activeDownloads` dictionary. Called when starting a download.

**Usage**: Called from `file-system.ts` when creating a download to make it cancellable.

#### Function: `removeDownload(id: string): void`

**Parameters**:

- `id`: Notification ID (or download ID)

**Returns**: `void`

**Description**: Removes a download instance from the global dictionary. Called after download completes or is cancelled.

**Usage**: Cleanup function called after download finishes or is cancelled.

#### Function: `eraseDownloads(): void`

**Parameters**: None

**Returns**: `void`

**Description**: Clears all active downloads from the dictionary. Called after all downloads complete to free memory.

**Usage**: Called from `download-file.ts` after processing all downloads.

---

### 5. File Sharing Utility

**File Path**: `utils/share-file.ts`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/utils/share-file.ts`

**Purpose**: Provides functionality to share files using the native share sheet (iOS) or file picker (Android).

**Dependencies**:

- `react-native-share`: Native share functionality

**Contents**:

#### Function: `shareFile(urisToShare: string[]): Promise<void>`

**Parameters**:

- `urisToShare`: Array of file URIs (local file paths) to share

**Returns**: `Promise<void>` - Resolves when share sheet is opened, rejects on error

**Description**:

- Opens the native share sheet with the provided files
- On iOS: Opens share sheet where user can save to Files app or share to other apps
- On Android: Opens share sheet for sharing files
- `saveToFiles: true` enables saving to Files app on iOS
- `failOnCancel: false` means it won't throw error if user cancels

**Behavior**:

- Throws error if share fails (except user cancellation)
- Used as fallback when Android storage permissions are denied
- Also used for iOS file sharing

**Usage Example**:

```typescript
await shareFile(["file:///path/to/file1.pdf", "file:///path/to/file2.pdf"]);
```

---

### 6. File System Operations

**File Path**: `utils/file-system.ts`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/utils/file-system.ts`

**Purpose**: Handles all file system operations including downloads, directory management, storage permissions, and file operations.

**Dependencies**:

- `expo-file-system`: Core file system operations
- `react-native`: For Platform detection
- `./format`: For `splitFileName` function
- `./global`: For `storeDownload` function
- `./notifee`: For `getNotificationId` function
- `./types`: For `DownloadFile` type

**Contents**:

#### Constant: `DOCUMENT_DIR`

```typescript
export const DOCUMENT_DIR = `${FileSystem.documentDirectory}`;
```

**Description**:

- Path to the app's document directory (sandboxed storage)
- Used as temporary storage for downloads before moving to permanent location
- Format: `file:///path/to/app/documents/` (iOS) or similar path (Android)

#### Function: `getFileDownloadPath(dir: string, filename: string): string`

**Parameters**:

- `dir`: Directory path
- `filename`: Filename

**Returns**: `string` - Complete file path

**Description**: Concatenates directory path and filename to create full file path.

**Usage**: Helper function for constructing file paths.

#### Function: `doesDirExist(dir: string): Promise<boolean>`

**Parameters**:

- `dir`: Directory path to check

**Returns**: `Promise<boolean>` - true if directory exists, false otherwise

**Description**: Checks if a directory exists by querying file system info.

**Implementation**: Uses `FileSystem.getInfoAsync()` to check existence.

#### Function: `createDir(dir: string): Promise<void>`

**Parameters**:

- `dir`: Directory path to create

**Returns**: `Promise<void>`

**Description**: Creates a directory. `intermediates: true` creates parent directories if they don't exist.

**Implementation**: Uses `FileSystem.makeDirectoryAsync()`.

#### Function: `ensureDirExists(dir: string): Promise<void>`

**Parameters**:

- `dir`: Directory path to ensure exists

**Returns**: `Promise<void>`

**Description**:

- Checks if directory exists
- Creates it if it doesn't exist
- Used to ensure download directory is ready before starting downloads

**Usage**: Called before starting downloads to ensure storage directory exists.

#### Function: `download(file: DownloadFile, callback: (progress: FileSystem.DownloadProgressData) => void): Promise<FileSystem.FileSystemDownloadResult | undefined>`

**Parameters**:

- `file`: `DownloadFile` object with url, filename, headers, size
- `callback`: Progress callback function called with download progress data

**Returns**: `Promise<FileSystem.FileSystemDownloadResult | undefined>` - Download result with URI or undefined on failure

**Description**:

- Core download function that downloads a file from URL
- Creates a resumable download using `FileSystem.createDownloadResumable()`
- Stores download in global state for cancellation support
- Downloads to app's document directory (temporary storage)
- Supports custom headers (for authentication)
- Enables MD5 checksum verification
- Calls progress callback with download progress
- Returns download result with file URI on success

**Progress Callback**:

- Receives `FileSystem.DownloadProgressData` with:
  - `totalBytesWritten`: Bytes downloaded so far
  - `totalBytesExpectedToWrite`: Total file size

**Usage**: Called from `download-file.ts` for each file in the download queue.

#### Function: `getStoragePermissions(): Promise<string | null>`

**Parameters**: None

**Returns**: `Promise<string | null>` - Directory URI if permission granted, null if denied

**Description**:

- **Android Only**: Requests Storage Access Framework (SAF) permission to access Downloads folder
- Shows system file picker for user to select Downloads folder
- Returns directory URI if user grants permission
- Returns null if user denies permission
- **iOS**: Returns null (not applicable)

**Usage**: Called after downloads complete to get permission to save files to Downloads folder on Android.

#### Function: `readFileContentAsBase64(uri: string): Promise<string>`

**Parameters**:

- `uri`: Local file URI to read

**Returns**: `Promise<string>` - Base64 encoded file content

**Description**:

- Reads a file from local storage and converts to Base64 string
- Used to read downloaded file from temporary storage before writing to permanent location

**Usage**: Called on Android to read downloaded file before saving to Downloads folder.

#### Function: `createNewFile(dirUri: string, filename: string, contentType: string): Promise<string>`

**Parameters**:

- `dirUri`: Directory URI (from Storage Access Framework)
- `filename`: Name for the new file
- `contentType`: MIME type (e.g., "application/pdf")

**Returns**: `Promise<string>` - URI of the created file

**Description**:

- **Android Only**: Creates a new file in the specified directory using Storage Access Framework
- Uses `getUniqueFilename()` to ensure filename doesn't conflict
- Returns the URI of the created file for writing content

**Usage**: Called on Android to create file in Downloads folder before writing content.

#### Function: `writeFileContent(fileUri: string, base64: string): Promise<void>`

**Parameters**:

- `fileUri`: URI of the file to write to
- `base64`: Base64 encoded file content

**Returns**: `Promise<void>`

**Description**:

- Writes Base64 content to a file
- Used to write downloaded file content to permanent storage location

**Usage**: Called on Android after creating file to write the downloaded content.

#### Function: `getUniqueFilename(dirUri: string, filename: string): Promise<string>`

**Parameters**:

- `dirUri`: Directory URI to check
- `filename`: Original filename

**Returns**: `Promise<string>` - Unique filename (with number suffix if needed)

**Description**:

- Checks if filename already exists in directory
- If exists, appends `(1)`, `(2)`, etc. before extension
- Uses `splitFileName()` to separate name and extension
- Reads directory contents to check for conflicts
- Returns unique filename that doesn't conflict

**Example**:

- If "document.pdf" exists, returns "document (1).pdf"
- If "document (1).pdf" exists, returns "document (2).pdf"

**Usage**: Called before creating new file to avoid overwriting existing files.

#### Function: `deleteAllFiles(): Promise<void>`

**Parameters**: None

**Returns**: `Promise<void>`

**Description**:

- Deletes all files in the document directory
- Used to clean up temporary downloaded files after processing
- Called after all downloads are complete and files are moved/shared

**Usage**: Cleanup function called from `download-file.ts` after processing all downloads.

#### Function: `getFreeDiskStorage(): Promise<number>`

**Parameters**: None

**Returns**: `Promise<number>` - Free disk space in bytes

**Description**:

- Gets available free disk space on the device
- Used to check if there's enough space before downloading
- Returns value in bytes

**Usage**: Called before starting download to validate sufficient disk space.

#### Function: `getRemoteFileSize(url: string): Promise<number | null>`

**Parameters**:

- `url`: Remote file URL

**Returns**: `Promise<number | null>` - File size in bytes or null if cannot determine

**Description**:

- Makes HTTP HEAD request to get file size without downloading
- Reads `Content-Length` header from response
- Returns file size in bytes
- Returns null if header not present or request fails
- Used for disk space validation before download

**Usage**: Called before download to check if file size is known for validation.

---

### 7. Notification Management

**File Path**: `utils/notifee.ts`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/utils/notifee.ts`

**Purpose**: Manages all notification functionality including displaying progress notifications, summary notifications, and handling cancel actions.

**Dependencies**:

- `@notifee/react-native`: Notification library
- `./global`: For `fetchDownload` and `removeDownload` functions
- `./notification-permission`: For `fileDownloadChannelId` constant
- `./types`: For `DownloadFile` type

**Contents**:

#### Function: `getNotificationId(filename: string): string`

**Parameters**:

- `filename`: Filename

**Returns**: `string` - Notification ID in format `"download-{filename}"`

**Description**: Generates a unique notification ID for each file download. Used to update the same notification as download progresses.

**Usage**: Called to generate notification IDs for tracking individual file downloads.

#### Constants:

```typescript
export const groupNotificationId = `download-summary`;
export const groupId = `download-group`;
export const groupAlertBehavior = AndroidGroupAlertBehavior.SUMMARY;
```

**Description**:

- `groupNotificationId`: ID for the summary notification that groups all file downloads
- `groupId`: Group identifier for Android notification grouping
- `groupAlertBehavior`: Android behavior - only summary notification makes sound/alert

#### Function: `cancelNotification(notificationId: string): Promise<void>`

**Parameters**:

- `notificationId`: Notification ID to cancel

**Returns**: `Promise<void>`

**Description**:

- Cancels a notification and the associated download
- Removes notification from notification tray
- Fetches the download from global state
- Cancels the actual download using `cancelAsync()`
- Removes download from global state after cancellation

**Usage**: Called when user taps "Cancel" button in notification.

#### Event Handler: `notifee.onBackgroundEvent`

```typescript
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "cancel") {
    // Cancel download
  }
});
```

**Description**:

- Handles notification actions when app is in background
- Listens for `ACTION_PRESS` events
- Checks if pressed action is "cancel"
- Calls `cancelNotification()` to cancel download

**Usage**: Automatically registered when module loads. Handles cancel action from background.

#### Event Handler: `notifee.onForegroundEvent`

```typescript
notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "cancel") {
    // Cancel download
  }
});
```

**Description**:

- Handles notification actions when app is in foreground
- Same logic as background handler
- Ensures cancel action works regardless of app state

**Usage**: Automatically registered when module loads. Handles cancel action from foreground.

#### Function: `updateSummaryNotification(title: string, body?: string): Promise<void>`

**Parameters**:

- `title`: Notification title
- `body`: Optional notification body text

**Returns**: `Promise<void>`

**Description**:

- Updates or creates the summary notification that groups all file downloads
- Uses `groupNotificationId` as ID
- Sets `groupSummary: true` on Android to make it the group summary
- Uses `fileDownloadChannelId` for Android channel
- Sets `groupId` to group with individual file notifications
- Shows summary of all downloads (e.g., "3 files downloaded successfully")

**Usage**:

- Called at start: "Downloading files..."
- Called at end: "Downloads Summary" with success/failure count

#### Function: `updateFileNotification({ file, title, body, progress, actions, iosSound }): void`

**Parameters**:

- `file`: `DownloadFile` object
- `title`: Notification title
- `body`: Optional notification body
- `progress`: Optional progress object with `{ indeterminate: boolean, max: number, current: number }`
- `actions`: Optional array of action buttons (e.g., Cancel button)
- `iosSound`: Optional iOS sound name (e.g., "default")

**Returns**: `void`

**Description**:

- Updates or creates a notification for individual file download
- Uses `getNotificationId(file.filename)` as notification ID
- On Android:
  - Sets `onlyAlertOnce: true` to prevent multiple alerts
  - Adds to `groupId` for grouping
  - Sets progress bar if `progress` provided
  - Adds action buttons if `actions` provided
- On iOS:
  - Sets sound if `iosSound` provided
- Updates same notification as download progresses (0%, 10%, 20%, etc.)
- Shows completion or error message when done

**Progress Object**:

- `indeterminate: false`: Shows determinate progress bar
- `max: 100`: Maximum progress value
- `current: 0-100`: Current progress percentage

**Actions Array**:

- Each action has `title` and `pressAction.id`
- "Cancel" action has `id: "cancel"` which triggers cancel handler

**Usage**:

- Called at start: Shows "Downloading: filename - 0%"
- Called on progress: Updates percentage (10%, 20%, etc.)
- Called on completion: Shows "filename - Download complete."
- Called on error: Shows "filename - Failed: error message"

---

### 8. Notification Permission Management

**File Path**: `utils/notification-permission.ts`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/utils/notification-permission.ts`

**Purpose**: Handles notification permission requests, channel creation (Android), and permission state management.

**Dependencies**:

- `@notifee/react-native`: For channel creation
- `react-native`: For Platform detection
- `react-native-permissions`: For permission checking and requesting
- `./storage`: For storing permission state

**Contents**:

#### Platform Detection Functions:

```typescript
export const isIos = () => Platform.OS === "ios";
export const isAndroid = () => Platform.OS === "android";
export const getPlatformVersion = () => Number(Platform.Version);
```

**Description**:

- Helper functions for platform detection
- `getPlatformVersion()` returns Android API level or iOS version number

#### Constants:

```typescript
export const fileDownloadChannelId = "file-downloads";
export const fileDownloadChannelName = "File Downloads";
```

**Description**:

- Android notification channel ID and name
- Used for creating notification channel on Android

#### Function: `savePermissionShown(value: boolean): void`

**Parameters**:

- `value`: Boolean indicating if permission dialog was shown

**Returns**: `void`

**Description**: Saves to storage whether notification permission dialog has been shown to user. Prevents showing permission dialog multiple times.

#### Function: `clearPermissionShown(): void`

**Parameters**: None

**Returns**: `void`

**Description**: Removes permission shown flag from storage. Used for resetting state.

#### Function: `loadPermissionShown(): boolean`

**Parameters**: None

**Returns**: `boolean` - true if permission was shown, false otherwise

**Description**: Loads permission shown flag from storage. Returns false if not set.

#### Function: `requestNotificationsPermission(onGranted: () => void, onBlocked?: () => void): void`

**Parameters**:

- `onGranted`: Callback when permission is granted
- `onBlocked`: Optional callback when permission is blocked/denied

**Returns**: `void`

**Description**:

- Requests notification permission from user
- Requests "alert", "sound", and "badge" permissions
- Calls `onGranted` if user grants permission
- Calls `onBlocked` if user denies permission

**Usage**: Called when permission is not granted and needs to be requested.

#### Function: `checkNotificationsPermission(onGranted: () => void, onBlocked?: () => void): void`

**Parameters**:

- `onGranted`: Callback when permission is already granted
- `onBlocked`: Optional callback when permission is not granted

**Returns**: `void`

**Description**:

- Checks current notification permission status
- Calls `onGranted` if permission already granted
- Calls `onBlocked` if permission not granted

**Usage**: Called first to check if permission already exists before requesting.

#### Function: `createChannel(channelId: string, channelName: string): void`

**Parameters**:

- `channelId`: Android channel ID
- `channelName`: Android channel display name

**Returns**: `void`

**Description**:

- **Android Only**: Creates a notification channel if it doesn't exist
- Checks if channel exists first using `notifee.isChannelCreated()`
- Creates channel with:
  - `sound: "default"`: Default notification sound
  - `importance: AndroidImportance.HIGH`: High importance (shows on screen, makes sound)
- **iOS**: Does nothing (iOS doesn't use channels)

**Usage**: Called before displaying notifications to ensure channel exists.

#### Function: `createChannels(): void`

**Parameters**: None

**Returns**: `void`

**Description**:

- Creates all required notification channels
- Currently creates only the file download channel
- Can be extended to create more channels

**Usage**: Called when permission is granted to set up channels.

#### Function: `handleNotificationPermission(callback: () => void): void`

**Parameters**:

- `callback`: Function to execute after permission is handled

**Returns**: `void`

**Description**:

- **Main entry point** for notification permission handling
- Complex logic flow:
  1. Check if permission dialog was already shown (from storage)
  2. If shown, execute callback immediately (don't ask again)
  3. If not shown, check current permission status
  4. If granted: create channels, save state, execute callback
  5. If not granted:
     - **iOS or Android 33+**: Request permission
       - If granted: create channels, save state, execute callback
       - If denied: save state (don't ask again), execute callback
     - **Android < 33**: Permission auto-granted, save state, execute callback

**Platform-Specific Behavior**:

- **iOS**: Always requires explicit permission request
- **Android 33+**: Requires explicit permission request (new Android 13+ behavior)
- **Android < 33**: Permission automatically granted (legacy behavior)

**Usage**: Called before starting downloads to ensure notifications can be displayed.

**Example Flow**:

```typescript
handleNotificationPermission(() => {
  // This callback runs after permission is handled
  // Safe to start downloads and show notifications
  downloadFiles(files);
});
```

---

### 9. Core Download Orchestrator

**File Path**: `utils/download-file.ts`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/utils/download-file.ts`

**Purpose**: Main orchestrator function that coordinates downloading multiple files, managing notifications, handling errors, and processing completed downloads.

**Dependencies**:

- `expo-file-system`: For file system types
- `react-native`: For Platform detection
- `./file-system`: For all file operations
- `./format`: For `truncate` function
- `./global`: For `eraseDownloads` function
- `./notifee`: For notification updates
- `./share-file`: For file sharing
- `./types`: For `DownloadFile` type

**Contents**:

#### Function: `downloadFiles(files: DownloadFile[]): Promise<void>`

**Parameters**:

- `files`: Array of `DownloadFile` objects to download

**Returns**: `Promise<void>`

**Description**:

- **Main entry point** for downloading files
- Orchestrates the entire download process:
  1. Creates summary notification
  2. Initializes individual file notifications
  3. Validates disk space for each file
  4. Downloads all files in parallel
  5. Updates progress notifications
  6. Handles completion/errors
  7. Saves files to permanent storage (Android) or shares (iOS/Android fallback)
  8. Cleans up temporary files

**Detailed Flow**:

1. **Initialization**:

   - Creates summary notification: "Downloading files..."
   - For each file, creates individual notification: "Downloading: filename"
   - Ensures document directory exists

2. **Parallel Download Loop** (for each file):

   - Gets remote file size (via HEAD request)
   - Checks available disk space
   - Validates sufficient space
   - Starts download with progress callback
   - Stores download in global state for cancellation

3. **Progress Updates**:

   - Progress callback receives download progress
   - Calculates percentage: `(bytesWritten / bytesExpected) * 100`
   - Updates notification in 10% buckets (0%, 10%, 20%, etc.)
   - Shows "Cancel" button in notification
   - On 100%: Shows "Download complete" with sound

4. **Error Handling**:

   - Catches download errors
   - Updates notification: "Failed: error message"
   - Continues with other downloads

5. **Completion Processing**:

   - Waits for all downloads to complete (`Promise.allSettled`)
   - Separates successful and failed downloads
   - Updates summary notification with counts

6. **File Saving** (Android):

   - Requests storage permissions
   - For each successful download:
     - Reads file as Base64 from temporary storage
     - Creates new file in Downloads folder (with unique name)
     - Writes Base64 content to new file
   - If permission denied: Adds to share list

7. **File Sharing** (iOS or Android fallback):

   - If files couldn't be saved to Downloads, shares them
   - Opens native share sheet
   - User can save to Files app or share to other apps

8. **Cleanup**:
   - Removes all downloads from global state
   - Deletes all temporary files from document directory

**Progress Bucketing Logic**:

- Updates notification only when crossing 10% thresholds
- Prevents notification spam
- Example: Updates at 0%, 10%, 20%, ..., 90%, 100%
- Uses `lastProgressMap` to track last reported percentage

**Error Scenarios Handled**:

- Insufficient disk space
- Network errors
- File size unknown
- Storage permission denied
- File creation/write errors

**Usage Example**:

```typescript
const files = [
  {
    url: "https://example.com/file1.pdf",
    filename: "file1.pdf",
  },
  {
    url: "https://example.com/file2.pdf",
    filename: "file2.pdf",
    headers: { Authorization: "Bearer token" },
  },
];

await downloadFiles(files);
```

---

### 10. UI Component - Main Screen

**File Path**: `app/(tabs)/index.tsx`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/app/(tabs)/index.tsx`

**Purpose**: Main UI screen that demonstrates the download functionality with buttons to trigger different download scenarios.

**Dependencies**:

- `expo-image`: For Image component
- `react-native`: For Button, StyleSheet
- `@/components/ParallaxScrollView`: UI component (not documented per requirements)
- `@/utils/download-file`: For `downloadFiles` function
- `@/utils/file-system`: For utility functions
- `@/utils/notification-permission`: For `handleNotificationPermission` function

**Contents**:

#### Function: `getToken(): string`

**Parameters**: None

**Returns**: `string` - Authentication token

**Description**:

- Mock function that returns a hardcoded authentication token
- In real app, this would fetch token from secure storage or API
- Used for authenticated file downloads

**Usage**: Called by `getHeaders()` to get token for Authorization header.

#### Function: `getHeaders(): Record<string, string>`

**Parameters**: None

**Returns**: `Record<string, string>` - HTTP headers object

**Description**:

- Creates HTTP headers object with Authorization header
- Gets token from `getToken()`
- Returns headers in format: `{ "Authorization": "Bearer {token}" }`
- Returns empty object if no token

**Usage**: Used when downloading files that require authentication.

#### Component: `HomeScreen` (Default Export)

**Description**:

- Main React component that renders the download interface
- Uses Expo Router file-based routing (default export = route component)
- Displays buttons to trigger different download scenarios

**Functions Inside Component**:

##### `downloadSingleFile(): Promise<void>`

**Description**:

- Downloads a single PDF file
- Wraps download in `handleNotificationPermission()` to ensure permissions
- Downloads: "archlou.pdf" from archlou.org
- Demonstrates basic single file download

**Flow**:

1. Request notification permission
2. Create file array with one file
3. Call `downloadFiles()`

##### `downloadMultipleFiles(): Promise<void>`

**Description**:

- Downloads multiple PDF files in parallel
- Wraps download in `handleNotificationPermission()`
- Downloads 2 PDF files:
  - "archlou.pdf" from archlou.org
  - "ontheline.pdf" from trincoll.edu
- Has commented examples of larger files (100MB, 1GB, 10GB zips)
- Demonstrates parallel multi-file download

**Flow**:

1. Request notification permission
2. Create file array with multiple files
3. Call `downloadFiles()` (downloads in parallel)

##### `downloadAuthenticatedFile(): Promise<void>`

**Description**:

- Downloads a file that requires authentication
- Uses `getHeaders()` to add Authorization header
- Demonstrates downloading files from protected endpoints
- Downloads: "test.pdf" from q4cdn.com with auth headers

**Flow**:

1. Request notification permission
2. Create file array with headers
3. Call `downloadFiles()` with authenticated request

**UI Elements**:

1. **ParallaxScrollView**:

   - Scrollable container with parallax header effect
   - Contains header image (React logo)
   - Background colors for light/dark mode

2. **Buttons**:
   - "Download Single File": Triggers `downloadSingleFile()`
   - "Download Multiple Files": Triggers `downloadMultipleFiles()`
   - "Download authenticated file": Triggers `downloadAuthenticatedFile()`
   - "Get Free Disk Storage": Logs free disk space to console
   - "Get Remote File Size": Logs remote file size to console

**Styles**:

- `titleContainer`: Flex row container for title
- `stepContainer`: Container with gap and margin
- `reactLogo`: Absolute positioned React logo image

**Usage**:

- This is the main entry point screen
- Users tap buttons to trigger downloads
- Downloads happen in background with notifications
- Files are saved/shared automatically after download

---

### 11. Package Configuration

**File Path**: `package.json`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/package.json`

**Purpose**: Defines project dependencies, scripts, and metadata.

**Key Dependencies for Download/Notification Functionality**:

1. **`@notifee/react-native: ^9.1.8`**

   - Notification library for displaying progress notifications
   - Supports Android channels, iOS notifications, progress bars, actions

2. **`expo: ~53.0.22`**

   - Expo SDK framework
   - Provides `expo-file-system` module

3. **`expo-file-system`** (included in expo)

   - File system operations, downloads, storage access

4. **`react-native-permissions: ^5.4.2`**

   - Permission handling for notifications
   - Platform-specific permission requests

5. **`react-native-share: ^12.2.0`**

   - Native file sharing functionality
   - Opens share sheet for saving/sharing files

6. **`react-native-mmkv: ^3.3.0`**
   - Fast key-value storage
   - Used for storing permission state

**Scripts**:

- `start`: Start Expo development server
- `android`: Build and run on Android
- `ios`: Build and run on iOS
- `prebuild:android`: Prebuild Android native code
- `prebuild:ios`: Prebuild iOS native code

---

### 12. App Configuration

**File Path**: `app.json`

**GitHub Link Format**: `https://github.com/[username]/[repo]/blob/main/app.json`

**Purpose**: Expo app configuration including permissions, plugins, and platform-specific settings.

**Key Configuration for Download/Notification Functionality**:

#### Android Permissions:

```json
"permissions": [
  "android.permission.POST_NOTIFICATIONS"
]
```

- Required for displaying notifications on Android 13+

#### Plugins:

1. **`react-native-share`**:

   - Configures share functionality
   - iOS: Queries schemes for social apps
   - Android: Package names for social apps

2. **`expo-build-properties`**:

   - Android: `targetSdkVersion: 35`
   - Extra Maven repos for Notifee

3. **`react-native-permissions`**:
   - iOS: Requests "Notifications" permission
   - Handled automatically by plugin

**iOS Configuration**:

- `LSApplicationQueriesSchemes`: Allows querying social apps for sharing
- `bundleIdentifier`: App bundle ID

**Android Configuration**:

- `package`: Android package name
- `edgeToEdgeEnabled`: Modern Android UI
- `adaptiveIcon`: App icon configuration

---

## Usage Guide

### Basic Usage

1. **Import the download function**:

```typescript
import { downloadFiles } from "@/utils/download-file";
import { handleNotificationPermission } from "@/utils/notification-permission";
```

2. **Request permission and download**:

```typescript
handleNotificationPermission(() => {
  const files = [
    {
      url: "https://example.com/document.pdf",
      filename: "document.pdf",
    },
  ];
  downloadFiles(files);
});
```

### Download with Authentication

```typescript
const files = [
  {
    url: "https://api.example.com/protected/file.pdf",
    filename: "file.pdf",
    headers: {
      Authorization: "Bearer your-token-here",
    },
  },
];
downloadFiles(files);
```

### Download Multiple Files

```typescript
const files = [
  { url: "https://example.com/file1.pdf", filename: "file1.pdf" },
  { url: "https://example.com/file2.pdf", filename: "file2.pdf" },
  { url: "https://example.com/file3.pdf", filename: "file3.pdf" },
];
downloadFiles(files); // Downloads in parallel
```

### With File Size Validation

```typescript
const files = [
  {
    url: "https://example.com/large-file.pdf",
    filename: "large-file.pdf",
    size: 50 * 1024 * 1024, // 50MB in bytes
  },
];
downloadFiles(files);
```

---

## Platform-Specific Behavior

### Android

1. **Storage Permissions**:

   - Android 10+: Uses Storage Access Framework (SAF)
   - User selects Downloads folder via system picker
   - Files saved directly to Downloads folder
   - If permission denied, files are shared via share sheet

2. **Notifications**:

   - Android 13+: Requires POST_NOTIFICATIONS permission
   - Android < 13: Permission auto-granted
   - Uses notification channels
   - Supports progress bars and action buttons

3. **File Saving**:
   - Files downloaded to app sandbox first
   - Then copied to Downloads folder via SAF
   - Unique filename generation prevents overwrites

### iOS

1. **Storage Permissions**:

   - No special storage permissions needed
   - Files saved to app sandbox
   - Shared via native share sheet
   - User can save to Files app from share sheet

2. **Notifications**:

   - Always requires explicit permission
   - No notification channels (iOS doesn't use them)
   - Supports progress indicators
   - Sound can be customized

3. **File Saving**:
   - Files remain in app sandbox
   - User must use share sheet to save to Files app
   - No direct Downloads folder access

---

## Dependencies Summary

### Core Dependencies

| Package                    | Version  | Purpose                          |
| -------------------------- | -------- | -------------------------------- |
| `@notifee/react-native`    | ^9.1.8   | Notifications with progress      |
| `expo`                     | ~53.0.22 | Framework (includes file-system) |
| `react-native-permissions` | ^5.4.2   | Permission handling              |
| `react-native-share`       | ^12.2.0  | File sharing                     |
| `react-native-mmkv`        | ^3.3.0   | Fast storage                     |

### Included in Expo

- `expo-file-system`: File operations and downloads
- `expo-constants`: App constants
- `expo-linking`: Deep linking

---

## Implementation Checklist

When implementing this functionality in a new project:

1. ✅ Install dependencies: `@notifee/react-native`, `react-native-permissions`, `react-native-share`, `react-native-mmkv`
2. ✅ Configure `app.json` with notification permissions
3. ✅ Copy all utility files from `utils/` directory
4. ✅ Set up notification channels (handled automatically by `notification-permission.ts`)
5. ✅ Call `handleNotificationPermission()` before downloads
6. ✅ Use `downloadFiles()` with array of file objects
7. ✅ Handle platform-specific file saving (automatic)

---

## Error Handling

The implementation handles:

- **Network errors**: Caught and shown in notifications
- **Insufficient disk space**: Validated before download, error shown if not enough
- **Permission denied**: Falls back to file sharing
- **File conflicts**: Automatic unique filename generation
- **Download cancellation**: User can cancel from notification
- **Missing file size**: Attempts HEAD request, falls back to provided size

---

## Notes for AI Implementation

1. **File Paths**: All file paths are relative to project root. Use GitHub raw URLs for file access:

   - Format: `https://github.com/[username]/[repo]/blob/main/[file-path]`
   - Example: `https://github.com/user/repo/blob/main/utils/download-file.ts`

2. **Dependencies**: Ensure all dependencies are installed and versions match

3. **Platform Testing**: Test on both iOS and Android as behavior differs

4. **Permissions**: Android 13+ and iOS require runtime permission requests

5. **Storage**: Files are temporarily stored in app sandbox, then moved to permanent location

6. **Notifications**: Notification IDs must be unique per file. Uses filename-based IDs.

7. **Progress Updates**: Updates are throttled to 10% buckets to prevent notification spam

8. **Error Recovery**: Failed downloads don't stop other downloads (uses `Promise.allSettled`)

---

## Complete File List

All files related to PDF download + notification functionality:

1. `utils/types.ts` - Type definitions
2. `utils/storage.ts` - Storage utilities
3. `utils/format.ts` - Format utilities
4. `utils/global.ts` - Global download state
5. `utils/share-file.ts` - File sharing
6. `utils/file-system.ts` - File system operations
7. `utils/notifee.ts` - Notification management
8. `utils/notification-permission.ts` - Permission handling
9. `utils/download-file.ts` - Main download orchestrator
10. `app/(tabs)/index.tsx` - UI component
11. `package.json` - Dependencies
12. `app.json` - App configuration

---

**End of Documentation**
