# api-reco — moteur de recommandation WithYou

Service FastAPI autonome qui recommande des produits cosmétiques **dès 0 interaction**
(onboarding + catalogue), puis apprend progressivement du comportement réel.

| Version | Ce qui tourne | Statut |
|---|---|---|
| **V0** | Onboarding → filtres stricts → content-based (TF-IDF + one-hot) → popularité → diversification | ✅ actif |
| **V1** | `user_events` → affinité comportementale pondérée et décroissante, *because you liked*, popularité réelle | ✅ actif dès qu'il y a des événements |
| **V2** | Collaborative filtering item-item | ✅ codé, **s'active seul** au-delà de 50 utilisateurs / 1 000 interactions réelles |
| **V3** | Learning-to-Rank LightGBM (split temporel, MLflow) | ✅ pipeline prêt, **refuse d'entraîner** sans assez de données réelles |
| V4 | Session-aware, routine avancée | 🔜 points d'extension prévus |

---

## 1. Architecture

```
apps/api-reco/
├── app/
│   ├── main.py                 # création de l'app FastAPI, handlers d'erreurs
│   ├── core/                   # settings (.env), logging, erreurs métier
│   ├── db/                     # SQLAlchemy : base, models, session, données de référence, seed dev
│   ├── schemas/                # Pydantic (entrées/sorties API)
│   ├── api/                    # routes FastAPI — minces, aucune logique métier
│   ├── services/               # colle DB ↔ moteur : profil, événements, wishlist, catalogue, stats
│   ├── recommender/            # ⭐ moteur PUR : aucune dépendance à la DB ni à FastAPI
│   │   ├── domain.py           #   types (ProductRecord, UserProfile, ScoredProduct…)
│   │   ├── vocabulary.py       #   codes canoniques + alias FR (quiz web, tags api-core)
│   │   ├── config.py           #   TOUS les poids/seuils (surchargés par config/recommender.yaml)
│   │   ├── catalog_index.py    #   vecteurs produits (one-hot + TF-IDF), similarité cosinus
│   │   ├── encoders.py         #   TF-IDF ↔ Sentence-Transformers interchangeables
│   │   ├── filters.py          #   contraintes strictes (AVANT le scoring)
│   │   ├── scoring.py          #   features de compatibilité, score pondéré, raisons
│   │   ├── candidates.py       #   générateurs indépendants (content, similar, popular, routine, collaborative)
│   │   ├── behavior.py         #   poids d'événements, décroissance, popularité
│   │   ├── collaborative.py    #   matrice User×Product, item-kNN (V2)
│   │   ├── diversification.py  #   MMR + plafonds catégorie/marque/rôle
│   │   └── engine.py           #   pipeline complet + routine
│   └── ml/                     # offline : features partagées, dataset temporel, train, evaluate, inference
├── config/recommender.yaml     # surcharge des poids sans toucher au code
├── migrations/                 # Alembic (schéma `reco` uniquement)
├── scripts/                    # seed dev, sync api-core, synthétique, stats, évaluation cold start
├── data/dev_catalog.json       # 37 produits FICTIFS de développement
└── tests/                      # unitaires (moteur sans DB) + intégration (API sur SQLite)
```

**Écarts par rapport à la structure proposée, et pourquoi :**

- `app/models/` est devenu `app/schemas/`, pour ne pas confondre les schémas Pydantic avec les modèles SQLAlchemy de `app/db/models.py`.
- `candidate_service.py` et `ranking_service.py` sont fusionnés dans `app/recommender/` (`candidates.py`, `scoring.py`, `engine.py`). C'est de la logique pure, testable sans base. Les `services/` ne contiennent que l'accès aux données.
- `cold_start.py` n'existe pas en tant que fichier. Le cold start n'est pas un module à part : c'est le comportement du pipeline quand les signaux comportementaux sont vides. Les features manquantes valent `None` et les poids sont renormalisés.

### Intégration au monorepo

