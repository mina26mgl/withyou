import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProduitDto {
  @IsString()
  nom: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsNumber()
  @Min(0)
  prix: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsString()
  categorieId: string;

  @IsArray()
  @IsString({ each: true })
  modesConservation: string[];

  @IsNumber()
  @Min(0)
  comissionNegocie: number;
}