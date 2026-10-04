import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class BoxVariantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  typePeau: string;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  abonnees: number;
}

export class BoxDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mois invalide (AAAA-MM).' })
  mois?: string;

  @IsString()
  @MinLength(2, { message: 'Indiquez le nom de la box.' })
  @MaxLength(80)
  nom: string;

  @IsISO8601({}, { message: "Date d'assemblage invalide." })
  dateAssemblage: string;

  @IsISO8601({}, { message: "Date d'expédition invalide." })
  dateExpedition: string;

  @IsOptional()
  @IsIn(['PREPARATION', 'ASSEMBLEE', 'EXPEDIEE'])
  statut?: 'PREPARATION' | 'ASSEMBLEE' | 'EXPEDIEE';

  @IsArray()
  @ArrayMinSize(1, { message: 'Ajoutez au moins une variante.' })
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BoxVariantDto)
  variantes: BoxVariantDto[];
}

export class BoxItemDto {
  @IsOptional()
  @IsUUID()
  idProduit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  marque?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Choisissez au moins une variante.' })
  @IsString({ each: true })
  variantes: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  quantiteConfirmee?: number;

  @IsOptional()
  @IsBoolean()
  marqueARepondu?: boolean;
}
