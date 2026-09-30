import { BKUTransaction, BukuBankTransaction, SchoolProfile } from '../types';

const DB_NAME = 'RevitalisasiSekolahDB';
const DB_VERSION = 1;

const STORES = {
  BKU: 'bku_transactions',
  BANK: 'bank_transactions',
  SETTINGS: 'app_settings',
} as const;

/**
 * Membuka koneksi ke browser IndexedDB lokal
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB tidak didukung pada lingkungan ini.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Object store untuk BKU
      if (!db.objectStoreNames.contains(STORES.BKU)) {
        db.createObjectStore(STORES.BKU, { keyPath: 'id' });
      }

      // Object store untuk Buku Bank
      if (!db.objectStoreNames.contains(STORES.BANK)) {
        db.createObjectStore(STORES.BANK, { keyPath: 'id' });
      }

      // Object store untuk Profil & Pengaturan
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Gagal membuka IndexedDB'));
    };
  });
}

/**
 * Simpan seluruh transaksi BKU ke IndexedDB lokal
 */
export async function saveBKUToIndexedDB(data: BKUTransaction[]): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BKU, 'readwrite');
      const store = tx.objectStore(STORES.BKU);
      store.clear(); // Bersihkan lalu simpan versi terkini
      data.forEach((item) => store.put(item));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Peringatan IndexedDB BKU:', err);
  }
}

/**
 * Ambil seluruh transaksi BKU dari IndexedDB lokal
 */
export async function getBKUFromIndexedDB(): Promise<BKUTransaction[] | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.BKU, 'readonly');
      const store = tx.objectStore(STORES.BKU);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result;
        resolve(result && result.length > 0 ? (result as BKUTransaction[]) : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Peringatan membaca IndexedDB BKU:', err);
    return null;
  }
}

/**
 * Simpan seluruh transaksi Buku Bank ke IndexedDB lokal
 */
export async function saveBankToIndexedDB(data: BukuBankTransaction[]): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BANK, 'readwrite');
      const store = tx.objectStore(STORES.BANK);
      store.clear();
      data.forEach((item) => store.put(item));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Peringatan IndexedDB Bank:', err);
  }
}

/**
 * Ambil seluruh transaksi Buku Bank dari IndexedDB lokal
 */
export async function getBankFromIndexedDB(): Promise<BukuBankTransaction[] | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.BANK, 'readonly');
      const store = tx.objectStore(STORES.BANK);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result;
        resolve(result && result.length > 0 ? (result as BukuBankTransaction[]) : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Peringatan membaca IndexedDB Bank:', err);
    return null;
  }
}

/**
 * Simpan profil sekolah & SK ke IndexedDB lokal
 */
export async function saveProfileToIndexedDB(profile: SchoolProfile): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      store.put({ key: 'school_profile', data: profile });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Peringatan IndexedDB Profile:', err);
  }
}

/**
 * Ambil profil sekolah & SK dari IndexedDB lokal
 */
export async function getProfileFromIndexedDB(): Promise<SchoolProfile | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.get('school_profile');

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.data ? (result.data as SchoolProfile) : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Peringatan membaca IndexedDB Profile:', err);
    return null;
  }
}

/**
 * Bersihkan seluruh data IndexedDB lokal (saat reset data)
 */
export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction([STORES.BKU, STORES.BANK, STORES.SETTINGS], 'readwrite');
    tx.objectStore(STORES.BKU).clear();
    tx.objectStore(STORES.BANK).clear();
    tx.objectStore(STORES.SETTINGS).clear();
  } catch (err) {
    console.warn('Gagal membersihkan IndexedDB:', err);
  }
}
