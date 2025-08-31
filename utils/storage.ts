import { MMKV } from "react-native-mmkv";

export enum StorageKey {
  isNotificationPermissionShown = "isNotificationPermissionShown",
  // Add more keys as needed
}

export const storage = new MMKV();

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: StorageKey): string | null {
  try {
    return storage.getString(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Saves a string to storage.
 *
 * @param key The key to save.
 * @param value The value to store.
 */
export function saveString(key: StorageKey, value: string): boolean {
  try {
    storage.set(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads and parses JSON value from storage.
 *
 * @param key The key to fetch.
 */
export function load<T>(key: StorageKey): T | null {
  let raw: string | null = null;
  try {
    raw = loadString(key);
    return JSON.parse(raw ?? "") as T;
  } catch {
    return (raw as unknown as T) ?? null;
  }
}

/**
 * Saves an object as JSON string to storage.
 *
 * @param key The key to save.
 * @param value The object to store.
 */
export function save(key: StorageKey, value: unknown): boolean {
  try {
    return saveString(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

/**
 * Removes a specific key from storage.
 *
 * @param key The key to remove.
 */
export function remove(key: StorageKey): void {
  try {
    storage.delete(key);
  } catch {}
}

/**
 * Clears all keys from storage.
 */
export function clear(): void {
  try {
    storage.clearAll();
  } catch {}
}
