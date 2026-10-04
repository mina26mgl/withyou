"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AlertTriangle, ChevronLeft, ChevronRight, Sparkles, Upload, X } from "lucide-react";
import type { Categorie, Produit, ProduitDocument } from "@withyou/shared-types";
import { Drawer } from "@/components/partner/Drawer";
import { PillButton } from "@/components/partner/PillButton";
import { Chip } from "@/components/partner/Chip";
import { partnerApi, apiErrorMessage } from "@/lib/partnerApi";
import { resizeImageToJpeg } from "@/lib/resizeImage";
import { CONSERVATION_MODES, DESCRIPTION_MAX_LENGTH, MAX_NEEDS, MAX_PHOTOS, MOMENTS, NEED_MAX_LENGTH, NEEDS, SKIN_TYPES } from "./constants";
import { ConservationFields } from "./ConservationFields";
import { DocumentsField } from "./DocumentsField";
import { ProductCardPreview } from "./ProductCardPreview";
import { IngredientPicker } from "./IngredientPicker";
import { PackContentsField, type PackDraftItem } from "./PackContentsField";

interface DraftImage {
  url: string;
  ordre: number;
  isPrincipale: boolean;
}

interface DraftProduct {
  nom: string;
  categorieId: string;
  size: string;
  prix: number | "";
  stock: number | "";
  description: string;
  skinTypes: string[];
  needs: string[];
  moment: (typeof MOMENTS)[number];
  inci: string;
  modesConservation: string[];
  dureeConservationJours: number | "";
  images: DraftImage[];
  documents: ProduitDocument[];
  status: string;
  /** Message de withyou si le produit a été refusé. */
  rejectionMessage: string | null;
  /** Pack composé d'autres produits de la marque. */
  isPack: boolean;
  packItems: PackDraftItem[];
}

const EMPTY_DRAFT: DraftProduct = {
  nom: "",
  categorieId: "",
  size: "",
  prix: "",
  stock: "",
  description: "",
  skinTypes: [],
  needs: [],
  moment: "Les deux",
  inci: "",
  modesConservation: [CONSERVATION_MODES[0]],
  dureeConservationJours: "",
  images: [],
  documents: [],
  status: "DRAFT",
  rejectionMessage: null,
  isPack: false,
  packItems: [],
};