- **Service séparé (port 8001).** `api-ai` reste dédié au RAG / Qdrant, et `api-core` (NestJS) n'est pas modifié.
- **Même base PostgreSQL, schéma `reco` dédié.** Prisma gère `public` et Alembic gère `reco`, donc aucune collision de migrations.
- **`scripts/sync_core.py`** lit `public` en lecture seule (produits, marques, catégories, avis, quiz des consommatrices, wishlists, commandes) et alimente `reco`. Les UUID d'origine sont conservés dans `external_id`.

---

## 2. Schéma de base de données (`reco`)

```
users ─┬─< beauty_profiles >── skin_types
       ├─< user_concerns >──────────── concerns ──<  product_concerns (relevance_score)  >─┐
       ├─< user_ingredient_preferences (PREFER|AVOID) >── ingredients (family) ──< product_ingredients >─┤
       ├─< user_category_preferences >── categories (parent_category_id ↺) ──────────────────────────┤
       ├─< user_brand_preferences >───── brands ──────────────────────────────────────────────────────┤
       ├─< wishlist_items >──────────────────────────────────────────────────────────────── products ─┤
       ├─< orders ─< order_items >───────────────────────────────────────────────────────────────────┤
       └─< user_events (IMPRESSION…PURCHASE, metadata JSONB, is_synthetic) >─────────────────────────┤
                                                   skin_types ──< product_skin_types (compatibility_score) >┘
                                                   products ──── product_stats (popularité, compteurs, notes)
```

Choix notables :

- **Préoccupations et ingrédients sont relationnels**, pas des colonnes ni des tableaux. `user_concerns.priority` conserve l'ordre de choix.
- **`ingredients.family`** (`fragrance`, `retinoid`, `aha`…) : éviter « parfum » exclut tout ingrédient de la famille parfum (linalool, limonene…). Un membre précis (« linalool ») n'exclut que lui-même.
- **`products.routine_role`** est inféré à la synchro. Il peut être fixé à la main (`routine_role_locked = true`), et la synchro ne l'écrase alors plus.
- **`user_events` est l'unique source comportementale.** La wishlist et les commandes synchronisées y écrivent aussi leurs événements, une seule fois, donc rien n'est compté deux fois.
- **Traçabilité des données** : `products.data_source` vaut `core_sync`, `dev_seed` ou `manual`. `users.is_synthetic`, `user_events.is_synthetic` et `orders.is_synthetic` marquent les données synthétiques.
- **Contraintes** : `CHECK` sur les enums, les plages (budget, sensibilité 0–5, scores entre 0 et 1) et les acteurs d'un événement (`user_id OR session_id`). Les FK sont en `ON DELETE CASCADE / SET NULL`. Les index couvrent `(user_id, occurred_at)`, `(product_id, event_type, occurred_at)`, `(session_id, occurred_at)` et `(available, routine_role)`.

---

## 3. Pipeline de recommandation

```
générateurs ≈500 candidats      content (profil→vecteur « produit idéal »), similar (produits graines),
                                popular, routine (par rôle), collaborative (V2)
        ↓ fusion + dédoublonnage
filtres STRICTS                 indisponible · ingrédient/famille évité · sans-parfum · > budget×1,25 · coffret (routine)
        ↓
scoring pondéré → top 100       skin, concern, budget, ingredient, category, brand, texture,
                                content_similarity, behavior_affinity, popularity — poids dans config/recommender.yaml
        ↓ (V3) re-ranking LightGBM, si activé
diversification                 MMR + max 2 produits / marque, 3 / catégorie, 3 / rôle
        ↓
top K + raisons                 ["matches_your_skin_type", "matches_your_concerns", "within_your_budget", …]
```

Un produit exclu n'est **jamais scoré** : aucune popularité ne peut le faire revenir (couvert par un test).

**Routine** : les slots `cleanse`, `treat` (SERUM|TREATMENT), `moisturize` et `protect` sont obligatoires ; `tone`, `eyes` et `mask` sont optionnels. Un slot déjà couvert par un produit de l'utilisatrice est marqué `covered`. Pour les autres, le moteur choisit le meilleur produit compatible et propose 2 alternatives.

