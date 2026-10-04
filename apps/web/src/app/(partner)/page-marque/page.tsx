"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AlertTriangle, Camera, Plus, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import type { BrandPageCandidates, BrandPageContent, BrandPageState, Founder } from "@withyou/shared-types";
import { checkBrandContrast } from "@withyou/shared-utils";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { Chip } from "@/components/partner/Chip";
import { StatusPill } from "@/components/partner/StatusPill";
import { ColorField } from "@/components/partner/ColorField";
import { ContrastBanner } from "@/components/partner/ContrastBanner";
import { LocationSearch } from "@/components/partner/LocationSearch";
import { PhonePreview } from "@/components/partner/PhonePreview";
import { usePartnerSummary } from "@/components/partner/PartnerSummaryContext";
import { Toast, useToast } from "@/components/partner/Toast";
import { LoadError } from "@/components/partner/ui-blocks";
import { partnerApi, apiErrorMessage } from "@/lib/partnerApi";
import { resizeImageToJpeg, resizeLogoToPng } from "@/lib/resizeImage";
import { ApiError } from "@/lib/api";
import { COLOR_PRESETS, COMMITMENT_MAX_LENGTH, COMMITMENTS, COMMITMENTS_MAX, STORY_MAX_LENGTH } from "./constants";
import { BrandPagePreview } from "./BrandPagePreview";
import { NeedsEditor, ProductsEditor, ReviewsEditor } from "./SectionEditors";
import { isVideoUrl } from "@/lib/media";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { LaunchChecklist } from "@/components/partner/LaunchChecklist";

const DEBOUNCE_MS = 600;

