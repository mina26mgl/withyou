import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class RequestSubscriptionDto {
  @IsUUID()
  offreId: string;

  @IsIn(['MENSUEL', 'ANNUEL'])
  periode: 'MENSUEL' | 'ANNUEL';
}

export class OfferDto {
  @IsString()
  @MinLength(2, { message: "Indiquez le nom de l'offre." })
  @MaxLength(80)
  nom: string;

  @IsString()
  @MaxLength(400)
  description: string;

  @IsOptional()
  @IsIn(['ANALYTICS', 'PROMOTION'])
  fonctionnalite: 'ANALYTICS' | 'PROMOTION' | null;

  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  prixMensuel: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  prixAnnuel: number | null;

  @IsBoolean()
  actif: boolean;
}

export class SubscriptionMessageDto {
  @IsString()
  @MinLength(5, { message: 'Écrivez le motif à la marque.' })
  @MaxLength(500)
  message: string;
}
