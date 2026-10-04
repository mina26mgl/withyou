"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { MessageSquare } from "lucide-react";
import type { PartnerReview, ReviewFilter } from "@withyou/shared-types";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { usePartnerSummary } from "@/components/partner/PartnerSummaryContext";
import { Stars } from "@/components/partner/Stars";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, LoadError, Panel, Tabs } from "@/components/partner/ui-blocks";
import { apiErrorMessage, partnerApi } from "@/lib/partnerApi";
import { fmtDecimal, timeAgoFr } from "@/lib/partnerFormat";
import { usePartnerData } from "@/lib/usePartnerData";

const FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "open", label: "Sans réponse" },
  { key: "low", label: "3 étoiles et moins" },
];

function ReviewCard({
  review,
  onReplied,
  notify,
}: {
  review: PartnerReview;
  onReplied: () => void;
  notify: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const { getToken } = useAuth();

  async function send() {
    if (!text.trim()) {
      notify("Écrivez votre réponse avant de la publier.");
      document.getElementById(`reply-${review.id}`)?.focus();
      return;
    }
    const token = await getToken();
    if (!token) return;
    setSending(true);
    try {
      await partnerApi.replyToReview(token, review.id, text);
      notify("Réponse publiée.");
      setOpen(false);
      onReplied();
    } catch (err) {
      notify(apiErrorMessage(err, "La réponse n'a pas pu être publiée."));
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="border-b border-partner-border py-[18px] last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-partner-leaf font-partner-heading text-[15px] text-white" aria-hidden="true">
            {review.auteur.charAt(0)}
          </div>
          <div>
            <b className="block text-sm leading-tight">{review.auteur}</b>
            <span className="text-xs text-partner-muted">{timeAgoFr(review.createdAt)}</span>
          </div>
        </div>
        <Stars value={review.stars} />
      </div>
      <p className="mb-0 mt-2.5">{review.texte}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[review.produitNom, review.skinType, review.verified ? "Achat vérifié" : null].filter(Boolean).map((tag) => (
          <span key={tag} className="rounded-full border border-partner-border bg-partner-bg px-[9px] py-0.5 text-xs text-partner-muted">
            {tag}
          </span>
        ))}
      </div>

      {review.reply ? (
        <div className="mt-3 rounded-r-xl border-l-[3px] border-partner-leaf bg-partner-bg px-3.5 py-3 text-sm">
          <b className="mb-0.5 block text-[12.5px] text-partner-heading">Votre réponse</b>
          {review.reply}
        </div>
      ) : open ? (
        <div className="mt-3">
          <label htmlFor={`reply-${review.id}`} className="partner-lbl mb-1.5 block">
            Votre réponse publique
          </label>
          <textarea
            id={`reply-${review.id}`}
            rows={3}
            maxLength={1000}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Merci pour votre retour…"
            className="partner-input resize-y"
          />
          <div className="mt-2 flex justify-end gap-2">
            <PillButton variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </PillButton>
            <PillButton size="sm" onClick={send} disabled={sending}>
              Publier la réponse
            </PillButton>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <PillButton variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Répondre
          </PillButton>
        </div>
      )}
    </article>
  );
}

export default function AvisPage() {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const { data, loading, error, errorMessage, reload } = usePartnerData((token) => partnerApi.listReviews(token, filter), filter);
  const { refresh: refreshSummary } = usePartnerSummary();
  const { message, show } = useToast();

  async function afterReply() {
    await Promise.all([reload(), refreshSummary()]);
  }

  return (
    <>
      <PageHeader
        title="Avis clientes"
        subtitle="Chaque avis vient d'un achat vérifié. Une réponse sincère de la fondatrice compte autant que la note."
      />

      {loading && !data ? (
        <p className="py-20 text-center text-partner-muted">Chargement des avis…</p>
      ) : error || !data ? (
        <LoadError what="les avis" message={errorMessage} />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-[18px] max-[1180px]:grid-cols-1">
          <Panel className="self-start">
            <div className="font-partner-heading text-[56px] leading-none text-partner-heading">
              {data.summary.avg === null ? "—" : fmtDecimal(data.summary.avg)}
            </div>
            {data.summary.avg !== null && <Stars value={data.summary.avg} />}
            <div className="mt-1 text-[13px] text-partner-muted">{data.summary.count} avis vérifiés</div>
            <div className="mt-[18px]">
              {data.summary.distribution.map((d) => (
                <div key={d.stars} className="mb-[11px] grid grid-cols-[52px_1fr_40px] items-center gap-2.5 text-[13.5px]">
                  <span>{d.stars} ★</span>
                  <span className="h-2.5 overflow-hidden rounded-full border border-partner-border bg-partner-bg">
                    <b className="block h-full rounded-full bg-[#D4A02F]" style={{ width: `${d.pct}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{d.pct} %</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="mb-3.5">
              <Tabs label="Filtrer les avis" items={FILTERS} value={filter} onChange={setFilter} />
            </div>
            {data.reviews.length ? (
              data.reviews.map((r) => <ReviewCard key={r.id} review={r} onReplied={afterReply} notify={show} />)
            ) : (
              <EmptyState>Aucun avis dans cette catégorie.</EmptyState>
            )}
          </Panel>
        </div>
      )}
      <Toast message={message} />
    </>
  );
}
