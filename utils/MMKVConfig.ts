import AsyncStorage from "@react-native-async-storage/async-storage";

// ponytail: react-native-mmkv uses Nitro native modules, unsupported in Expo Go.
// AsyncStorage is async-only, so we keep a synchronous in-memory cache on top of it,
// hydrated once at startup. Callers that need the persisted value before first paint
// should `await ready` before calling getBoolean.
const cache = new Map<string, boolean>();

export const ready = AsyncStorage.getAllKeys()
  .then((keys) => AsyncStorage.multiGet(keys))
  .then((pairs) => {
    pairs.forEach(([key, value]) => {
      if (value === "true" || value === "false") cache.set(key, value === "true");
    });
  })
  .catch(() => {});

export const storage = {
  getBoolean(key: string): boolean | undefined {
    return cache.get(key);
  },
  set(key: string, value: boolean) {
    cache.set(key, value);
    AsyncStorage.setItem(key, String(value)).catch(() => {});
  },
};
