// Client-only IndexedDB autosave for in-progress recordings, so a crashed
// tab/browser/PC doesn't lose audio that hasn't made it through the
// upload -> transcribe -> summarize -> save pipeline yet.

const DB_NAME = "notetaker-autosave";
const DB_VERSION = 1;
const SESSIONS_STORE = "sessions";
const CHUNKS_STORE = "chunks";

export type RecordingSessionMeta = {
  key: string;
  workspaceId: string | null;
  meetingTitle: string;
  mimeType: string;
  startedAt: string;
  seconds: number;
  calendarEvent: unknown;
  storagePath?: string;
  audioUrl?: string | null;
  transcript?: string;
  summary?: unknown;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunkStore = db.createObjectStore(CHUNKS_STORE, { autoIncrement: true });
        chunkStore.createIndex("key", "key", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = run(tx.objectStore(storeName));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSessionMeta(meta: RecordingSessionMeta): Promise<void> {
  try {
    await withStore(SESSIONS_STORE, "readwrite", (store) => store.put(meta));
  } catch (error) {
    console.error("Autosave: failed to save session meta", error);
  }
}

export async function updateSessionMeta(key: string, patch: Partial<RecordingSessionMeta>): Promise<void> {
  try {
    const existing = await getSessionMeta(key);
    if (!existing) return;
    await saveSessionMeta({ ...existing, ...patch, key });
  } catch (error) {
    console.error("Autosave: failed to update session meta", error);
  }
}

export async function getSessionMeta(key: string): Promise<RecordingSessionMeta | undefined> {
  try {
    return await withStore(SESSIONS_STORE, "readonly", (store) => store.get(key));
  } catch (error) {
    console.error("Autosave: failed to read session meta", error);
    return undefined;
  }
}

export async function listSessions(): Promise<RecordingSessionMeta[]> {
  try {
    return await withStore(SESSIONS_STORE, "readonly", (store) => store.getAll());
  } catch (error) {
    console.error("Autosave: failed to list sessions", error);
    return [];
  }
}

export async function saveChunk(key: string, index: number, blob: Blob): Promise<void> {
  try {
    await withStore(CHUNKS_STORE, "readwrite", (store) => store.put({ key, index, blob }));
  } catch (error) {
    console.error("Autosave: failed to save chunk", error);
  }
}

export async function getChunks(key: string): Promise<Blob[]> {
  try {
    const records = await withStore<{ key: string; index: number; blob: Blob }[]>(
      CHUNKS_STORE,
      "readonly",
      (store) => store.index("key").getAll(IDBKeyRange.only(key))
    );
    return records.sort((a, b) => a.index - b.index).map((record) => record.blob);
  } catch (error) {
    console.error("Autosave: failed to read chunks", error);
    return [];
  }
}

export async function deleteSession(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE, CHUNKS_STORE], "readwrite");
      tx.objectStore(SESSIONS_STORE).delete(key);
      const chunkStore = tx.objectStore(CHUNKS_STORE);
      const index = chunkStore.index("key");
      const cursorRequest = index.openCursor(IDBKeyRange.only(key));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error("Autosave: failed to delete session", error);
  }
}
