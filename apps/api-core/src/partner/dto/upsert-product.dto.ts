import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ProductImageDto {
  @IsString()
  url: string;

  @IsInt()
  @Min(0)
  ordre: number;

  isPrincipale: boolean;
}

/** Un produit de la marque dans un pack. */
export class PackItemDto {
  @IsUUID()
  produitId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  quantite: number;
}

export const MAX_PACK_ITEMS = 10;

export const PRODUCT_DOCUMENT_TYPES = ['FICHE_TECHNIQUE', 'CERTIFICAT', 'ANALYSE', 'AUTRE'] as const;
export const MAX_PRODUCT_DOCUMENTS = 6;

export class ProductDocumentDto {
  @IsString()
  @MaxLength(160)
  nom: string;

  /** URL renvoyée par l'envoi de fichier (partner/uploads?kind=document). */
  @IsString()
  @MaxLength(500)
  url: string;

  @IsIn(PRODUCT_DOCUMENT_TYPES as unknown as string[], { message: 'Type de document inconnu.' })
  type: (typeof PRODUCT_DOCUMENT_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  taille?: number;
}

export class UpsertProductDto {
  @IsString()
  @MaxLength(160)
  nom: string;

  /** Obligatoire pour un produit ; un pack prend la catégorie de son premier produit. */
  @IsOptional()
  @IsUUID()
  categorieId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  size?: string;

  @IsNumber()
  prix: number;

  /** Obligatoire pour un produit ; le stock d'un pack découle de celui de ses produits. */
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsString()
  @MaxLength(600)
  description: string;

  @IsArray()
  @IsString({ each: true })
  skinTypes: string[];

  /** Besoins proposés ou ajoutés par la marque. */
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  needs: string[];

  @IsOptional()
  @IsIn(['Matin', 'Soir', 'Les deux'])
  moment?: 'Matin' | 'Soir' | 'Les deux';

  /** Modes de conservation, plusieurs possibles (ex. « Au réfrigérateur », « À l'abri de la lumière… »). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  modesConservation?: string[];

  /** Durée de conservation après ouverture, en jours (10 ans au plus). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  dureeConservationJours?: number;

  /** Raw INCI text as typed in the textarea — split into ingredients[] server-side. */
  @IsOptional()
  @IsString()
  inci?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PRODUCT_DOCUMENTS, { message: `${MAX_PRODUCT_DOCUMENTS} documents au maximum.` })
  @ValidateNested({ each: true })
  @Type(() => ProductDocumentDto)
  documents?: ProductDocumentDto[];

  /** Création d'un pack (ignoré en modification : un produit ne devient pas un pack). */
  @IsOptional()
  @IsBoolean()
  isPack?: boolean;

  /** Contenu du pack : au moins 2 produits de la marque. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PACK_ITEMS, { message: `${MAX_PACK_ITEMS} produits au maximum dans un pack.` })
  @ValidateNested({ each: true })
  @Type(() => PackItemDto)
  packItems?: PackItemDto[];

  /** "draft" -> "Enregistrer le brouillon", "review" -> "Envoyer en vérification". */
  @IsIn(['draft', 'review'])
  mode: 'draft' | 'review';
}
