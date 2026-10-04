import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { memoryStorage } from 'multer';
import { AdminGuard, AdminRequest } from '../auth/admin.guard';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.service';
import { AdminInvitationDto, AdminMemberAccessDto, AdminProfileDto } from './admin-profile.dto';
import { AdminProfileService } from './admin-profile.service';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminProfileController {
  constructor(
    private readonly profile: AdminProfileService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  @Get('profil')
  page(@Req() req: AdminRequest) {
    return this.profile.page(req.adminId);
  }

  @Put('profil')
  update(@Req() req: AdminRequest, @Body() dto: AdminProfileDto) {
    return this.profile.update(req.adminId, dto);
  }

  @Post('profil/photo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_PHOTO_BYTES } }))
  async uploadPhoto(@Req() req: AdminRequest, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    const ext = PHOTO_EXT[file.mimetype];
    if (!ext) throw new BadRequestException("Format d'image non supporté (JPG, PNG ou WebP uniquement).");
    const url = await this.storage.save(file.buffer, `admins/${req.adminId}/${randomUUID()}${ext}`, file.mimetype);
    await this.profile.setPhoto(req.adminId, url);
    return { url };
  }

  @Delete('profil/photo')
  removePhoto(@Req() req: AdminRequest) {
    return this.profile.setPhoto(req.adminId, null);
  }

  @Post('acces/invitations')
  invite(@Req() req: AdminRequest, @Body() dto: AdminInvitationDto) {
    return this.profile.invite(req.adminId, dto);
  }

  @Delete('acces/invitations/:id')
  revokeInvitation(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.profile.revokeInvitation(req.adminId, id);
  }

  @Patch('acces/:adminId')
  updateMember(@Req() req: AdminRequest, @Param('adminId', ParseUUIDPipe) adminId: string, @Body() dto: AdminMemberAccessDto) {
    return this.profile.updateMember(req.adminId, adminId, dto);
  }
}
