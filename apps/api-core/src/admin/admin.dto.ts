import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsUUID, Matches, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { WILAYAS } from '@withyou/shared-utils';

export class BrandChecksDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  checks: string[];
}

export class RejectDto {
  /** Message affiché à la marque dans son espace : obligatoire pour demander des corrections. */
  @IsString()
  @MinLength(5, { message: 'Écrivez le message à la marque.' })
  @MaxLength(1000)
  message: string;
}

export class UpdateBrandDto {
  /** Chargé de compte : un id d'admin, ou null pour retirer l'assignation. */
  @IsOptional()
  @IsUUID()
  accountManagerId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(40)
  commissionRate?: number;

  /** Applique aussi la nouvelle commission à tous les produits existants de la marque. */
  @IsOptional()
  @IsBoolean()
  applyToProducts?: boolean;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  suspendedReason?: string;
}

export class CarrierDto {
  @IsString()
  @MinLength(2, { message: 'Indiquez le nom du service de livraison.' })
  @MaxLength(80)
  nom: string;

  /** Vide = les 58 wilayas. */
  @IsArray()
  @ArrayMaxSize(58)
  @IsIn(WILAYAS as string[], { each: true, message: 'Wilaya inconnue.' })
  wilayas: string[];

  @IsNumber()
  @Min(0)
  @Max(100000)
  coutColis: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  delaiJours?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string | null;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  email?: string | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

/** Motifs de réclamation proposés dans la console. */
export const TICKET_MOTIFS = [
  'Colis immobile',
  'Retard de livraison',
  'Nouvelle tentative de livraison',
  'Colis abîmé',
  'Colis perdu',
  'Autre',
] as const;

export class OpenTicketDto {
  @IsUUID()
  orderId: string;

  @IsIn(TICKET_MOTIFS as unknown as string[], { message: 'Motif inconnu.' })
  motif: string;

  @IsString()
  @MinLength(5, { message: 'Écrivez le message au transporteur.' })
  @MaxLength(2000)
  message: string;
}

export class TicketReplyDto {
  @IsString()
  @MinLength(2, { message: 'Notez la réponse du transporteur.' })
  @MaxLength(2000)
  reponse: string;
}

/** Banques proposées pour le RIB de la marque (« Autre » permet un nom libre). */
export const BANQUES = [
  'BNA – Banque Nationale d’Algérie',
  'BEA – Banque Extérieure d’Algérie',
  'CPA – Crédit Populaire d’Algérie',
  'BADR – Banque de l’Agriculture et du Développement Rural',
  'BDL – Banque de Développement Local',
  'CNEP-Banque',
  'Algérie Poste (CCP)',
  'AGB – Gulf Bank Algeria',
  'Al Baraka Banque Algérie',
  'Al Salam Bank Algeria',
  'BNP Paribas El Djazaïr',
  'Société Générale Algérie',
  'Natixis Algérie',
  'Trust Bank Algeria',
  'Housing Bank',
  'Fransabank Algérie',
  'Arab Bank',
  'ABC Bank',
] as const;

/** Champs vides = non renseignés (null). Formats des identifiants algériens. */
export class BrandLegalDto {
  @IsOptional()
  @Matches(/^\d{15,20}$/, { message: 'Le NIF doit contenir 15 à 20 chiffres.' })
  nif?: string | null;

  @IsOptional()
  @Matches(/^\d{15}$/, { message: 'Le NIS doit contenir 15 chiffres.' })
  nis?: string | null;

  @IsOptional()
  // Tel qu'écrit sur l'extrait : « N° 16/00-1234567 B 20 », « 16.00.1234567B20 »…
  @Matches(/^[\p{L}0-9 /.°\-]{4,40}$/u, { message: 'Numéro de RC invalide (4 à 40 caractères : lettres, chiffres, espaces, / . - °).' })
  rc?: string | null;

  @IsOptional()
  @Matches(/^\d{11}$/, { message: "L'article d'imposition doit contenir 11 chiffres." })
  articleImposition?: string | null;

  @IsOptional()
  @Matches(/^\d{20}$/, { message: 'Le RIB doit contenir 20 chiffres.' })
  rib?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  banque?: string | null;
}

export class ProductCommissionDto {
  @IsNumber()
  @Min(0)
  @Max(40)
  commission: number;
}
