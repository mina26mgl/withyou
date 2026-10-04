import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
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
import type { BrandDocumentType } from '@withyou/shared-types';
import { ClerkAuthGuard, ClerkRequest } from '../auth/clerk-auth.guard';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { BRAND_DOCUMENT_TYPES } from './brand-checklist';
import { BrandRequestService } from './brand-request.service';

const MAX_BYTES = 15 * 1024 * 1024;
// PDF, photos ou scans, et fichiers bureautiques pour le catalogue.
const EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

/** Dossier d'inscription de la marque connectée (avant l'ouverture de son espace). */
@UseGuards(ClerkAuthGuard)
@Controller('demande-marque')
export class BrandRequestController {
  constructor(
    private readonly requests: BrandRequestService,
    private readonly users: UsersService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  private async userId(req: ClerkRequest) {
    const user = await this.users.findOrProvisionByClerkId(req.clerkUserId);
    if (!user) throw new ForbiddenException('Impossible de retrouver votre compte.');
    return user.id_usr;
  }

  @Get()
  async state(@Req() req: ClerkRequest) {
    return this.requests.state(await this.userId(req));
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_BYTES } }))
  async upload(@Req() req: ClerkRequest, @Query('type') type: string, @UploadedFile() file?: Express.Multer.File) {
    if (!(BRAND_DOCUMENT_TYPES as readonly string[]).includes(type)) throw new BadRequestException('Type de document inconnu.');
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    const ext = EXTENSIONS[file.mimetype];
    if (!ext) throw new BadRequestException('Format non supporté (PDF, image, Word ou Excel).');
    const idUsr = await this.userId(req);
    const state = await this.requests.state(idUsr);
    const url = await this.storage.save(file.buffer, `demandes/${state.id}/${randomUUID()}${ext}`, file.mimetype);
    return this.requests.addDocument(idUsr, {
      type: type as BrandDocumentType,
      nom: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      url,
      taille: file.size,
    });
  }

  @Delete('documents/:id')
  async remove(@Req() req: ClerkRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.removeDocument(await this.userId(req), id);
  }

  @Post('envoyer')
  async submit(@Req() req: ClerkRequest) {
    return this.requests.submit(await this.userId(req));
  }
}
