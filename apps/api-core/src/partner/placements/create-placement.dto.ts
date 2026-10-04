import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreatePlacementDto {
  @IsIn(['ROUTINE', 'HOME', 'BOX', 'INFLUENCE'])
  kind: 'ROUTINE' | 'HOME' | 'BOX' | 'INFLUENCE';

  @IsOptional()
  @IsUUID()
  produitId?: string;
}