export default function BrandPageEditor() {
  const { getToken, isLoaded } = useAuth();
  const [state, setState] = useState<BrandPageState | null>(null);
  const [customCommitment, setCustomCommitment] = useState("");
  const [content, setContent] = useState<BrandPageContent | null>(null);
  const [candidates, setCandidates] = useState<BrandPageCandidates | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { message, show } = useToast();
  const { refresh: refreshSummary } = usePartnerSummary();
  const contrastRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isLoaded) return;
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const s = await partnerApi.getBrandPage(token);
        setState(s);
        setContent(s.draft);
        // Produits, besoins et avis pour l'aperçu : secondaire, ne bloque pas l'éditeur.
        partnerApi
          .getBrandCandidates(token)
          .then(setCandidates)
          .catch((err) => console.error("Aperçu : produits et avis indisponibles", err));
      } catch (err) {
        setLoadError(apiErrorMessage(err, "Le serveur ne répond pas. Vérifiez que l'API est démarrée."));
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, getToken, show]);

  const persist = useCallback(
    (next: BrandPageContent) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const token = await getToken();
        if (!token) return;
        try {
          await partnerApi.updateBrandDraft(token, next);
          void refreshSummary();
        } catch {
          show("La sauvegarde automatique a échoué. Vérifiez votre connexion.");
        }
      }, DEBOUNCE_MS);
    },
    [getToken, show, refreshSummary],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (content) persist(content);
  }, [content, persist]);

  function update<K extends keyof BrandPageContent>(key: K, value: BrandPageContent[K]) {
    setContent((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleFileChange(kind: "cover" | "coverImage" | "logo" | "audio", file: File | null) {
    if (!file || !content) return;
    const token = await getToken();
    if (!token) return;
    try {
      const isVideo = kind === "cover" && file.type.startsWith("video/");
      const uploadKind = kind === "audio" ? "audio" : isVideo ? "video" : "image";
      const uploadFile =
        kind === "logo" ? await resizeLogoToPng(file) : uploadKind === "image" ? await resizeImageToJpeg(file) : file;
      if (isVideo) show("Envoi de la vidéo en cours…");
      const { url } = await partnerApi.uploadFile(token, uploadFile, uploadKind);
      if (kind === "cover") update("coverUrl", url);
      else if (kind === "coverImage") update("coverImageUrl", url);
      else if (kind === "logo") update("logoUrl", url);
      else update("audioUrl", url);
    } catch (err) {
      console.error("Envoi du fichier refusé:", err);
      show(
        err instanceof Error && !(err instanceof ApiError)
          ? err.message
          : apiErrorMessage(err, "Échec de l'envoi du fichier."),
      );
    }
  }

  function applyPreset(preset: (typeof COLOR_PRESETS)[number]) {
    setContent((prev) => (prev ? { ...prev, bgColor: preset.bg, textColor: preset.text, accentColor: preset.accent, cardColor: preset.card } : prev));
  }

  function toggleCommitment(value: string) {
    setContent((prev) => {
      if (!prev) return prev;
      const has = prev.commitments.includes(value);
      return { ...prev, commitments: has ? prev.commitments.filter((c) => c !== value) : [...prev.commitments, value] };
    });
  }

  function addCustomCommitment() {
    const value = customCommitment.trim().replace(/\s+/g, " ");
    if (!value || !content) return;
    const exists = content.commitments.some((c) => c.toLowerCase() === value.toLowerCase());
    if (exists) {
      show("Cet engagement est déjà dans la liste.");
      return;
    }
    if (content.commitments.length >= COMMITMENTS_MAX) {
      show(`${COMMITMENTS_MAX} engagements au maximum.`);
      return;
    }
    // Un engagement de la liste proposée tapé à la main : on le coche simplement.
    const preset = COMMITMENTS.find((c) => c.toLowerCase() === value.toLowerCase());
    setContent((prev) => (prev ? { ...prev, commitments: [...prev.commitments, preset ?? value] } : prev));
    setCustomCommitment("");
  }

  function addFounder() {
    setContent((prev) => (prev ? { ...prev, founders: [...prev.founders, { name: "", role: "" }] } : prev));
  }

  function updateFounder(index: number, patch: Partial<Founder>) {
    setContent((prev) => {
      if (!prev) return prev;
      const founders = prev.founders.map((f, i) => (i === index ? { ...f, ...patch } : f));
      return { ...prev, founders };
    });
  }

  async function handleFounderPhoto(index: number, file: File | null) {
    if (!file) return;
    const token = await getToken();
    if (!token) return;
    try {
      const { url } = await partnerApi.uploadFile(token, await resizeImageToJpeg(file), "image");
      updateFounder(index, { photoUrl: url });
    } catch (err) {
      console.error("Envoi de la photo refusé:", err);
      show(
        err instanceof Error && !(err instanceof ApiError)
          ? err.message
          : apiErrorMessage(err, "Échec de l'envoi de la photo."),
      );
    }
  }

  async function handleNeedPhoto(label: string, file: File) {
    const token = await getToken();
    if (!token) return;
    try {
      const { url } = await partnerApi.uploadFile(token, await resizeImageToJpeg(file), "image");
      setContent((prev) =>
        prev ? { ...prev, needs: prev.needs.map((n) => (n.label === label ? { ...n, imageUrl: url } : n)) } : prev,
      );
    } catch (err) {
      console.error("Envoi de la photo refusé:", err);
      show(
        err instanceof Error && !(err instanceof ApiError)
          ? err.message
          : apiErrorMessage(err, "Échec de l'envoi de la photo."),
      );
    }
  }

  function removeFounder(index: number) {
    setContent((prev) => (prev ? { ...prev, founders: prev.founders.filter((_, i) => i !== index) } : prev));
  }

  async function handleSubmit() {
    if (!content) return;
    const contrast = checkBrandContrast(content.textColor, content.bgColor, content.accentColor, content.cardColor);
    if (!contrast.ok) {
      show("Corrigez le contraste des couleurs avant de soumettre.");
      contrastRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!content.name.trim()) {
      show("Ajoutez le nom de la marque avant de soumettre.");
      return;
    }
    setSubmitting(true);
    const token = await getToken();
    if (!token) {
      setSubmitting(false);
      return;
    }
    try {
      // Flush any pending debounced save first so submit sees the latest draft.
      clearTimeout(saveTimer.current);
      await partnerApi.updateBrandDraft(token, content);
      const s = await partnerApi.submitBrandPage(token);
      setState(s);
      show("Page soumise. L'équipe withyou la valide sous 48 h.");
    } catch (err) {
      show(apiErrorMessage(err, "La soumission a échoué."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <LoadError what="votre page marque" message={loadError} />;
  if (loading || !content || !state) {
    return <p className="py-20 text-center text-partner-muted">Chargement de votre page marque…</p>;
  }

  const statusTone = state.pageStatus === "IN_REVIEW" ? "info" : state.pageStatus === "LIVE" && isSame(content, state.published) ? "ok" : "warn";
  const statusLabel = state.pageStatus === "IN_REVIEW" ? "En validation" : statusTone === "ok" ? "En ligne" : "Modifications non soumises";
  const currentPresetIndex = COLOR_PRESETS.findIndex(
    (p) =>
      p.bg === content.bgColor && p.text === content.textColor && p.accent === content.accentColor && p.card === content.cardColor,
  );

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Ma page marque"
        subtitle={`Ce que les clientes voient quand elles découvrent ${content.name || "votre marque"}. Vos changements s'affichent à droite, puis l'équipe withyou les valide sous 48 h.`}
        actions={
          <>
            <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
            <PillButton onClick={handleSubmit} disabled={submitting} withChevron>
              Soumettre pour validation
            </PillButton>
          </>
        }
      />
      <LaunchChecklist />

      {state.lastRejection && (
        <div role="alert" className="flex gap-3 rounded-2xl bg-partner-warnBg px-4 py-3.5 text-sm text-partner-warn">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
          <div>
            <b className="block">L&apos;équipe withyou demande des corrections</b>
            <span className="whitespace-pre-line text-partner-ink">{state.lastRejection.message}</span>
            <span className="mt-1 block text-[12.5px]">Corrigez votre page puis soumettez-la à nouveau.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          {/* 1. Couverture et logo */}
          <Section n={1} title="Couverture et logo" subtitle="Une photo ou une courte vidéo de votre atelier, de vos mains ou de vos ingrédients raconte mieux qu'un visuel publicitaire. Format portrait conseillé : la couverture s'affiche en hauteur sur téléphone.">
            <div className="grid grid-cols-[1fr_120px] gap-3 max-[900px]:grid-cols-[1fr_100px]">
              {content.coverUrl ? (
                <div
                  className="relative h-[130px] overflow-hidden rounded-2xl border border-partner-border bg-cover bg-center"
                  style={isVideoUrl(content.coverUrl) ? undefined : { backgroundImage: `url("${content.coverUrl}")` }}
                >
                  {isVideoUrl(content.coverUrl) ? (
                    <video src={content.coverUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute bottom-2 right-2 flex gap-1.5">
                    <label className="relative min-h-9 cursor-pointer overflow-hidden rounded-full border border-partner-border bg-partner-card px-3 py-1.5 text-[13px] font-semibold">
                      Remplacer
                      <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => handleFileChange("cover", e.target.files?.[0] ?? null)} />
                    </label>
                    <button type="button" onClick={() => update("coverUrl", null)} className="min-h-9 rounded-full border border-partner-border bg-partner-card px-3 py-1.5 text-[13px] font-semibold">
                      Retirer
                    </button>
                  </div>
                </div>
              ) : (
                <label className="relative flex min-h-[130px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-partner-border bg-partner-bg text-[13.5px] text-partner-muted hover:border-partner-leaf hover:text-partner-ink">
                  <Upload className="h-[22px] w-[22px]" aria-hidden="true" />
                  <b className="font-normal text-partner-ink">Ajouter une image ou une vidéo de couverture</b>
                  <span>Image JPG, PNG, WebP · Vidéo MP4, WebM (20 Mo max)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => handleFileChange("cover", e.target.files?.[0] ?? null)} />
                </label>
              )}
              <label className="relative flex h-[130px] w-[120px] flex-none cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-partner-border bg-partner-bg p-2 text-center text-[12.5px] text-partner-muted max-[900px]:w-[100px]">
                <div
                  className="grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-full text-2xl text-white"
                  style={{ background: "#FFFFFF", border: "1px solid #E6ECEA" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={content.logoUrl || DEFAULT_AVATAR} alt="" className={`h-full w-full object-contain ${content.logoUrl ? "p-1.5" : "p-[12%]"}`} />
                </div>
                {content.logoUrl ? "Changer le logo" : "Ajouter le logo"}
                <input type="file" accept="image/*" aria-label="Logo de la marque" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => handleFileChange("logo", e.target.files?.[0] ?? null)} />
              </label>
            </div>

            {/* Couverture vidéo : une image est obligatoire (mauvaise connexion, « Marques du jour »). */}
            {isVideoUrl(content.coverUrl) && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-partner-border bg-partner-bg p-3">
                <div
                  className="h-[88px] w-[66px] flex-none rounded-xl border border-partner-border bg-partner-card bg-cover bg-center"
                  style={content.coverImageUrl ? { backgroundImage: `url("${content.coverImageUrl}")` } : undefined}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 text-[13px]">
                  <b className="block text-partner-ink">
                    Image de couverture{" "}
                    {!content.coverImageUrl && <span className="font-normal text-partner-warn">· obligatoire avec une vidéo</span>}
                  </b>
                  <span className="text-partner-muted">
                    Affichée pendant le chargement de la vidéo ou en cas de mauvaise connexion, et sur la carte « Marques du jour » de l&apos;app.
                  </span>
                </div>
                <label className="relative min-h-9 flex-none cursor-pointer overflow-hidden rounded-full border border-partner-border bg-partner-card px-3 py-1.5 text-[13px] font-semibold">
                  {content.coverImageUrl ? "Remplacer" : "Ajouter une image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Image de couverture" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => handleFileChange("coverImage", e.target.files?.[0] ?? null)} />
                </label>
              </div>
            )}
          </Section>

          {/* 2. Couleurs */}
          <Section n={2} title="Couleurs de votre page" subtitle="Partez d'une ambiance ou choisissez vos propres couleurs. Le contraste est vérifié pour que votre texte reste lisible sur téléphone.">
            <div className="mb-4 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset, i) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  aria-pressed={i === currentPresetIndex}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-partner-border bg-partner-card py-1 pl-1 pr-3 text-[13px] hover:border-partner-muted aria-pressed:border-partner-leaf aria-pressed:bg-partner-leafBg aria-pressed:font-semibold"
                >
                  <span
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ background: `linear-gradient(135deg, ${preset.bg} 50%, ${preset.card} 50%, ${preset.card} 70%, ${preset.accent} 70%)` }}
                  />
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
              <ColorField label="Fond de page" value={content.bgColor} onChange={(v) => update("bgColor", v)} />
              <ColorField label="Fond des sections" value={content.cardColor} onChange={(v) => update("cardColor", v)} />
              <ColorField label="Texte" value={content.textColor} onChange={(v) => update("textColor", v)} />
              <ColorField label="Titres et détails" value={content.accentColor} onChange={(v) => update("accentColor", v)} />
            </div>
            <div ref={contrastRef}>
              <ContrastBanner
                textColor={content.textColor}
                bgColor={content.bgColor}
                accentColor={content.accentColor}
                cardColor={content.cardColor}
              />
            </div>
            <div className="mt-4">
              <span className="mb-1.5 block text-[13.5px] font-semibold">Style des titres</span>
              <div className="flex gap-2">
                <Chip pressed={content.titleFont !== "sans"} onClick={() => update("titleFont", "serif")}>
                  Élégant
                </Chip>
                <Chip pressed={content.titleFont === "sans"} onClick={() => update("titleFont", "sans")}>
                  Moderne
                </Chip>
              </div>
            </div>
          </Section>

          {/* 3. Histoire */}
          <Section n={3} title="Votre histoire" subtitle="Parlez comme à une cliente dans votre atelier. Pas besoin de slogan.">
            <div className="mb-3.5 grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
              <Field label="Nom de la marque">
                <input type="text" value={content.name} onChange={(e) => update("name", e.target.value)} className="partner-input" />
              </Field>
              <Field label="Depuis">
                <input type="text" inputMode="numeric" maxLength={4} value={content.since} onChange={(e) => update("since", e.target.value)} className="partner-input" />
              </Field>
            </div>
            <Field label="L'histoire que vous partagez">
              <textarea
                rows={5}
                maxLength={STORY_MAX_LENGTH}
                value={content.story}
                onChange={(e) => update("story", e.target.value)}
                className="partner-input resize-y"
              />
              <div className="mt-1 text-right text-xs text-partner-muted">
                {content.story.length} / {STORY_MAX_LENGTH}
              </div>
            </Field>
            <Field label="D'où vient la marque">
              <LocationSearch
                value={content.city}
                onPick={(place) =>
                  setContent((prev) => (prev ? { ...prev, city: place.label, cityLat: place.lat, cityLng: place.lng } : prev))
                }
                onClear={() => setContent((prev) => (prev ? { ...prev, city: "", cityLat: null, cityLng: null } : prev))}
              />
              <textarea
                rows={2}
                maxLength={400}
                value={content.origin}
                onChange={(e) => update("origin", e.target.value)}
                placeholder="Quelques mots sur ce lieu (facultatif) : vos plantes viennent des montagnes de Kabylie…"
                className="partner-input mt-2 resize-y"
              />
            </Field>
            <div>
              <span className="partner-lbl">Message audio de la fondatrice</span>
              <label className="relative mt-1.5 flex min-h-11 cursor-pointer flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-partner-border bg-partner-bg px-3 py-3 text-[13.5px] text-partner-muted hover:border-partner-leaf hover:text-partner-ink">
                <Upload className="h-[22px] w-[22px]" aria-hidden="true" />
                <span>{content.audioUrl ? "Remplacer le message (30 s maximum, MP3, M4A, OGG)" : "Ajouter un message de 30 s maximum (MP3, M4A, OGG)"}</span>
                <input type="file" accept="audio/*,.ogg,.oga,.opus" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => handleFileChange("audio", e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </Section>

          {/* 4. Visages */}
          <Section n={4} title="Les visages de la marque" subtitle="Les clientes font confiance à des personnes. Ajoutez les fondatrices, les artisanes, l'équipe.">
            <div className="mb-2 flex flex-col gap-2">
              {content.founders.map((f, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                  <div className="relative">
                    <label
                      className="relative grid h-11 w-11 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-partner-border bg-partner-bg text-partner-muted hover:border-partner-leaf hover:text-partner-ink"
                      title={f.photoUrl ? "Changer la photo" : "Ajouter une photo"}
                    >
                      {f.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-[18px] w-[18px]" aria-hidden="true" />
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-label={`Photo de ${f.name || "cette personne"}`}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(e) => {
                          void handleFounderPhoto(i, e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {f.photoUrl ? (
                      <button
                        type="button"
                        onClick={() => updateFounder(i, { photoUrl: null })}
                        aria-label={`Retirer la photo de ${f.name || "cette personne"}`}
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-partner-border bg-partner-card text-partner-muted hover:text-partner-danger"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={f.name}
                    placeholder="Nom et prénom"
                    aria-label="Nom"
                    onChange={(e) => updateFounder(i, { name: e.target.value })}
                    className="partner-input"
                  />
                  <input
                    type="text"
                    value={f.role}
                    placeholder="Rôle"
                    aria-label="Rôle"
                    onChange={(e) => updateFounder(i, { role: e.target.value })}
                    className="partner-input"
                  />
                  <button
                    type="button"
                    onClick={() => removeFounder(i)}
                    aria-label={`Retirer ${f.name || "cette personne"}`}
                    className="grid h-11 w-11 flex-none place-items-center rounded-full border border-partner-border bg-partner-card text-partner-muted hover:border-partner-danger hover:text-partner-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <PillButton variant="ghost" size="sm" onClick={addFounder}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter une personne
            </PillButton>
          </Section>

          {/* 5. Engagements */}
          <Section n={5} title="Vos engagements" subtitle="Choisissez ceux que vous pouvez prouver. L'équipe withyou vérifie chaque engagement avant publication.">
            <div className="flex flex-wrap gap-2">
              {COMMITMENTS.map((c) => (
                <Chip key={c} pressed={content.commitments.includes(c)} onClick={() => toggleCommitment(c)}>
                  {c}
                </Chip>
              ))}
              {/* Engagements ajoutés par la marque : un clic les retire. */}
              {content.commitments
                .filter((c) => !(COMMITMENTS as readonly string[]).includes(c))
                .map((c) => (
                  <Chip key={c} pressed onClick={() => toggleCommitment(c)} aria-label={`Retirer l'engagement ${c}`}>
                    <span className="inline-flex items-center gap-1.5">
                      {c}
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </Chip>
                ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addCustomCommitment();
              }}
            >
              <input
                type="text"
                value={customCommitment}
                maxLength={COMMITMENT_MAX_LENGTH}
                onChange={(e) => setCustomCommitment(e.target.value)}
                placeholder="Autre engagement, ex. Huiles pressées à froid"
                aria-label="Ajouter un autre engagement"
                className="partner-input flex-1"
              />
              <PillButton type="submit" variant="ghost" size="sm" disabled={!customCommitment.trim()}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ajouter
              </PillButton>
            </form>
          </Section>

          {/* 6. Besoins */}
          <Section n={6} title="Pour quels besoins ?" subtitle="Les besoins auxquels répondent vos soins. Ajoutez une photo à chacun ; « Voir » montrera vos produits correspondants.">
            <NeedsEditor
              needs={content.needs}
              candidates={candidates}
              onChange={(needs) => update("needs", needs)}
              onPhoto={handleNeedPhoto}
              onLimit={show}
            />
          </Section>

          {/* 7. Produits */}
          <Section n={7} title="Leurs produits" subtitle="Choisissez les produits mis en avant sur votre page et leur ordre. Seuls les produits en ligne peuvent apparaître.">
            <ProductsEditor
              featured={content.featuredProductIds}
              candidates={candidates}
              onChange={(ids) => update("featuredProductIds", ids)}
            />
          </Section>

          {/* 8. Avis */}
          <Section n={8} title="Ce que disent les clientes" subtitle="Les avis vérifiés de vos clientes. Choisissez ceux qui racontent le mieux vos soins.">
            <ReviewsEditor
              featured={content.featuredReviewIds}
              candidates={candidates}
              onChange={(ids) => update("featuredReviewIds", ids)}
              onLimit={show}
            />
          </Section>

          {/* Note fixe */}
          <div className="flex gap-3 rounded-2xl p-4 text-[13.5px]" style={{ background: "linear-gradient(180deg, #D3E9F2, #F1F8FA)" }}>
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-partner-heading" aria-hidden="true" />
            <div>
              Le cachet « Vérifiée par withyou », les fiches produits et le score d&apos;adaptation gardent le style withyou. Les
              couleurs de votre marque ne s&apos;appliquent jamais à ces éléments.
            </div>
          </div>
        </div>

        {/* Colonne collante : l'aperçu suit le défilement du formulaire. */}
        <div className="sticky top-4 max-[1180px]:static">
          <div className="mb-2.5 flex items-center justify-between text-[13px] text-partner-muted">
            <span>Aperçu sur téléphone</span>
          </div>
          <PhonePreview screenColor={content.bgColor}>
            <BrandPagePreview slug={state.slug} content={content} candidates={candidates} />
          </PhonePreview>
        </div>
      </div>

      <Toast message={message} />
    </div>
  );
}

function Section({ n, title, subtitle, children }: { n: number; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-partner-border bg-partner-card p-[22px]">
      <div className="mb-4 flex items-start gap-3.5">
        <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-partner-leafBg text-[13px] font-bold text-partner-heading">
          {n}
        </span>
        <div>
          <h2 className="font-partner-heading text-[22px] text-partner-heading">{title}</h2>
          <p className="mt-1 max-w-[70ch] text-[13.5px] text-partner-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex flex-col gap-1.5">
      <span className="partner-lbl">{label}</span>
      {children}
    </div>
  );
}

function isSame(a: BrandPageContent, b: BrandPageContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
