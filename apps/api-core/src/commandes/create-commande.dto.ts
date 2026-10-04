import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const TYPES_LIVRAISON = ['domicile', 'bureau'] as const;
/** Seul mode ouvert pour l'instant ; CIB / Edahabia arrivent plus tard. */
export const MODES_PAIEMENT = ['À la livraison'] as const;

export class LigneCommandeDto {
  @IsUUID()
  produitId!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantite!: number;
}

/** Commande passée depuis /checkout (trousse de la cliente + coordonnées de livraison). */
export class CreateCommandeDto {
  @IsString()
  @MinLength(1, { message: 'Indiquez votre nom et prénom.' })
  @MaxLength(120)
  nomComplet!: string;

  @IsString()
  @MaxLength(20)
  telephone!: string;

  @IsString()
  @MaxLength(60)
  wilaya!: string;

  @IsString()
  @MinLength(1, { message: 'Indiquez votre commune.' })
  @MaxLength(80)
  commune!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresse?: string;

  @IsIn(TYPES_LIVRAISON)
  typeLivraison!: (typeof TYPES_LIVRAISON)[number];

  @IsIn(MODES_PAIEMENT)
  modePaiement!: (typeof MODES_PAIEMENT)[number];

  @IsArray()
  @ArrayMinSize(1, { message: 'Votre trousse est vide.' })
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes!: LigneCommandeDto[];
}
