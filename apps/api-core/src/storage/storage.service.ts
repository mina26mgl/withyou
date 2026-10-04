export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

/**
 * Storage abstraction so upload callers don't depend on where files actually
 * land. Only a dev-local implementation exists today (see
 * LocalStorageService) — swap in an S3/Cloudinary implementation for
 * production and rebind STORAGE_SERVICE in StorageModule.
 */
export interface StorageService {
  /** Persists a file under `key` and returns its publicly reachable URL. */
  save(buffer: Buffer, key: string, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
}
