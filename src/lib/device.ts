/**
 * Identitas perangkat stabil untuk Single-Device Session Locking.
 * Disimpan di localStorage agar UNLOCK saat logout membawa deviceId
 * yang sama dengan yang dipakai saat klaim lock (verifyTablePinAction).
 */
const DEVICE_ID_STORAGE_KEY = 'siredom_device_id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  }
  return id;
}