- Les combinaisons d'actifs usuellement évitées (rétinoïde + AHA/BHA) sont **pénalisées et signalées** dans `reason_details.layering_caution`. Ce n'est jamais présenté comme une règle médicale.
- La réponse inclut un avertissement indiquant que ce n'est pas un avis médical.

---

## 4. Lancer le service

```bash
cd apps/api-reco
python -m venv .venv && .venv\Scripts\activate          # Windows (source .venv/bin/activate sinon)
pip install -r requirements-dev.txt
cp .env.example .env                                     # mettre DATABASE_URL (l'URL Prisma d'api-core marche telle quelle)

alembic upgrade head                                     # crée le schéma `reco`
python scripts/seed_dev_catalog.py                       # 37 produits fictifs (dev uniquement)
python scripts/sync_core.py                              # vrai catalogue + vraies données d'api-core
uvicorn app.main:app --reload --port 8001                # http://localhost:8001/docs
```

Ou bien `docker compose up --build`, qui démarre Postgres et l'API ensemble.

Autres commandes :

```bash
pytest                                       # 71 tests (unitaires + intégration SQLite)
python scripts/evaluate_cold_start.py        # rapport qualité cold start (sortie 1 si une contrainte est violée)
python scripts/refresh_stats.py              # popularité depuis les vrais événements — à passer en cron quotidien
python -m app.ml.train                       # V3 : refuse tant que les données réelles sont insuffisantes
```

---

