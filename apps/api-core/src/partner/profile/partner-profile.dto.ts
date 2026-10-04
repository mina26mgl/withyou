import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PARTNER_ROLES = ['OWNER', 'MEMBER'] as const;

export class PartnerProfileDto {
  @IsString()
  @MinLength(1, { message: 'Indiquez votre prénom.' })
  @MaxLength(60)
  prenom: string;

  @IsString()
  @MaxLength(60)
  nom: string;

  /** Vide = pas de numéro. */
  @IsOptional()
  @Matches(/^(\+?[0-9 ]{9,17})?$/, { message: 'Numéro de téléphone invalide (ex. 0550 12 34 56).' })
  telephone?: string | null;

  @IsString()
  @MinLength(2, { message: 'Indiquez votre poste dans la marque.' })
  @MaxLength(80)
  poste: string;
}

export class PartnerInvitationDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(80)
  poste?: string | null;

  @IsIn(PARTNER_ROLES as unknown as string[], { message: 'Rôle inconnu.' })
  role: (typeof PARTNER_ROLES)[number];
}

export class PartnerMemberRoleDto {
  @IsIn(PARTNER_ROLES as unknown as string[], { message: 'Rôle inconnu.' })
  role: (typeof PARTNER_ROLES)[number];
}
