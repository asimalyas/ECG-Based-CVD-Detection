import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database schema types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'technician' | 'patient';
  phone?: string;
  organization?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface ECGRecord {
  id: string;
  patient_id: string;
  patient_name?: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_by_role: string;
  assigned_doctor_id?: string;
  assigned_doctor_name?: string;
  file_name: string;
  file_path: string;
  file_type: string;
  status: 'pending' | 'reviewed';
  prediction?: string;
  confidence?: number;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  comments?: string;
}

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Helper function to sign up
export const signUp = async (email: string, password: string, metadata: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  return { data, error };
};

// Helper function to sign in
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// In-memory store for development (since we can't use database tables yet)
// This simulates what the edge function's KV store does. Large image/file
// payloads are kept outside localStorage so app metadata survives quota pressure.
interface StoredFileEntry {
  fileName?: string;
  fileData: string;
  fileType?: string;
  uploadedAt?: string;
  storedInMemory?: boolean;
}

type SanitizeResult = {
  value: any;
  changed: boolean;
};

const STORE_KEY = 'cardiodetect_store';
const FILE_DB_NAME = 'cardiodetect_file_store';
const FILE_DB_STORE = 'files';
const STORAGE_WARNING_EVENT = 'cardiodetect-storage-warning';
const STORAGE_WARNING_RATIO = 0.85;
const STORAGE_ESTIMATE_INTERVAL_MS = 30000;

class MemoryStore {
  private store: Map<string, any>;
  private fileDb: IDBDatabase | null = null;
  private inlineImageCounter = 0;
  private storageWarningShown = false;
  private lastStorageEstimateAt = 0;
  ready: Promise<void>;

  constructor() {
    this.store = this.loadPersistedStore();
    const seededMockUsers = this.seedMockAccounts();
    this.ready = this.initializeLargeFileStore(seededMockUsers);

    console.log('[MemoryStore] Initialized with', this.store.size, 'items');
  }

