import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'tenno-ledger';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await getDb();
    return (await db.get(STORE, key)) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE, value, key);
  } catch {
    // IndexedDB can be unavailable (private mode, quota). The app falls back to network.
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE, key);
  } catch {
    // Ignore.
  }
}

export async function idbClear(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE);
  } catch {
    // Ignore.
  }
}