export function ProductDrawer({
  open,
  productId,
  newIsPack = false,
  products = [],
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  productId: string | null;
  /** Création : un pack plutôt qu'un produit simple. */
  newIsPack?: boolean;
  /** Produits de la marque (contenu possible d'un pack). */
  products?: Produit[];
  categories: Categorie[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { getToken } = useAuth();
  const [draft, setDraft] = useState<DraftProduct>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"draft" | "review" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [newNeed, setNewNeed] = useState("");
  // Photo en cours de glisser-déposer (index dans draft.images).
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    // Le tiroir reste monté entre deux produits : un envoi précédent ne doit pas bloquer les boutons.
    setSaving(null);
    setUploading(false);
    if (!productId) {
      setDraft({ ...EMPTY_DRAFT, categorieId: categories[0]?.id ?? "", isPack: newIsPack });
      return;
    }
    (async () => {
      const token = await getToken();
      if (!token) return;
      const p = await partnerApi.getProduct(token, productId);
      setDraft({
        nom: p.nom,
        categorieId: p.categorieId ?? "",
        size: p.size ?? "",
        prix: p.prix,
        stock: p.stock,
        description: p.description,
        skinTypes: p.skinTypes ?? [],
        needs: p.needs ?? [],
        moment: (p.moment as DraftProduct["moment"]) ?? "Les deux",
        inci: p.ingredients ?? "",
        // Anciens produits : « Ambiant » était la valeur par défaut avant ce champ.
        modesConservation: (p.modesConservation ?? []).map((m) => (m === "Ambiant" ? CONSERVATION_MODES[0] : m)),
        dureeConservationJours: p.dureeConservationJours ?? "",
        images: (p.images ?? []).map((img) => ({ url: img.url, ordre: img.ordre, isPrincipale: img.isPrincipale })),
        documents: p.documents ?? [],
        status: p.statut,
        rejectionMessage: p.rejectionMessage ?? null,
        isPack: Boolean(p.isPack),
        packItems: (p.packItems ?? []).map((i) => ({ produitId: i.produitId, quantite: i.quantite })),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  function update<K extends keyof DraftProduct>(key: K, value: DraftProduct[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleIn(key: "skinTypes" | "needs", value: string) {
    setDraft((prev) => {
      const has = prev[key].includes(value);
      return { ...prev, [key]: has ? prev[key].filter((v) => v !== value) : [...prev[key], value] };
    });
  }

  // Pack : produits de la marque qu'il peut contenir, et ingrédients qui en découlent.
  const packCandidates = products.filter((p) => !p.isPack && p.id !== productId);
  const packInci = draft.isPack
    ? [
        ...new Set(
          draft.packItems.flatMap((i) =>
            (packCandidates.find((p) => p.id === i.produitId)?.ingredients ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ),
      ].join(", ")
    : "";
  const effectiveInci = draft.isPack ? packInci : draft.inci;

  // Tout ce qu'un pack reprend de ses produits (même calcul que l'API, qui fait foi).
  const packProducts = draft.packItems
    .map((item) => ({ item, p: packCandidates.find((c) => c.id === item.produitId) }))
    .filter((x): x is { item: PackDraftItem; p: Produit } => Boolean(x.p));
  const packMoments = new Set(packProducts.map(({ p }) => p.moment ?? "Les deux"));
  const packDurees = packProducts.map(({ p }) => p.dureeConservationJours).filter((d): d is number => d != null);
  const packSummary = {
    items: packProducts.length,
    valeur: packProducts.reduce((sum, { item, p }) => sum + p.prix * item.quantite, 0),
    categorie: packProducts[0]?.p.categorieNom ?? null,
    stock: packProducts.length ? Math.min(...packProducts.map(({ item, p }) => Math.floor(p.stock / item.quantite))) : 0,
    skinTypes: [...new Set(packProducts.flatMap(({ p }) => p.skinTypes ?? []))],
    needs: [...new Set(packProducts.flatMap(({ p }) => p.needs ?? []))],
    moment: packProducts.length ? (packMoments.size === 1 ? [...packMoments][0] : "Les deux") : null,
    ingredients: packInci ? packInci.split(", ").length : 0,
    conservation: packProducts.length
      ? [
          [...new Set(packProducts.flatMap(({ p }) => p.modesConservation ?? []))].join(", "),
          packDurees.length ? `${Math.min(...packDurees)} jours après ouverture` : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : null,
  };

  /** Contenu du pack modifié : le prix suit la somme des produits tant que la marque ne l'a pas changé. */
  function updatePackItems(items: PackDraftItem[]) {
    const sum = (list: PackDraftItem[]) =>
      list.reduce((total, i) => total + (packCandidates.find((c) => c.id === i.produitId)?.prix ?? 0) * i.quantite, 0);
    setDraft((prev) => {
      const priceFollowsSum = prev.prix === "" || prev.prix === sum(prev.packItems);
      return { ...prev, packItems: items, prix: priceFollowsSum ? sum(items) || "" : prev.prix };
    });
  }

  // L'IA ne s'appuie que sur la fiche : il lui faut le nom, les types de peau et la liste INCI.
  const aiSkinTypes = draft.isPack ? packSummary.skinTypes : draft.skinTypes;
  const aiNeeds = draft.isPack ? packSummary.needs : draft.needs;
  const canWriteWithAi = Boolean(draft.nom.trim() && effectiveInci.trim() && aiSkinTypes.length);

  async function writeDescriptionWithAi() {
    const token = await getToken();
    if (!token || !canWriteWithAi) return;
    setWriting(true);
    setAiError("");
    try {
      const { description } = await partnerApi.generateProductDescription(token, {
        nom: draft.nom.trim(),
        inci: effectiveInci,
        skinTypes: aiSkinTypes,
        needs: aiNeeds,
        categorie: draft.isPack ? "Pack" : categories.find((c) => c.id === draft.categorieId)?.nom,
      });
      update("description", description.slice(0, DESCRIPTION_MAX_LENGTH));
    } catch (err) {
      setAiError(apiErrorMessage(err, "La rédaction par l'IA a échoué. Réessayez dans un instant."));
    } finally {
      setWriting(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const token = await getToken();
    if (!token) return;
    const remaining = MAX_PHOTOS - draft.images.length;
    const toUpload = Array.from(files).slice(0, Math.max(0, remaining));
    setUploading(true);
    try {
      const uploaded: DraftImage[] = [];
      for (const file of toUpload) {
        const resized = await resizeImageToJpeg(file);
        const { url } = await partnerApi.uploadFile(token, resized, "image");
        uploaded.push({ url, ordre: 0, isPrincipale: false });
      }
      setDraft((prev) => {
        const images = [...prev.images, ...uploaded].map((img, i) => ({ ...img, ordre: i, isPrincipale: i === 0 }));
        return { ...prev, images };
      });
    } catch {
      setError("Échec de l'envoi d'une photo.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    setDraft((prev) => {
      const images = prev.images.filter((_, i) => i !== index).map((img, i) => ({ ...img, ordre: i, isPrincipale: i === 0 }));
      return { ...prev, images };
    });
  }

  // Besoins ajoutés par la marque, en plus de la liste proposée.
  const customNeeds = draft.needs.filter((n) => !(NEEDS as readonly string[]).includes(n));

  /** Ajoute un besoin saisi ; s'il existe déjà dans la liste (même sans accents/majuscules), il est simplement coché. */
  function addNeed() {
    const typed = newNeed.trim().replace(/\s+/g, " ").slice(0, NEED_MAX_LENGTH);
    if (!typed) return;
    const key = (v: string) => v.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const known = [...NEEDS, ...draft.needs].find((n) => key(n) === key(typed));
    const label = known ?? typed.charAt(0).toUpperCase() + typed.slice(1);
    setDraft((prev) =>
      prev.needs.includes(label) || prev.needs.length >= MAX_NEEDS ? prev : { ...prev, needs: [...prev.needs, label] },
    );
    setNewNeed("");
  }

  /** Réordonne les photos ; la première devient la photo principale. */
  function movePhoto(from: number, to: number) {
    setDraft((prev) => {
      if (to < 0 || to >= prev.images.length || from === to) return prev;
      const images = [...prev.images];
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      return { ...prev, images: images.map((img, i) => ({ ...img, ordre: i, isPrincipale: i === 0 })) };
    });
  }

  async function save(mode: "draft" | "review") {
    if (!draft.nom.trim()) {
      setError("Ajoutez le nom du produit.");
      return;
    }
    if (!(Number(draft.prix) > 0)) {
      setError("Indiquez un prix supérieur à 0 DZD.");
      return;
    }
    if (draft.isPack && draft.packItems.length < 2) {
      setError("Un pack contient au moins 2 de vos produits.");
      return;
    }
    if (mode === "review" && !draft.isPack && !draft.inci.trim()) {
      setError("Ajoutez la liste INCI pour envoyer en vérification.");
      return;
    }
    if (mode === "review" && !draft.isPack && (!draft.skinTypes.length || !draft.needs.length)) {
      setError("Choisissez au moins un type de peau et un besoin (section « Pour qui ») pour envoyer en vérification.");
      return;
    }
    // Pack : sans durée saisie, la plus courte des produits du pack est reprise.
    if (mode === "review" && !draft.isPack && !draft.dureeConservationJours) {
      setError("Indiquez la durée de conservation après ouverture pour envoyer en vérification.");
      return;
    }
    setError("");
    setSaving(mode);
    const token = await getToken();
    if (!token) {
      setSaving(null);
      return;
    }
    const payload = {
      nom: draft.nom,
      // Pack : catégorie, stock, ciblage et conservation sont calculés par l'API.
      categorieId: draft.isPack ? undefined : draft.categorieId,
      size: draft.isPack ? undefined : draft.size || undefined,
      prix: Number(draft.prix),
      stock: draft.isPack ? undefined : Number(draft.stock) || 0,
      description: draft.description,
      skinTypes: draft.skinTypes,
      needs: draft.needs,
      moment: draft.moment,
      inci: draft.inci,
      modesConservation: draft.modesConservation,
      dureeConservationJours: draft.dureeConservationJours || undefined,
      images: draft.images,
      documents: draft.documents,
      ...(draft.isPack ? { isPack: true, packItems: draft.packItems } : {}),
      mode,
    };
    try {
      if (productId) {
        await partnerApi.updateProduct(token, productId, payload);
        onSaved(mode === "draft" ? "Brouillon enregistré." : draft.status === "ONLINE" ? "Modifications enregistrées." : "Produit envoyé en vérification. Réponse sous 48 h.");
      } else {
        await partnerApi.createProduct(token, payload);
        onSaved(mode === "draft" ? "Brouillon enregistré." : "Produit envoyé en vérification. Réponse sous 48 h.");
      }
    } catch (err) {
      setError(apiErrorMessage(err, "L'enregistrement a échoué."));
    } finally {
      setSaving(null);
    }
  }

  const wasOnline = draft.status === "ONLINE";
  const reviewLabel = productId ? (wasOnline ? "Enregistrer les modifications" : "Envoyer en vérification") : "Envoyer en vérification";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={draft.isPack ? (productId ? "Modifier le pack" : "Créer un pack") : productId ? "Modifier le produit" : "Ajouter un produit"}
      subtitle={productId ? draft.nom : "Il sera visible après validation par l'équipe withyou."}
      footer={
        <>
          {error && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{error}</span>}
          {!productId && (
            <PillButton variant="ghost" onClick={() => save("draft")} disabled={saving !== null}>
              Enregistrer le brouillon
            </PillButton>
          )}
          <PillButton onClick={() => save("review")} disabled={saving !== null}>
            {reviewLabel}
          </PillButton>
        </>
      }
    >
      {draft.status === "REJECTED" && draft.rejectionMessage && (
        <div role="alert" className="mb-4 flex gap-3 rounded-2xl bg-partner-warnBg px-4 py-3.5 text-sm text-partner-warn">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
          <div>
            <b className="block">L&apos;équipe withyou demande des corrections</b>
            <span className="whitespace-pre-line text-partner-ink">{draft.rejectionMessage}</span>
            <span className="mt-1 block text-[12.5px]">Corrigez le produit puis envoyez-le à nouveau en vérification.</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_220px] items-start gap-6 max-[900px]:grid-cols-1">
        <div>
          <SectionTitle n={1} title="Photos" />
          <label className="relative flex min-h-[80px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-partner-border bg-partner-bg p-4 text-center text-[13.5px] text-partner-muted hover:border-partner-leaf hover:text-partner-ink">
            <Upload className="h-[22px] w-[22px]" aria-hidden="true" />
            <b className="font-normal text-partner-ink">Ajoutez jusqu&apos;à 5 photos</b>
            <span>La première sert de photo principale. Glissez les photos (ou utilisez les flèches) pour changer l&apos;ordre.</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || draft.images.length >= MAX_PHOTOS}
              className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              onChange={(e) => addPhotos(e.target.files)}
            />
          </label>
          {draft.images.length > 0 && (
            <div className="mt-2.5 grid grid-cols-5 gap-2 max-[480px]:grid-cols-3">
              {draft.images.map((img, i) => (
                <div
                  key={img.url}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(i);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null) movePhoto(dragIndex, i);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`group relative aspect-square cursor-grab overflow-hidden rounded-xl border bg-partner-bg active:cursor-grabbing ${
                    dragIndex === i ? "border-partner-leaf opacity-50" : "border-partner-border"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`Photo ${i + 1}`} draggable={false} className="h-full w-full object-cover" />
                  {draft.images.length > 1 && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => movePhoto(i, i - 1)}
                        disabled={i === 0}
                        aria-label={`Déplacer la photo ${i + 1} vers la gauche`}
                        className="grid h-[22px] w-[22px] place-items-center rounded-full bg-black/55 text-white disabled:hidden"
                      >
                        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(i, i + 1)}
                        disabled={i === draft.images.length - 1}
                        aria-label={`Déplacer la photo ${i + 1} vers la droite`}
                        className="grid h-[22px] w-[22px] place-items-center rounded-full bg-black/55 text-white disabled:hidden"
                      >
                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-partner-heading">
                      Principale
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={`Retirer la photo ${i + 1}`}
                    className="absolute right-1 top-1 grid h-[22px] w-[22px] place-items-center rounded-full bg-black/55 text-white"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pack : la marque choisit les produits, le nom et le prix ; le reste est calculé. */}
          {draft.isPack && (
            <>
              <div className="mt-5">
                <SectionTitle n={2} title="Contenu du pack" />
                <PackContentsField
                  candidates={packCandidates}
                  items={draft.packItems}
                  packPrice={Number(draft.prix) || 0}
                  onChange={updatePackItems}
                />
              </div>

              <div className="mt-5">
                <SectionTitle n={3} title="Nom et prix" />
                <Field label="Nom du pack">
                  <input
                    type="text"
                    value={draft.nom}
                    placeholder="Ex. Rituel éclat du matin"
                    onChange={(e) => update("nom", e.target.value)}
                    className="partner-input"
                  />
                </Field>
                <Field
                  label="Prix du pack (DZD)"
                  hint={`Proposé : la somme des produits (${packSummary.valeur.toLocaleString("fr-FR")} DZD). Baissez-le pour offrir une remise. Commission withyou de 15 % déduite au paiement.`}
                >
                  <input
                    type="number"
                    min={0}
                    step={50}
                    inputMode="numeric"
                    value={draft.prix}
                    onChange={(e) => update("prix", e.target.value === "" ? "" : Number(e.target.value))}
                    className="partner-input max-w-[220px]"
                  />
                </Field>
              </div>

              <div className="mt-5">
                <SectionTitle n={4} title="Calculé à partir des produits" />
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl bg-partner-bg px-3.5 py-3 text-[13px]">
                  {(
                    [
                      ["Catégorie", packSummary.categorie],
                      ["Stock", packSummary.items ? `${packSummary.stock} pack${packSummary.stock > 1 ? "s" : ""} disponible${packSummary.stock > 1 ? "s" : ""}` : null],
                      ["Types de peau", packSummary.skinTypes.join(", ")],
                      ["Besoins", packSummary.needs.join(", ")],
                      ["Moment", packSummary.moment],
                      ["Ingrédients", packSummary.ingredients ? `${packSummary.ingredients} ingrédients (liste INCI des produits)` : null],
                      ["Conservation", packSummary.conservation],
                    ] as [string, string | null][]
                  ).map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="font-semibold text-partner-ink">{label}</dt>
                      <dd className="m-0 text-partner-muted">{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}

          {!draft.isPack && (
            <>
          <div className="mt-5">
            <SectionTitle n={2} title="Informations" />
            <Field label="Nom du produit">
              <input
                type="text"
                value={draft.nom}
                placeholder="Ex. Thala, rituel hydratant visage"
                onChange={(e) => update("nom", e.target.value)}
                className="partner-input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
              <Field label="Catégorie">
                <select value={draft.categorieId} onChange={(e) => update("categorieId", e.target.value)} className="partner-input">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Contenance">
                <input type="text" placeholder="Ex. 50 ml" value={draft.size} onChange={(e) => update("size", e.target.value)} className="partner-input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
              <Field label="Prix de vente (DZD)" hint="Commission withyou de 15 % déduite au paiement.">
                <input
                  type="number"
                  min={0}
                  step={50}
                  inputMode="numeric"
                  value={draft.prix}
                  onChange={(e) => update("prix", e.target.value === "" ? "" : Number(e.target.value))}
                  className="partner-input"
                />
              </Field>
              <Field label="Stock disponible">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={draft.stock}
                  onChange={(e) => update("stock", e.target.value === "" ? "" : Number(e.target.value))}
                  className="partner-input"
                />
              </Field>
            </div>
          </div>

          <div className="mt-5">
            <SectionTitle n={3} title="Pour qui" />
            <p className="-mt-2 mb-3 text-[12.5px] text-partner-muted">
              Ces réponses servent à calculer le score d&apos;adaptation et à placer votre produit dans les bonnes routines.
            </p>
            <Field label="Types de peau">
              <div className="flex flex-wrap gap-2">
                {SKIN_TYPES.map((s) => (
                  <Chip key={s} pressed={draft.skinTypes.includes(s)} onClick={() => toggleIn("skinTypes", s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Besoins" hint="Au moins un type de peau et un besoin pour envoyer en vérification.">
              <div className="flex flex-wrap gap-2">
                {NEEDS.map((n) => (
                  <Chip key={n} pressed={draft.needs.includes(n)} onClick={() => toggleIn("needs", n)}>
                    {n}
                  </Chip>
                ))}
                {/* Besoins ajoutés par la marque : cliquer les retire. */}
                {customNeeds.map((n) => (
                  <Chip key={n} pressed onClick={() => toggleIn("needs", n)} aria-label={`Retirer le besoin ${n}`}>
                    {n} <X className="ml-0.5 inline h-3 w-3" aria-hidden="true" />
                  </Chip>
                ))}
              </div>
              <div className="mt-2 flex max-w-[360px] gap-2">
                <input
                  type="text"
                  value={newNeed}
                  maxLength={NEED_MAX_LENGTH}
                  onChange={(e) => setNewNeed(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addNeed();
                    }
                  }}
                  placeholder="Autre besoin (ex. Cernes)"
                  aria-label="Ajouter un besoin"
                  className="partner-input flex-1"
                />
                <PillButton type="button" variant="ghost" size="sm" onClick={addNeed} disabled={!newNeed.trim() || draft.needs.length >= MAX_NEEDS}>
                  Ajouter
                </PillButton>
              </div>
            </Field>
            <Field label="Moment de la routine">
              <div className="flex flex-wrap gap-2">
                {MOMENTS.map((m) => (
                  <Chip key={m} pressed={draft.moment === m} onClick={() => update("moment", m)}>
                    {m}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-5">
            <SectionTitle n={4} title="Ingrédients" />
            <IngredientPicker inci={draft.inci} onChange={(v) => update("inci", v)} />
            <Field label="Liste INCI" hint="Obligatoire pour la vérification. L'IA l'utilise pour signaler les ingrédients à éviter selon le profil de chaque cliente.">
              <textarea
                rows={3}
                placeholder="Complétez avec la liste telle qu'elle figure sur l'emballage."
                value={draft.inci}
                onChange={(e) => update("inci", e.target.value)}
                className="partner-input resize-y"
              />
            </Field>
          </div>
            </>
          )}

          <div className="mt-5">
            <SectionTitle n={5} title="Description" />
            <Field label="Présentation du produit">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void writeDescriptionWithAi()}
                  disabled={writing || !canWriteWithAi}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-partner-border bg-partner-card px-3 py-1.5 text-[13px] font-semibold text-partner-ink hover:border-partner-leaf disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {writing ? "Rédaction en cours…" : draft.description.trim() ? "Réécrire avec l'IA" : "Rédiger avec l'IA"}
                </button>
                <span className="text-[12.5px] text-partner-muted">
                  {canWriteWithAi
                    ? "D'après les ingrédients et les types de peau. Relisez avant d'enregistrer."
                    : "Renseignez d'abord le nom, les types de peau et la liste INCI ci-dessus."}
                </span>
              </div>
              {aiError && <p role="alert" className="mb-1.5 text-[12.5px] text-partner-warn">{aiError}</p>}
              <textarea
                rows={4}
                maxLength={DESCRIPTION_MAX_LENGTH}
                placeholder="Ce que fait le produit, sa texture, comment l'utiliser."
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
                className="partner-input resize-y"
              />
            </Field>
          </div>

          {!draft.isPack && (
            <>
          <div className="mt-5">
            <SectionTitle n={6} title="Conservation" />
            <ConservationFields
              modes={draft.modesConservation}
              days={draft.dureeConservationJours}
              onModesChange={(v) => update("modesConservation", v)}
              onDaysChange={(v) => update("dureeConservationJours", v)}
            />
          </div>

          <div className="mt-5">
            <SectionTitle n={7} title="Documents" />
            <p className="-mt-2 mb-3 text-[12.5px] text-partner-muted">
              Facultatif. Ils sont lus uniquement par l&apos;équipe withyou et aident à valider le produit plus vite.
            </p>
            <DocumentsField
              documents={draft.documents}
              onChange={(docs) => update("documents", docs)}
              getToken={getToken}
              onError={setError}
            />
          </div>
            </>
          )}
        </div>

        <div>
          <div className="mb-2 text-[13px] font-semibold text-partner-ink">Aperçu dans l&apos;app</div>
          <ProductCardPreview
            name={draft.nom}
            price={draft.prix}
            imageUrl={draft.images[0]?.url}
            category={categories.find((c) => c.id === draft.categorieId)?.nom}
            fitScore={null}
          />
          <p className="mt-2.5 text-[12.5px] text-partner-muted">
            Le score d&apos;adaptation est calculé pour chaque cliente après la validation.
          </p>
        </div>
      </div>
    </Drawer>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 text-[14.5px] font-bold text-partner-heading">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-partner-leafBg text-xs">{n}</span>
      {title}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex flex-col gap-1.5">
      <span className="partner-lbl">{label}</span>
      {children}
      {hint && <span className="text-[12.5px] leading-snug text-partner-muted">{hint}</span>}
    </div>
  );
}
