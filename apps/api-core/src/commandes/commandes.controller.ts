import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommandesService } from './commandes.service';

@UseGuards(AuthGuard('jwt'))
@Controller('commandes')
export class CommandesController {
  constructor(private readonly commandesService: CommandesService) {}

  @Get()
  findMine(@Req() req: { user: { userId: string } }) {
    return this.commandesService.findByUserId(req.user.userId);
  }
}
