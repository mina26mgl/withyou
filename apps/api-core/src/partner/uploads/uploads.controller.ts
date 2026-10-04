import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { STORAGE_SERVICE, StorageService } from '../../storage/storage.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
// Documents produit : PDF, images (scan ou photo d'un certificat) et Word.
const DOCUMENT_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/m4a',
  // Messages vocaux (WhatsApp, Telegram…) : OGG / Opus.
  'audio/ogg',
  'audio/opus',
  'application/ogg',
]);
// Certains navigateurs (surtout sous Windows) envoient un .ogg/.opus sans type précis :
// on se fie alors à l'extension.
const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.mp4', '.aac', '.ogg', '.oga', '.opus']);
const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream']);
// Formats lus par tous les navigateurs mobiles (pas de .mov : illisible sur Android).
const VIDEO_EXTENSIONS: Record<string, string> = { 'video/mp4': '.mp4', 'video/webm': '.webm' };

type UploadKind = 'image' | 'audio' | 'video' | 'document';

@UseGuards(PartnerGuard)
@Controller('partner/uploads')
export class UploadsController {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_VIDEO_BYTES } }))
  async upload(
    @Req() req: PartnerRequest,
    @Query('kind') kind: UploadKind = 'image',
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }

    if (kind === 'image') {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException('Format d\'image non supporté (JPG, PNG ou WebP uniquement).');
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new BadRequestException('Image trop lourde (5 Mo maximum).');
      }
    } else if (kind === 'audio') {
      const ext = extname(file.originalname).toLowerCase();
      const typeOk =
        AUDIO_MIME_TYPES.has(file.mimetype) || (GENERIC_MIME_TYPES.has(file.mimetype) && AUDIO_EXTENSIONS.has(ext));
      if (!typeOk || !AUDIO_EXTENSIONS.has(ext)) {
        throw new BadRequestException('Format audio non supporté (MP3, M4A ou OGG uniquement).');
      }
      if (file.size > MAX_AUDIO_BYTES) {
        throw new BadRequestException('Fichier audio trop lourd (2 Mo maximum).');
      }
    } else if (kind === 'video') {
      if (!VIDEO_EXTENSIONS[file.mimetype]) {
        throw new BadRequestException('Format vidéo non supporté (MP4 ou WebM uniquement).');
      }
      if (file.size > MAX_VIDEO_BYTES) {
        throw new BadRequestException('Vidéo trop lourde (20 Mo maximum).');
      }
    } else if (kind === 'document') {
      if (!DOCUMENT_EXTENSIONS[file.mimetype]) {
        throw new BadRequestException('Format de document non supporté (PDF, JPG, PNG, WebP ou Word).');
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        throw new BadRequestException('Document trop lourd (10 Mo maximum).');
      }
    } else {
      throw new BadRequestException('Type de fichier inconnu.');
    }

    // Pour une vidéo, l'extension vient du type vérifié : la page cliente s'en sert
    // pour savoir qu'il faut afficher un lecteur vidéo.
    const ext =
      kind === 'video'
        ? VIDEO_EXTENSIONS[file.mimetype]
        : kind === 'document'
          ? DOCUMENT_EXTENSIONS[file.mimetype]
          : extname(file.originalname);
    const key = `${req.marqueId}/${kind}/${randomUUID()}${ext}`;
    const url = await this.storage.save(file.buffer, key, file.mimetype);
    return { url };
  }
}
