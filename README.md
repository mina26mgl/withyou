# WithYou — Marketplace beauté & cosmétique (Algérie)

Monorepo Turborepo pour la marketplace WithYou. Interface consommatrice mobile-first
(375–430px), dashboard partenaire desktop.

## Apps

- `apps/web` — Next.js 15 (App Router, TypeScript strict, Tailwind v4, shadcn/ui)
- `apps/api-core` — NestJS 10 (Prisma/PostgreSQL, Mongoose/MongoDB, Redis, JWT auth)
- `apps/api-ai` — FastAPI (RAG sémantique via LlamaIndex + Qdrant + BGE-M3)

## Packages partagés

- `packages/shared-types` — interfaces TypeScript (User, Produit, Commande, SkinProfile...)
- `packages/shared-utils` — formatPrice (DZD), validateWilaya (58 wilayas), slugify
- `packages/ui-config` — thème Tailwind de base partagé

## Prérequis

- Node 20+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Python 3.11+ (le dépôt a été initialisé avec Python 3.10 ; passez à 3.11+ dès que possible)
- PostgreSQL, MongoDB, Redis, Qdrant (peuvent être lancés via Docker)

## Setup local

```bash
# 1. Installer les dépendances JS/TS
pnpm install

# 2. Copier les fichiers d'environnement
cp .env.example .env
cp apps/api-core/.env.example apps/api-core/.env
cp apps/api-ai/.env.example apps/api-ai/.env

# 3. Générer le client Prisma et appliquer le schéma
cd apps/api-core
npx prisma generate
npx prisma migrate dev --name init
cd ../..

# 4. Préparer l'environnement Python pour api-ai
cd apps/api-ai
python -m venv .venv
# Windows : .venv\Scripts\activate
# macOS/Linux : source .venv/bin/activate
pip install -r requirements.txt
cd ../..

# 5. Lancer PostgreSQL, MongoDB, Redis et Qdrant (exemple via Docker)
docker run -d -p 5432:5432 -e POSTGRES_USER=withyou -e POSTGRES_PASSWORD=password -e POSTGRES_DB=withyou_db postgres:16
docker run -d -p 27017:27017 mongo:7
docker run -d -p 6379:6379 redis:7
docker run -d -p 6333:6333 qdrant/qdrant

# 6. Lancer les 3 services en parallèle
pnpm dev
```

`pnpm dev` démarre, via Turborepo :

| Service    | Port |
| ---------- | ---- |
| `web`      | 3000 |
| `api-core` | 3001 |
| `api-ai`   | 8000 |

`api-ai` n'est pas inclus dans le pipeline `dev` de Turborepo (c'est un service Python, hors
pnpm workspaces) : démarrez-le séparément depuis `apps/api-ai` avec :

```bash
.venv\Scripts\uvicorn main:app --reload --port 8000   # Windows
.venv/bin/uvicorn main:app --reload --port 8000        # macOS/Linux
```

## Commandes utiles

```bash
pnpm build   # build de toutes les apps
pnpm lint    # lint de toutes les apps
pnpm test    # tests de toutes les apps
pnpm format  # formatte le code avec Prettier
```
