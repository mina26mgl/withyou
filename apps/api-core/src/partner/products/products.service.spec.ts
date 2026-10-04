import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from './products.service';
import { UpsertProductDto } from '../dto/upsert-product.dto';

/**
 * Integration test against the local dev Postgres (DATABASE_URL in .env) —
 * this repo has no separate test database configured yet. Creates its own
 * throwaway marques/products and cleans them up in afterAll.
 */
describe('ProductsService — cross-marque isolation', () => {
  let prisma: PrismaService;
  let service: ProductsService;
  let categorieId: string;

  const marqueAId = randomUUID();
  const marqueBId = randomUUID();
  let productBId: string;

  const baseDto: UpsertProductDto = {
    nom: 'Produit de test',
    categorieId: '',
    prix: 1000,
    stock: 5,
    description: 'Description de test',
    skinTypes: ['Mixte'],
    needs: ['Hydratation'],
    mode: 'draft',
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    service = new ProductsService(prisma);

    const categorie = await prisma.categorie.findFirstOrThrow();
    categorieId = categorie.id_cat;
    baseDto.categorieId = categorieId;

    await prisma.marque.createMany({
      data: [marqueAId, marqueBId].map((id, i) => ({
        id_marque: id,
        nom_marque: `Marque test ${i}`,
        slug: `marque-test-${id}`,
        date_creation: new Date('2024-01-01'),
        adresse: 'Adresse test',
        engagement: [],
        besoin: [],
        wilaya_marque: 'Alger',
        histoire_marque: 'Histoire test',
      })),
    });

    const productB = await service.create(marqueBId, { ...baseDto, nom: 'Produit de la marque B' });
    productBId = productB.id;
  });

  afterAll(async () => {
    await prisma.produit_image.deleteMany({ where: { produit: { id_marque: { in: [marqueAId, marqueBId] } } } });
    await prisma.produit.deleteMany({ where: { id_marque: { in: [marqueAId, marqueBId] } } });
    await prisma.marque.deleteMany({ where: { id_marque: { in: [marqueAId, marqueBId] } } });
    await prisma.onModuleDestroy();
  });

  it('does not let marque A read a product that belongs to marque B', async () => {
    await expect(service.findOne(marqueAId, productBId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not let marque A update a product that belongs to marque B', async () => {
    await expect(
      service.update(marqueAId, productBId, { ...baseDto, nom: 'Modifié par A' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const stillOwnedByB = await service.findOne(marqueBId, productBId);
    expect(stillOwnedByB.nom).toBe('Produit de la marque B');
  });

  it('does not list marque B\'s products when fetching marque A\'s catalogue', async () => {
    const marqueAProducts = await service.findAll(marqueAId);
    expect(marqueAProducts.find((p) => p.id === productBId)).toBeUndefined();
  });
});
