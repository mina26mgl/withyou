import { createHash } from 'crypto';
import { extname } from 'path';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { StorageService } from './storage.service';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
// Cloudinary range l'audio avec la vidéo.
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mp3', '.m4a', '.aac', '.ogg', '.oga', '.opus']);
const FOLDER = 'withyou';

type ResourceType = 'image' | 'video' | 'raw';

/**
 * Stockage Cloudinary, activé quand CLOUDINARY_URL est défini
 * (cloudinary://API_KEY:API_SECRET@CLOUD_NAME, copié depuis le dashboard).
 * Les fichiers survivent aux redéploiements, contrairement au disque local.
 */
@Injectable()
export class CloudinaryStorageService implements StorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly cloudName: string;

  constructor(cloudinaryUrl: string) {
    const url = new URL(cloudinaryUrl);
    this.apiKey = decodeURIComponent(url.username);
    this.apiSecret = decodeURIComponent(url.password);
    this.cloudName = url.hostname;
  }

  async save(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const { resourceType, publicId } = this.locate(key);
    const form = this.signedForm({ public_id: publicId });
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), key.split('/').pop());

    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      this.logger.error(`Envoi Cloudinary refusé (${res.status}): ${await res.text()}`);
      throw new InternalServerErrorException("L'envoi du fichier a échoué. Réessayez dans un instant.");
    }
    const { secure_url: secureUrl } = (await res.json()) as { secure_url: string };
    return secureUrl;
  }

  async delete(key: string): Promise<void> {
    const { resourceType, publicId } = this.locate(key);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/destroy`, {
      method: 'POST',
      body: this.signedForm({ public_id: publicId }),
    });
    if (!res.ok) {
      this.logger.warn(`Suppression Cloudinary refusée (${res.status}) pour ${publicId}`);
    }
  }

  /** Images et vidéos : Cloudinary ajoute l'extension lui-même ; les autres fichiers la gardent dans leur identifiant. */
  private locate(key: string): { resourceType: ResourceType; publicId: string } {
    const ext = extname(key).toLowerCase();
    const resourceType: ResourceType = IMAGE_EXTENSIONS.has(ext) ? 'image' : VIDEO_EXTENSIONS.has(ext) ? 'video' : 'raw';
    const path = resourceType === 'raw' ? key : key.slice(0, key.length - ext.length);
    return { resourceType, publicId: `${FOLDER}/${path}` };
  }

  /** Signature Cloudinary : SHA-1 des paramètres triés, suivis du secret. */
  private signedForm(params: Record<string, string>): FormData {
    const signed: Record<string, string> = { ...params, timestamp: String(Math.floor(Date.now() / 1000)) };
    const toSign = Object.keys(signed)
      .sort()
      .map((name) => `${name}=${signed[name]}`)
      .join('&');
    const signature = createHash('sha1').update(toSign + this.apiSecret).digest('hex');

    const form = new FormData();
    for (const [name, value] of Object.entries(signed)) form.append(name, value);
    form.append('api_key', this.apiKey);
    form.append('signature', signature);
    return form;
  }
}
