import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsUUID, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

// 6 chiffres, ou 8 avec l'opacité en fin (#RRGGBBAA).
const HEX_PATTERN = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export class FounderDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(120)
  role: string;

  // Sans ce champ, la validation (whitelist) retirerait la photo à l'enregistrement.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string | null;
}

export class BrandNeedDto {
  @IsString()
  @MaxLength(60)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;
}

export class UpdateBrandDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  since?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  cityLat?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  cityLng?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  story?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  origin?: string;

  @IsOptional()
  @Matches(HEX_PATTERN, { message: 'bgColor doit être une couleur hex, ex. #FAFCFD (ou #FAFCFDCC avec opacité).' })
  bgColor?: string;

  @IsOptional()
  @Matches(HEX_PATTERN, { message: 'textColor doit être une couleur hex, ex. #1F2B24 (ou #1F2B24CC avec opacité).' })
  textColor?: string;

  @IsOptional()
  @Matches(HEX_PATTERN, { message: 'accentColor doit être une couleur hex, ex. #173A24 (ou #173A24CC avec opacité).' })
  accentColor?: string;

  @IsOptional()
  @Matches(HEX_PATTERN, { message: 'cardColor doit être une couleur hex, ex. #FFFFFF (ou #FFFFFFCC avec opacité).' })
  cardColor?: string;

  @IsOptional()
  @IsIn(['serif', 'sans'])
  titleFont?: 'serif' | 'sans';

  @IsOptional()
  @IsString()
  coverUrl?: string | null;

  /** Image fournie avec une couverture vidéo (mauvaise connexion, « Marques du jour »). */
  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  audioUrl?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FounderDto)
  founders?: FounderDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  // Engagements libres possibles en plus de la liste proposée : on borne la longueur.
  @MaxLength(60, { each: true })
  commitments?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => BrandNeedDto)
  needs?: BrandNeedDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  featuredProductIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUUID('all', { each: true })
  featuredReviewIds?: string[];
}