## 5. API (`/api/v1`)

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/onboarding` | crée ou remplace le profil beauté (crée l'utilisateur si besoin) |
| GET / PATCH | `/users/{id}/profile` | lit / modifie partiellement le profil |
| GET | `/users/by-external/{uuid}` | UUID consommatrice d'api-core vers `user_id` |
| GET / PUT / DELETE | `/users/{id}/wishlist[/{product_id}]` | wishlist (PUT idempotent : 201 puis 204) |
| GET | `/products`, `/products/{id}` | catalogue |
| GET | `/products/{id}/similar` | produits similaires |
| GET | `/products/{id}/complete-routine` | compléter la routine autour d'un produit |
| POST | `/routines/recommend` | `{"user_id": 42, "existing_products": [581, 721]}` |
| GET | `/recommendations?user_id=42&type=for_you&limit=10` | `for_you` · `similar` (+`product_id`) · `because_you_liked` |
| POST | `/events`, **`/events/batch`** | tracking (≤ 500 événements, rejets signalés un par un) |
| GET | `/reference` | types de peau, préoccupations, rôles, familles d'ingrédients pour l'UI |
| POST | `/admin/catalog/reload`, `/admin/stats/refresh` | header `X-Admin-Token` |

L'onboarding accepte les codes canoniques (`oily`, `acne`…) **et** les identifiants du quiz `apps/web` (`brillante`, `boutons`, `taches`…).

Exemple de réponse (`?debug=true` ajoute `features` et `stats`) :

```json
{
  "request_id": "6c1e…", "type": "for_you", "strategy": "profile_content",
  "model_version": "v0-rules", "fallback_used": false,
  "items": [{
    "product_id": 41, "rank": 1, "score": 0.906,
    "reasons": ["matches_your_skin_type", "matches_your_concerns", "within_your_budget", "fragrance_free"],
    "reason_details": {"matched_concerns": ["acne", "pores"]},
    "sources": ["content", "popular"],
    "product": {"name": "…", "price": 2300, "routine_role": "SERUM", "…": "…"}
  }]
}
```

### Tracking côté frontend (à faire dès le MVP)

- **Bufferiser** les événements et les envoyer via `POST /events/batch` toutes les ~5 s, ainsi qu'à `visibilitychange` / `pagehide` (`navigator.sendBeacon`).
- **Envoyer `IMPRESSION`** pour chaque produit réellement affiché d'une liste recommandée, avec `metadata: {request_id, position, list: "for_you"}`. **Envoyer `CLICK`** avec le même `request_id`. Ce sont ces impressions qui fourniront les négatifs du futur Learning-to-Rank.
- Ne pas renvoyer `WISHLIST_ADD` si la wishlist passe par cette API : l'événement est déjà écrit côté serveur.

---

## 6. Données : ce qui est réel, ce qui ne l'est pas

| Donnée | Origine | Statut |
|---|---|---|
| `data/dev_catalog.json` | écrit à la main | **fictif**, `data_source=dev_seed`, refusé si `ENVIRONMENT=prod` |
| produits `core_sync` | `api-core` | réels |
| `scripts/generate_synthetic.py` | simulation | **synthétique**, `is_synthetic=true`, emails `@example.invalid`, purge avec `--purge` |

- Les stats, le collaborative filtering et l'entraînement **ignorent le synthétique par défaut**.
- Un modèle entraîné avec `--include-synthetic` est étiqueté `data_source: synthetic|mixed` (métadonnées et MLflow), et il est **refusé en production**.
- Ses métriques prouvent seulement que le pipeline tourne. Les clics simulés dérivent du score V0, donc le modèle réapprend les règles (constaté : NDCG@10 de 0,724 pour le modèle contre 0,719 pour les règles).

**À remplacer au lancement de la marketplace :**

1. Supprimer le catalogue de dev : `DELETE FROM reco.products WHERE data_source = 'dev_seed'`.
2. Lancer `sync_core.py` en cron, ou mieux, sur webhook à chaque modification produit.
3. Purger le synthétique.
4. Laisser `user_events` se remplir et `refresh_stats.py` tourner chaque jour.

---

## 7. Évaluation

- **Cold start** (`scripts/evaluate_cold_start.py`) : en l'absence de vérité terrain, le script vérifie des propriétés sur 144 personas (type de peau × préoccupations × budget × parfum). Résultat actuel sur 67 produits :
  - **0 violation de contrainte** ;
  - 95 % de compatibilité avec le type de peau, 67 % de couverture des préoccupations ;
  - 8,5 catégories distinctes par top 10, au plus 2 produits par marque ;
  - 100 % de routines complètes, 87 % du catalogue couvert.
- **Avec données réelles** (`app/ml/evaluate.py`) : Precision@K, Recall@K, NDCG@K gradué et coverage, toujours comparés au score V0 sur le même jeu de test.
- **Split temporel** : les fenêtres de labels ne chevauchent jamais deux périodes (80 / 10 / 10), et il n'y a jamais de split aléatoire.
- **Labels gradués** : PURCHASE 4 > CART 3 > WISHLIST 2 > CLICK/VIEW 1 > affiché sans engagement 0. Un produit jamais affiché n'est **pas** un négatif.

---

## 8. Faire évoluer sans refaire l'architecture

- **Embeddings** : `encoder.text_encoder: sentence_transformer` dans le YAML, après `pip install sentence-transformers`.
- **ALS / factorisation de matrice** : implémenter le protocole `CollaborativeModel` (`recommend(interest, k, exclude)`), par exemple avec la librairie `implicit`.
- **LTR** : `python -m app.ml.train`, puis `LTR_MODEL_PATH=artifacts/ltr/<version>` et `ltr.enabled: true`. Les features sont calculées par la même fonction en entraînement et en inférence (`app/ml/features.py`).
- **Session-aware (V4)** : `user_events.session_id` est déjà indexé. Il suffit d'ajouter un générateur de candidats qui lit la session en cours.
- **Redis** : inutile en V0, puisque l'index tient en mémoire et se reconstruit en moins de 100 ms pour 67 produits. À ajouter si l'on passe à plusieurs workers ou instances, pour mettre en cache les réponses par `(user_id, type)`.

## Limites connues

- `user_id` est passé en paramètre sans authentification. En production, il doit venir du JWT d'api-core, via une passerelle ou un middleware.
- L'historique du profil n'est pas versionné. Le dataset LTR utilise donc le profil actuel, ce qui crée une légère fuite si un profil change après une date de coupure.
- Les rôles de routine et les textures sont inférés par mots-clés. Il faut vérifier les cas ambigus et les verrouiller (`routine_role_locked`).
- Le catalogue réel ne contient aucun SPF : l'étape « protect » renvoie `no_match` tant qu'aucun n'est ajouté.
