import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { WILAYAS } from '@withyou/shared-utils';

export class SalonDto {
  @IsString()
  @MinLength(2, { message: 'Indiquez le nom du salon.' })
  @MaxLength(80)
  nom: string;

  @IsString()
  @MaxLength(60)
  type: string;

  @IsIn(WILAYAS as string[], { message: 'Wilaya inconnue.' })
  wilaya: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ville: string | null;

  /** Vide : généré à partir du nom. */
  @IsOptional()
  @Matches(/^[A-Z0-9]{3,20}$/, { message: 'Le code partenaire : 3 à 20 lettres majuscules ou chiffres (ex. LUMIERE10).' })
  code: string | null;

  @IsBoolean()
  formee: boolean;

  @IsBoolean()
  active: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone: string | null;
}

export class SpecialistDto {
  @IsIn(['EXPERT', 'CREATRICE'])
  categorie: 'EXPERT' | 'CREATRICE';

  @IsString()
  @MinLength(1, { message: 'Indiquez le prénom.' })
  @MaxLength(60)
  prenom: string;

  @IsString()
  @MaxLength(60)
  nom: string;

  @IsString()
  @MinLength(2, { message: 'Indiquez le métier ou le type de contenu.' })
  @MaxLength(80)
  role: string;

  @IsIn(WILAYAS as string[], { message: 'Wilaya inconnue.' })
  wilaya: string;

  @IsString()
  @MaxLength(400)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  disponibilites: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  audience: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reseau: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone: string | null;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  email: string | null;

  @IsBoolean()
  actif: boolean;
}