  private loadPersistedStore() {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (!stored) return new Map<string, any>();

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return new Map<string, any>();

      return new Map<string, any>(parsed);
    } catch (error) {
      console.error('[MemoryStore] Failed to read persisted store:', error);
      return new Map<string, any>();
    }
  }

  private seedMockAccounts() {
    if (this.store.has('user:mock_doc')) return false;

    this.store.set('user:mock_doc', { id: 'mock_doc', email: 'doctor@gmail.com', name: 'Dr. Test', role: 'doctor', status: 'approved' });
    this.store.set('user:mock_tech', { id: 'mock_tech', email: 'technician@gmail.com', name: 'Tech Test', role: 'technician', status: 'approved' });
    this.store.set('user:mock_pat', { id: 'mock_pat', email: 'patient@gmail.com', name: 'Pat Test', role: 'patient', status: 'approved' });
    return true;
  }

  private async initializeLargeFileStore(shouldPersistAfterInit: boolean) {
    this.fileDb = await this.openFileDb();
    await this.hydrateFileCache();

    const migratedInlineImages = this.migrateInlineImagesFromMetadata();
    if (migratedInlineImages) {
      console.info('[MemoryStore] Migrated inline ECG image data out of localStorage metadata');
    }

    if (shouldPersistAfterInit || migratedInlineImages) {
      this.persist();
    }

    void this.warnIfStorageLow();
  }

  private openFileDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      console.warn('[MemoryStore] IndexedDB unavailable. Large files will remain session-only.');
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(FILE_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(FILE_DB_STORE)) {
          db.createObjectStore(FILE_DB_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[MemoryStore] IndexedDB file store unavailable:', request.error);
        resolve(null);
      };
      request.onblocked = () => {
        console.warn('[MemoryStore] IndexedDB file store is blocked by another tab');
        resolve(null);
      };
    });
  }

  private async hydrateFileCache() {
    if (!this.fileDb) return;

    await new Promise<void>((resolve) => {
      const transaction = this.fileDb!.transaction(FILE_DB_STORE, 'readonly');
      const objectStore = transaction.objectStore(FILE_DB_STORE);
      const keysRequest = objectStore.getAllKeys();
      const valuesRequest = objectStore.getAll();

      transaction.oncomplete = () => {
        const keys = keysRequest.result || [];
        const values = valuesRequest.result || [];

        keys.forEach((key, index) => {
          const storageKey = String(key);
          if (!this.store.has(storageKey)) {
            this.store.set(storageKey, values[index]);
          }
        });

        if (keys.length > 0) {
          console.log('[MemoryStore] Hydrated', keys.length, 'large file entries from IndexedDB');
        }
        resolve();
      };

      transaction.onerror = () => {
        console.warn('[MemoryStore] Failed to hydrate large file cache:', transaction.error);
        resolve();
      };
    });
  }

  private async putFileToIndexedDb(key: string, value: StoredFileEntry) {
    if (!this.fileDb) return;

    await new Promise<void>((resolve) => {
      const transaction = this.fileDb!.transaction(FILE_DB_STORE, 'readwrite');
      transaction.objectStore(FILE_DB_STORE).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.warn('[MemoryStore] Failed to persist large file:', transaction.error);
        this.dispatchStorageWarning('Browser storage is low. Reports and login data were kept, but some cached images may need cleanup.');
        resolve();
      };
    });
  }

  private async deleteFileFromIndexedDb(key: string) {
    if (!this.fileDb) return;

    await new Promise<void>((resolve) => {
      const transaction = this.fileDb!.transaction(FILE_DB_STORE, 'readwrite');
      transaction.objectStore(FILE_DB_STORE).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.warn('[MemoryStore] Failed to delete large file:', transaction.error);
        resolve();
      };
    });
  }

  private normalizeStoredFile(value: any): StoredFileEntry {
    const fileData = typeof value === 'string' ? value : String(value?.fileData || '');
    const parsedDataUrl = this.parseDataImage(fileData);

    return {
      ...(typeof value === 'object' && value ? value : {}),
      fileData: parsedDataUrl?.base64 || fileData,
      fileType: parsedDataUrl?.fileType || value?.fileType || 'image/png',
      uploadedAt: value?.uploadedAt || new Date().toISOString(),
      storedInMemory: true,
    };
  }

  private storeFile(key: string, value: any) {
    const normalized = this.normalizeStoredFile(value);
    this.store.set(key, normalized);

    if (this.fileDb) {
      void this.putFileToIndexedDb(key, normalized);
      return;
    }

    if (this.ready) {
      void this.ready.then(() => this.putFileToIndexedDb(key, normalized));
    }
  }

  private parseDataImage(value: string) {
    const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
    if (!match) return null;

    return {
      fileType: match[1],
      base64: match[2],
    };
  }

  private extensionFromMime(fileType: string) {
    const subtype = (fileType.split('/')[1] || 'png').toLowerCase();
    if (subtype.includes('jpeg')) return 'jpg';
    if (subtype.includes('svg')) return 'svg';
    return subtype.split('+')[0].replace(/[^a-z0-9]/g, '') || 'png';
  }

  private safeFileSegment(value: string) {
    return String(value || 'image')
      .replace(/[^a-z0-9._-]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64) || 'image';
  }

  private storeDataImageAsFile(dataUrl: string, ownerKey: string, path: string[]) {
    const parsed = this.parseDataImage(dataUrl);
    if (!parsed) return dataUrl;

    const extension = this.extensionFromMime(parsed.fileType);
    const owner = this.safeFileSegment(ownerKey);
    const label = this.safeFileSegment(path[path.length - 1] || 'image');
    const fileRef = `pipeline/persisted/${owner}/${Date.now()}-${++this.inlineImageCounter}-${label}.${extension}`;

    this.storeFile(`file:${fileRef}`, {
      fileName: `${label}.${extension}`,
      fileData: parsed.base64,
      fileType: parsed.fileType,
      uploadedAt: new Date().toISOString(),
      storedInMemory: true,
    });

    return fileRef;
  }

  private sanitizeLargeValueInternal(value: any, ownerKey: string, path: string[] = []): SanitizeResult {
    if (typeof value === 'string') {
      const parsed = this.parseDataImage(value);
      if (!parsed) return { value, changed: false };

      return {
        value: this.storeDataImageAsFile(value, ownerKey, path),
        changed: true,
      };
    }

    if (Array.isArray(value)) {
      let changed = false;
      const next = value.map((item, index) => {
        const result = this.sanitizeLargeValueInternal(item, ownerKey, [...path, String(index)]);
        changed = changed || result.changed;
        return result.value;
      });

      return changed ? { value: next, changed: true } : { value, changed: false };
    }

    if (value && typeof value === 'object') {
      let changed = false;
      const next: Record<string, any> = {};

      Object.entries(value).forEach(([childKey, childValue]) => {
        const result = this.sanitizeLargeValueInternal(childValue, ownerKey, [...path, childKey]);
        changed = changed || result.changed;
        next[childKey] = result.value;
      });

      return changed ? { value: next, changed: true } : { value, changed: false };
    }

    return { value, changed: false };
  }

  sanitizeLargeValue(value: any, ownerKey: string) {
    return this.sanitizeLargeValueInternal(value, ownerKey).value;
  }

  private migrateInlineImagesFromMetadata() {
    let migrated = false;

    for (const [key, value] of Array.from(this.store.entries())) {
      if (key.startsWith('file:') || key.startsWith('pipeline:')) continue;

      const result = this.sanitizeLargeValueInternal(value, key);
      if (result.changed) {
        this.store.set(key, result.value);
        migrated = true;
      }
    }

    return migrated;
  }

  private getPersistableEntries() {
    const entries: [string, any][] = [];

    for (const [key, value] of Array.from(this.store.entries())) {
      if (key.startsWith('file:') || key.startsWith('pipeline:')) continue;

      const result = this.sanitizeLargeValueInternal(value, key);
      if (result.changed) {
        this.store.set(key, result.value);
      }
      entries.push([key, result.value]);
    }

    return entries;
  }

  private isQuotaError(error: any) {
    return (
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014
    );
  }

  private persist() {
    let serialized = '';

    try {
      serialized = JSON.stringify(this.getPersistableEntries());
      localStorage.setItem(STORE_KEY, serialized);
      void this.warnIfStorageLow();
    } catch (e: any) {
      console.error('[MemoryStore] Failed to persist to localStorage:', e);
      if (this.isQuotaError(e)) {
        this.handleQuotaExceeded(serialized);
      }
    }
  }

  private handleQuotaExceeded(serialized: string) {
    this.dispatchStorageWarning('Browser storage is almost full. Reports and login data were kept while temporary image cache cleanup runs.');

    void this.cleanupUnreferencedFileEntries().then(() => {
      try {
        localStorage.setItem(STORE_KEY, serialized);
      } catch (retryError) {
        console.error('[MemoryStore] Retry after file cleanup still failed:', retryError);
        this.dispatchStorageWarning('Browser storage is still low. Existing reports were not cleared, but please delete old reports before uploading more ECGs.');
      }
    });
  }

  private addFileReference(references: Set<string>, fileRef?: string | null) {
    if (!fileRef || typeof fileRef !== 'string') return;
    if (
      fileRef.startsWith('data:') ||
      fileRef.startsWith('http://') ||
      fileRef.startsWith('https://') ||
      fileRef.startsWith('blob:')
    ) {
      return;
    }

    if (fileRef.startsWith('file:')) {
      references.add(fileRef);
      return;
    }

    if (fileRef.startsWith('pipeline/') || fileRef.includes('/')) {
      references.add(`file:${fileRef}`);
    }
  }

  private collectFileReferences(value: any, references: Set<string>) {
    if (!value) return;

    if (typeof value === 'string') {
      this.addFileReference(references, value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => this.collectFileReferences(item, references));
      return;
    }

    if (typeof value === 'object') {
      Object.values(value).forEach((item) => this.collectFileReferences(item, references));
    }
  }

  private collectReferencedFileKeys() {
    const references = new Set<string>();

    for (const [key, value] of this.store.entries()) {
      if (!key.startsWith('ecg:') || !value) continue;

      this.addFileReference(references, value.file_path);
      this.collectFileReferences(value.pipeline_images, references);
      this.collectFileReferences(value.explainability, references);
    }

    return references;
  }

  async cleanupUnreferencedFileEntries() {
    const references = this.collectReferencedFileKeys();
    const fileKeys = Array.from(this.store.keys()).filter((key) => key.startsWith('file:'));
    const unreferencedKeys = fileKeys.filter((key) => !references.has(key));

    unreferencedKeys.forEach((key) => {
      this.store.delete(key);
      void this.deleteFileFromIndexedDb(key);
    });

    if (unreferencedKeys.length > 0) {
      console.log('[MemoryStore] Cleaned up', unreferencedKeys.length, 'unreferenced cached image files');
    }
  }

  private dispatchStorageWarning(message: string) {
    console.warn('[MemoryStore]', message);
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent(STORAGE_WARNING_EVENT, {
      detail: { message },
    }));
  }

  private async warnIfStorageLow() {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return;

    const now = Date.now();
    if (now - this.lastStorageEstimateAt < STORAGE_ESTIMATE_INTERVAL_MS) return;
    this.lastStorageEstimateAt = now;

    try {
      const estimate = await navigator.storage.estimate();
      if (!estimate.quota || !estimate.usage) return;

      const usageRatio = estimate.usage / estimate.quota;
      if (usageRatio >= STORAGE_WARNING_RATIO && !this.storageWarningShown) {
        this.storageWarningShown = true;
        this.dispatchStorageWarning('Browser storage is getting full. Report records are preserved, but consider deleting old reports if uploads slow down.');
      }
    } catch (error) {
      console.warn('[MemoryStore] Storage estimate unavailable:', error);
    }
  }

  resolveImageSource(imageRef?: string | null, fallbackType = 'image/png') {
    if (!imageRef || typeof imageRef !== 'string') return '';
    if (
      imageRef.startsWith('data:') ||
      imageRef.startsWith('http://') ||
      imageRef.startsWith('https://') ||
      imageRef.startsWith('blob:')
    ) {
      return imageRef;
    }

    const storageKey = imageRef.startsWith('file:') ? imageRef : `file:${imageRef}`;
    const cachedImage = this.store.get(storageKey);
    if (cachedImage?.fileData) {
      return `data:${cachedImage.fileType || fallbackType};base64,${cachedImage.fileData}`;
    }

    return imageRef;
  }

  resolveImageTree<T>(value: T): T {
    if (typeof value === 'string') {
      return this.resolveImageSource(value) as T;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveImageTree(item)) as T;
    }

    if (value && typeof value === 'object') {
      const resolved: Record<string, any> = {};
      Object.entries(value).forEach(([key, item]) => {
        resolved[key] = this.resolveImageTree(item);
      });
      return resolved as T;
    }

    return value;
  }

  set(key: string, value: any) {
    if (key.startsWith('file:')) {
      this.storeFile(key, value);
      return;
    }

    const sanitizedValue = this.sanitizeLargeValue(value, key);
    console.log('[MemoryStore] SET', key, '=', sanitizedValue);
    this.store.set(key, sanitizedValue);
    this.persist();
  }

  get(key: string) {
    const value = this.store.get(key) || null;
    if (key.startsWith('file:')) {
      const displayKey = key.length > 120 ? `${key.slice(0, 120)}...` : key;
      console.log('[MemoryStore] GET', displayKey, '=', value ? '[file cached]' : null);
    } else {
      console.log('[MemoryStore] GET', key, '=', value);
    }
    return value;
  }

  getByPrefix(prefix: string) {
    const results: any[] = [];
    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        results.push(value);
      }
    }
    console.log('[MemoryStore] GET_BY_PREFIX', prefix, '= found', results.length, 'items');
    return results;
  }

  delete(key: string) {
    console.log('[MemoryStore] DELETE', key);
    this.store.delete(key);

    if (key.startsWith('file:')) {
      void this.deleteFileFromIndexedDb(key);
      return;
    }

    this.persist();
  }

  has(key: string) {
    const exists = this.store.has(key);
    console.log('[MemoryStore] HAS', key, '=', exists);
    return exists;
  }

  keys() {
    return Array.from(this.store.keys());
  }
}

export const memoryStore = new MemoryStore();

// Initialize storage bucket if needed
export const initializeStorage = async () => {
  try {
    const bucketName = 'make-39210185-ecg-files';
    
    // Check if bucket exists - wrapped in additional try-catch for safety
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        // Try to create bucket
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 52428800, // 50MB
        });
        
        if (error) {
          // Silent warning - bucket creation failed but app continues
          console.warn('[Storage] Bucket creation skipped (RLS policy) - using fallback storage');
          return; // Exit gracefully
        } else {
          console.log('[Storage] Bucket created successfully');
        }
      } else {
        console.log('[Storage] Bucket already exists');
      }
    } catch (bucketError) {
      // Catch any bucket-related errors and continue silently
      console.warn('[Storage] Bucket check/creation skipped:', bucketError);
    }
  } catch (error) {
    // Outer catch to ensure no errors escape
    console.warn('[Storage] Initialization skipped:', error);
  }
};
