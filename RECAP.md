# WithYou — Récap du dépôt

Marketplace beauté & cosmétique (Algérie). Monorepo **Turborepo + pnpm workspaces**,
interface consommateur mobile-first (375–430px) + dashboard partenaire desktop.

## Stack technologique

| App | Stack | Rôle |
|---|---|---|
| `apps/web` | Next.js 15 (App Router, Turbopack), TypeScript strict, Tailwind v4, Clerk (auth), Leaflet/React-Leaflet, lucide-react | Front consommateur + dashboard partenaire |
| `apps/api-core` | NestJS 10, Prisma 5 (PostgreSQL), Mongoose (MongoDB), Redis (ioredis), JWT + Passport, Clerk backend, Svix (webhooks), Helmet, Throttler | API métier principale |
| `apps/api-ai` | FastAPI, LlamaIndex, Qdrant (vector store), sentence-transformers (BGE-M3), PyTorch, Redis | RAG sémantique / recommandations / chatbot |
| `apps/api-reco` | FastAPI, SQLAlchemy 2 + Alembic (schéma PostgreSQL `reco`), scikit-learn, LightGBM | Moteur de recommandation (onboarding, similaires, routine, tracking) — voir `apps/api-reco/README.md` |

**Packages partagés** (pnpm workspace `packages/*`) :
- `shared-types` — interfaces TS (User, Produit, Commande, SkinProfile...)
- `shared-utils` — `formatPrice` (DZD), `validateWilaya` (58 wilayas), `slugify`
- `ui-config` — thème Tailwind commun

**Outillage** : Turborepo, ESLint, Prettier, Jest (api-core), pnpm 11.7.0, Node ≥20, Python 3.11+.

## Prérequis

- Node 20+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Python 3.11+ (le dépôt a été initialisé avec Python 3.10 ; passez à 3.11+ dès que possible)
- PostgreSQL, MongoDB, Redis, Qdrant (peuvent être lancés via Docker)

## Commandes pour lancer le projet

```bash
# 1. Dépendances JS/TS
pnpm install

# 2. Fichiers d'environnement
cp .env.example .env
cp apps/api-core/.env.example apps/api-core/.env
cp apps/api-ai/.env.example apps/api-ai/.env

# 3. Prisma (api-core)
cd apps/api-core
npx prisma generate
npx prisma migrate dev --name init
cd ../..

# 4. Env Python (api-ai)
cd apps/api-ai
python -m venv .venv
# Windows : .venv\Scripts\activate
# macOS/Linux : source .venv/bin/activate
pip install -r requirements.txt
cd ../..

# 5. Services d'infra (exemple via Docker)
docker run -d -p 5432:5432 -e POSTGRES_USER=withyou -e POSTGRES_PASSWORD=password -e POSTGRES_DB=withyou_db postgres:16
docker run -d -p 27017:27017 mongo:7
docker run -d -p 6379:6379 redis:7
docker run -d -p 6333:6333 qdrant/qdrant

# 6. Lancer web + api-core en parallèle (via Turborepo)
pnpm dev

# 7. api-ai à part (pas inclus dans le pipeline dev de Turborepo, service Python hors pnpm workspaces)
.venv\Scripts\uvicorn main:app --reload --port 8000   # Windows
.venv/bin/uvicorn main:app --reload --port 8000        # macOS/Linux
```

| Service    | Port |
| ---------- | ---- |
| `web`      | 3000 |
| `api-core` | 3001 |
| `api-ai`   | 8000 |
| `api-reco` | 8001 |

### Autres commandes utiles

```bash
pnpm build   # build de toutes les apps
pnpm lint    # lint de toutes les apps
pnpm test    # tests de toutes les apps
pnpm format  # formatte le code avec Prettier
```

## Architecture du dépôt

```
withyou-monorepo/
├── apps/
│   ├── web/                      # Next.js 15 — App Router
│   │   └── src/app/
│   │       ├── (auth)/           # login, register
│   │       ├── (consumer)/       # home, search, panier, commandes, produit/[id], marque/[slug], profil, profil/skin-scan
│   │       ├── (diagnostic)/     # onboarding, quiz1-5, camera, scan, loading, resultat, routine, confirmation
│   │       └── (partner)/        # dashboard partenaire
│   │
│   ├── api-core/                 # NestJS 10 — API métier
│   │   ├── prisma/schema.prisma  # PostgreSQL : admin, consomateur, marque, produit, order,
│   │   │                         #   ligne_order, paiement, livraison, categorie, visage,
│   │   │                         #   capture_scan, historique_scan/stock/points, etc.
│   │   └── src/
│   │       ├── auth/ (+strategies)   # JWT/Passport
│   │       ├── produits/ (+dto)
│   │       ├── commandes/
│   │       ├── panier/
│   │       ├── search/
│   │       ├── users/
│   │       ├── webhooks/         # clerk-webhook (sync via Svix)
│   │       └── prisma/           # service Prisma
│   │
│   ├── api-ai/                   # FastAPI — RAG / IA
│   │   ├── main.py
│   │   └── app/
│   │       ├── routers/          # chatbot, recommend, search
│   │       ├── services/         # embedder, llama_service, qdrant_service
│   │       └── models/schemas.py
│   │
│   └── assets/                   # ressources partagées (images, etc.)
│
└── packages/
    ├── shared-types/
    ├── shared-utils/
    └── ui-config/
```

### Architecture data

- **PostgreSQL** (Prisma, `api-core`) : données transactionnelles/métier (comptes, produits,
  commandes, paiements, livraison).
- **MongoDB** (Mongoose, `api-core`) : autres collections.
- **Redis** : cache/sessions.
- **Qdrant** : recherche vectorielle (embeddings BGE-M3) consommée par `api-ai`.
- **Auth** : Clerk côté front (`apps/web`), synchronisation vers `api-core` via webhooks Svix.
