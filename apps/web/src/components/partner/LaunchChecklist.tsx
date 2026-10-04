"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { usePartnerSummary } from "./PartnerSummaryContext";
import { Panel, PanelHeader } from "./ui-blocks";

interface Step {
  label: string;
  done: boolean;
  /** État en cours (« En vérification »…) quand l'étape n'est pas finie. */
  status?: string;
  href?: string;
}

/**
 * Checklist de mise en ligne d'une marque acceptée : page marque puis produits.
 * Affichée tant que la marque n'est pas entièrement visible dans l'app.
 */
export function LaunchChecklist() {
  const { summary } = usePartnerSummary();
  if (!summary?.launch) return null;
  const { pageStatus, productsOnline, productsInReview, productsTotal } = summary.launch;

  const steps: Step[] = [
    { label: "Dossier validé par withyou", done: true },
    {
      label: "Page de la marque préparée et envoyée",
      done: pageStatus !== "DRAFT",
      status: "À préparer",
      href: "/page-marque",
    },
    {
      label: "Page de la marque publiée",
      done: pageStatus === "LIVE",
      status: pageStatus === "IN_REVIEW" ? "En vérification par withyou" : undefined,
    },
    { label: "Premier produit ajouté", done: productsTotal > 0, status: "À faire", href: "/produits" },
    {
      label: "Premier produit en ligne",
      done: productsOnline > 0,
      status: productsInReview > 0 ? `${productsInReview} en vérification par withyou` : undefined,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <Panel>
      <PanelHeader title="Mise en ligne de votre marque" sub={`${done} étape${done > 1 ? "s" : ""} sur ${steps.length}. Votre marque apparaît dans l'app quand tout est coché.`} />
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-partner-leafBg">
        <div className="h-full rounded-full bg-partner-leaf" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-2.5 p-0 max-[800px]:grid-cols-1">
        {steps.map((s) => {
          const body = (
            <>
              <span
                className={`mt-px grid h-[22px] w-[22px] flex-none place-items-center rounded-full ${s.done ? "bg-partner-leaf text-white" : "border-[1.5px] border-partner-border bg-white"}`}
                aria-hidden="true"
              >
                {s.done && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={s.done ? "font-semibold" : ""}>{s.label}</span>
                <span className="sr-only">{s.done ? " : fait" : " : à faire"}</span>
                {!s.done && s.status && <span className="block text-[12.5px] text-partner-muted">{s.status}</span>}
              </span>
              {!s.done && s.href && <ChevronRight className="h-4 w-4 flex-none text-partner-muted" aria-hidden="true" />}
            </>
          );
          return (
            <li key={s.label}>
              {!s.done && s.href ? (
                <Link href={s.href} className="flex gap-3 rounded-xl px-1 py-0.5 text-sm hover:bg-partner-bg">
                  {body}
                </Link>
              ) : (
                <div className="flex gap-3 px-1 py-0.5 text-sm">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
