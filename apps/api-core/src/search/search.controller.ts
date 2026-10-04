import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL ?? 'http://localhost:8000';

interface ProduitHit {
  id: string;
  nom: string;
  score: number;
}

@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('semantic')
  async semanticSearch(@Body() body: { query: string; limit?: number }) {
    const res = await fetch(`${AI_API_URL}/search/semantic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const { results: hits } = (await res.json()) as { results: ProduitHit[] };

    const produits = await this.prisma.produit.findMany({
      where: { id_product: { in: hits.map((hit) => hit.id) } },
    });
    const produitsById = new Map(produits.map((produit) => [produit.id_product, produit]));

    return hits.map((hit) => produitsById.get(hit.id)).filter((produit) => produit !== undefined);
  }
}
