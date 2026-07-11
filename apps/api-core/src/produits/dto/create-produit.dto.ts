import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProduitDto {
  @IsString()
  nom: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  ingredients?: string;

  @IsNumber()
  @Min(0)
  prix: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagesUrls?: string[];

  @IsOptional()
  @IsString()
  categorieId?: string;
}
