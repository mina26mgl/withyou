import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const ADMIN_ROLES = ['OWNER', 'OPERATIONS'] as const;

export class AdminProfileDto {
  @IsString()
  @MinLength(1, { message: 'Indiquez votre prénom.' })
  @MaxLength(60)
  prenom: string;

  @IsString()
  @MaxLength(60)
  nom: string;

  /** Numéro algérien ou international, espaces autorisés. Vide = pas de numéro. */
  @IsOptional()
  @Matches(/^(\+?[0-9 ]{9,17})?$/, { message: 'Numéro de téléphone invalide (ex. 0550 12 34 56).' })
  telephone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  poste?: string | null;
}

export class AdminInvitationDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(160)
  email: string;

  @IsString()
  @MinLength(1, { message: 'Indiquez le prénom.' })
  @MaxLength(60)
  prenom: string;

  @IsString()
  @MaxLength(60)
  nom: string;

  @IsIn(ADMIN_ROLES as unknown as string[], { message: 'Rôle inconnu.' })
  roleAdmin: (typeof ADMIN_ROLES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  poste?: string | null;
}

export class AdminMemberAccessDto {
  @IsOptional()
  @IsIn(ADMIN_ROLES as unknown as string[], { message: 'Rôle inconnu.' })
  roleAdmin?: (typeof ADMIN_ROLES)[number];

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
