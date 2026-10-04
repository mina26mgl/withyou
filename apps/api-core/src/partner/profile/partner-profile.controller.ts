import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PartnerGuard, PartnerRequest } from '../../auth/partner.guard';
import { PartnerInvitationDto, PartnerMemberRoleDto, PartnerProfileDto } from './partner-profile.dto';
import { PartnerProfileService } from './partner-profile.service';

@UseGuards(PartnerGuard)
@Controller('partner')
export class PartnerProfileController {
  constructor(private readonly profile: PartnerProfileService) {}

  @Get('profil')
  page(@Req() req: PartnerRequest) {
    return this.profile.page(req.marqueId, req.partenaireId);
  }

  @Put('profil')
  update(@Req() req: PartnerRequest, @Body() dto: PartnerProfileDto) {
    return this.profile.update(req.partenaireId, dto);
  }

  /** Appelé après un changement d'adresse vérifié dans Clerk. */
  @Post('profil/email')
  syncEmail(@Req() req: PartnerRequest) {
    return this.profile.syncEmail(req.clerkUserId);
  }

  @Post('equipe/invitations')
  invite(@Req() req: PartnerRequest, @Body() dto: PartnerInvitationDto) {
    return this.profile.invite(req.marqueId, req.partenaireId, dto);
  }

  @Delete('equipe/invitations/:id')
  revoke(@Req() req: PartnerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.profile.revokeInvitation(req.marqueId, req.partenaireId, id);
  }

  @Patch('equipe/:id')
  setRole(@Req() req: PartnerRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PartnerMemberRoleDto) {
    return this.profile.setRole(req.marqueId, req.partenaireId, id, dto);
  }

  @Delete('equipe/:id')
  remove(@Req() req: PartnerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.profile.remove(req.marqueId, req.partenaireId, id);
  }
}
