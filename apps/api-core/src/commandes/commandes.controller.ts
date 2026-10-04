import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard, ClerkRequest } from '../auth/clerk-auth.guard';
import { CommandesService } from './commandes.service';
import { CreateCommandeDto } from './create-commande.dto';

@Controller('commandes')
export class CommandesController {
  constructor(private readonly commandesService: CommandesService) {}

  /** Page /commandes de la cliente. */
  @UseGuards(ClerkAuthGuard)
  @Get()
  findMine(@Req() req: ClerkRequest) {
    return this.commandesService.findMine(req.clerkUserId);
  }

  /** « Slide to Confirm » de /checkout. */
  @UseGuards(ClerkAuthGuard)
  @Post()
  create(@Req() req: ClerkRequest, @Body() dto: CreateCommandeDto) {
    return this.commandesService.create(req.clerkUserId, dto);
  }
}
