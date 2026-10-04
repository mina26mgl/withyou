import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { memoryStorage } from 'multer';
import { ClerkAuthGuard, ClerkRequest } from '../auth/clerk-auth.guard';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.service';
import { RoutinesService } from '../routines/routines.service';
import { UpdateOnboardingDto } from './onboarding.dto';
import { UsersService } from './users.service';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_EXTENSIONS: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export type PartnerStatus = 'NONE' | 'PENDING' | 'REJECTED' | 'ACTIVE';

@UseGuards(ClerkAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly routines: RoutinesService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  private async currentUser(req: ClerkRequest) {
    const user = await this.usersService.findOrProvisionByClerkId(req.clerkUserId);
    if (!user) {
      throw new NotFoundException('Impossible de retrouver votre compte.');
    }
    return user;
  }

  /** Profil cliente de la personne connectée, créé au besoin (compte marque ou admin qui fait des achats). */
  private async currentConsumer(req: ClerkRequest) {
    const user = await this.currentUser(req);
    await this.usersService.ensureConsumer(user.id_usr);
    const consumer = await this.usersService.findConsommateurByUserId(user.id_usr);
    if (!consumer) throw new NotFoundException('Impossible de retrouver votre profil cliente.');
    return consumer;
  }

  /**
   * Also provisions the local rows when the Clerk webhook hasn't reached us —
   * the register page calls this right after sign-up.
   */
  @Get('me')
  async me(@Req() req: ClerkRequest) {
    const found = await this.usersService.findOrProvisionByClerkId(req.clerkUserId);
    if (!found) {
      throw new NotFoundException('Impossible de retrouver votre compte.');
    }
    // Une invitation à la console fait passer le compte ADMIN dès la connexion.
    const user = await this.usersService.acceptPartnerInvitation(await this.usersService.acceptAdminInvitation(found));

    const [consomateur, partenaire, demande] = await Promise.all([
      this.usersService.findConsommateurByUserId(user.id_usr),
      this.usersService.findPartenaireByUserId(user.id_usr),
      this.usersService.findDemandePartenaireByUserId(user.id_usr),
    ]);

    // A partenaire_contact is what actually grants partner access (see PartnerGuard).
    const partnerStatus: PartnerStatus = partenaire
      ? 'ACTIVE'
      : demande?.status === 'PENDING'
        ? 'PENDING'
        : demande?.status === 'REJECTED'
          ? 'REJECTED'
          : 'NONE';

    return { user, consomateur, partnerStatus, nomMarqueDemandee: demande?.nom_marque ?? null };
  }

  /**
   * Bouton « Mon espace cliente » de l'espace marque : même compte, même session,
   * on s'assure seulement que le profil cliente existe.
   */
  @Post('me/espace-cliente')
  async consumerSpace(@Req() req: ClerkRequest) {
    const user = await this.currentUser(req);
    return this.usersService.ensureConsumer(user.id_usr);
  }

  /** Une étape de l'onboarding cliente (nom, réponses du quiz de peau, fin du parcours). */
  @Patch('me/onboarding')
  async saveOnboarding(@Req() req: ClerkRequest, @Body() dto: UpdateOnboardingDto) {
    const user = await this.currentUser(req);
    return this.usersService.saveOnboarding(user.id_usr, dto);
  }

  /** Favoris (table wishlist) : identifiants des produits, du plus récent au plus ancien. */
  @Get('me/favoris')
  async favoris(@Req() req: ClerkRequest): Promise<string[]> {
    const consumer = await this.currentConsumer(req);
    return this.usersService.listFavoris(consumer.id_consumer);
  }

  @Post('me/favoris/:produitId')
  async addFavori(@Req() req: ClerkRequest, @Param('produitId', ParseUUIDPipe) produitId: string): Promise<void> {
    const consumer = await this.currentConsumer(req);
    await this.usersService.addFavori(consumer.id_consumer, produitId);
  }

  @Delete('me/favoris/:produitId')
  async removeFavori(@Req() req: ClerkRequest, @Param('produitId', ParseUUIDPipe) produitId: string): Promise<void> {
    const consumer = await this.currentConsumer(req);
    await this.usersService.removeFavori(consumer.id_consumer, produitId);
  }

  /** Ce qui fixe le titre affiché sur /profil : commandes passées et routine enregistrée. */
  @Get('me/parcours')
  async parcours(@Req() req: ClerkRequest): Promise<{ commandes: number; routineActive: boolean }> {
    const user = await this.currentUser(req);
    const consumer = await this.usersService.findConsommateurByUserId(user.id_usr);
    if (!consumer) return { commandes: 0, routineActive: false };
    const [commandes, routine] = await Promise.all([
      this.usersService.countOrders(consumer.id_consumer),
      this.routines.findActive(consumer.id_consumer),
    ]);
    return { commandes, routineActive: !!routine };
  }

  /** Routine enregistrée par la cliente (null tant qu'elle n'en a pas enregistré). */
  @Get('me/routine')
  async routine(@Req() req: ClerkRequest) {
    const user = await this.currentUser(req);
    const consumer = await this.usersService.findConsommateurByUserId(user.id_usr);
    return consumer ? this.routines.findActive(consumer.id_consumer) : null;
  }

  /**
   * Bouton « Enregistrer ma routine » de /routine : compose la routine proposée
   * (réponses au quiz + produits en ligne, même calcul que la page) et
   * l'enregistre (MongoDB) ; la routine enregistrée avant est archivée.
   */
  @Post('me/routine')
  async saveRoutine(@Req() req: ClerkRequest) {
    const user = await this.currentUser(req);
    const consumer = await this.usersService.findConsommateurByUserId(user.id_usr);
    if (!consumer?.onboarding_done) {
      throw new BadRequestException("Terminez d'abord le questionnaire de peau.");
    }
    return this.routines.generate(consumer);
  }

  @Post('me/photo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_PHOTO_BYTES } }))
  async uploadPhoto(@Req() req: ClerkRequest, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucune photo reçue.');
    }
    const ext = PHOTO_EXTENSIONS[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Format de photo non supporté (JPG, PNG ou WebP uniquement).');
    }
    const user = await this.currentUser(req);
    const url = await this.storage.save(file.buffer, `profils/${user.id_usr}/${randomUUID()}${ext}`, file.mimetype);
    await this.usersService.setProfilePhoto(user.id_usr, url);
    return { url };
  }
}
