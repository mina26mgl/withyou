import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const PUBLIC_EVENT_TYPES = ['PAGE_VIEW', 'PRODUCT_OPEN', 'PRODUCT_KEPT', 'SEARCH'] as const;
export type PublicEventType = (typeof PUBLIC_EVENT_TYPES)[number];

export class CreateEventDto {
  @IsIn(PUBLIC_EVENT_TYPES as unknown as string[])
  type: PublicEventType;

  /** Brand page slug — used for PAGE_VIEW. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  /** Product id — the brand is resolved from the product. */
  @IsOptional()
  @IsUUID()
  produitId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  query?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  skinType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  wilaya?: string;
}
