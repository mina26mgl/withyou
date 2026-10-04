import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { Injectable } from '@nestjs/common';
import type { StorageService } from './storage.service';

export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

/**
 * Dev-only implementation: writes to disk under apps/api-core/uploads and
 * serves it back via ServeStaticModule at /uploads (see StorageModule).
 * TODO(prod): replace with an S3 or Cloudinary StorageService before deploy —
 * local disk storage does not survive redeploys or scale past one instance.
 */
@Injectable()
export class LocalStorageService implements StorageService {
  async save(buffer: Buffer, key: string, _mimeType: string): Promise<string> {
    const filePath = join(UPLOAD_ROOT, key);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    const base = process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT_API_CORE ?? 3001}`;
    return `${base}/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    await fs.rm(join(UPLOAD_ROOT, key), { force: true });
  }
}
