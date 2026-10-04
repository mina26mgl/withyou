"use client";

import { useState } from "react";
import Link from "next/link";
import { useReverification, useUser } from "@clerk/nextjs";
import { KeyRound } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PillButton } from "@/components/partner/PillButton";
import { Panel, PanelHeader } from "@/components/partner/ui-blocks";
import { clerkMessage } from "@/lib/clerkError";

/** Changer (ou créer) son mot de passe, géré par Clerk. Espace marque et console admin. */

export function PasswordPanel({ onChanged }: { onChanged: (toast: string) => void }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const updatePassword = useReverification((params: { currentPassword?: string; newPassword: string }) =>
    user!.updatePassword({ ...params, signOutOfOtherSessions: true }),
  );
  const hasPassword = user?.passwordEnabled ?? true;

  function close() {
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirmPwd("");
    setErr(null);
  }

  async function save() {
    setErr(null);
    if (hasPassword && !current) return setErr("Indiquez votre mot de passe actuel.");
    if (next.length < 10) return setErr("Le nouveau mot de passe doit faire au moins 10 caractères.");
    if (next !== confirmPwd) return setErr("Les deux mots de passe ne sont pas identiques.");
    setBusy(true);
    try {
      await updatePassword({ currentPassword: hasPassword ? current : undefined, newPassword: next });
      close();
      onChanged("Mot de passe changé. Vos autres appareils ont été déconnectés.");
    } catch (e) {
      setErr(clerkMessage(e, "Le changement de mot de passe a échoué."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Mot de passe"
        sub={hasPassword ? "Changez-le si vous pensez qu'une autre personne le connaît." : "Vous vous connectez sans mot de passe : vous pouvez en créer un."}
        aside={
          !open && (
            <PillButton variant="ghost" size="sm" onClick={() => setOpen(true)}>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {hasPassword ? "Changer" : "Créer"}
            </PillButton>
          )
        }
      />
      {open && (
        <div className="flex flex-col gap-2.5">
          {hasPassword && (
            <label className="flex flex-col gap-1.5">
              <span className="partner-lbl">Mot de passe actuel</span>
              <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" className="partner-input" placeholder="" />
              <span className="text-[12.5px] text-partner-muted">
                Vous l&apos;avez oublié ?{" "}
                <Link
                  href={`/mot-de-passe-oublie?email=${encodeURIComponent(user?.primaryEmailAddress?.emailAddress ?? "")}`}
                  className="font-semibold text-partner-heading underline-offset-2 hover:underline"
                >
                  Réinitialisez-le par e-mail
                </Link>{" "}
                (vous serez déconnecté le temps de le faire).
              </span>
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="partner-lbl">Nouveau mot de passe</span>
            <PasswordInput value={next} onChange={setNext} autoComplete="new-password" className="partner-input" />
            <span className="text-[12.5px] text-partner-muted">10 caractères au minimum.</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="partner-lbl">Confirmer le nouveau mot de passe</span>
            <PasswordInput value={confirmPwd} onChange={setConfirmPwd} autoComplete="new-password" className="partner-input" />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
            <PillButton variant="ghost" size="sm" onClick={close}>
              Annuler
            </PillButton>
            <PillButton size="sm" disabled={busy} onClick={save}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </PillButton>
          </div>
        </div>
      )}
    </Panel>
  );
}
