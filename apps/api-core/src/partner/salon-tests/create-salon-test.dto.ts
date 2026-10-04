import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSalonTestDto {
  @IsUUID()
  produitId: string;

  @IsInt()
  echantillons: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  wilaya?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  question?: string;
}
