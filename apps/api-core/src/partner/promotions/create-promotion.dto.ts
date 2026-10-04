import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @MaxLength(80)
  nom: string;

  @IsInt()
  reduction: number;

  @IsDateString()
  dateDebut: string;

  @IsDateString()
  dateFin: string;

  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  produitIds: string[];
}
