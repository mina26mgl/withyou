"use client";

import { useState } from "react";
import { useReverification, useUser } from "@clerk/nextjs";
import { Copy, Mail, Plus, UserPlus } from "lucide-react";
import type { PartnerInvitation, PartnerProfilePage, PartnerRole, PartnerTeamMember } from "@withyou/shared-types";
import { PasswordPanel } from "@/components/account/PasswordPanel";
import { Chip } from "@/components/partner/Chip";
import { Drawer } from "@/components/partner/Drawer";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton, pillButtonVariants } from "@/components/partner/PillButton";
import { usePartnerSummary } from "@/components/partner/PartnerSummaryContext";
import { StatusPill } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { LoadError, Panel, PanelHeader } from "@/components/partner/ui-blocks";
import { clerkMessage } from "@/lib/clerkError";
import { PARTNER_ROLE_LABEL, apiErrorMessage, partnerProfileApi } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";

type GetToken = () => Promise<string | null>;
type EmailAddressResource = Awaited<ReturnType<NonNullable<ReturnType<typeof useUser>["user"]>["createEmailAddress"]>>;

const ROLES: { key: PartnerRole; label: string; help: string }[] = [
  { key: "MEMBER", label: "Membre", help: "Tout l'espace marque : page, produits, avis, ventes…" },
  { key: "OWNER", label: "Responsable", help: "Tout l'espace marque, et en plus inviter ou retirer des membres de l'équipe." },
];

const name = (m: { prenom: string | null; nom: string | null }, fallback = "") => `${m.prenom ?? ""} ${m.nom ?? ""}`.trim() || fallback;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

function invitationMessage(inv: { prenom: string | null; email: string }, brand: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return [
    `Bonjour ${inv.prenom ?? ""},`.replace(" ,", ","),
    "",
    `Tu es invitée dans l'équipe ${brand} sur withyou.`,
    `Connecte-toi avec l'adresse ${inv.email} : ${origin}/login`,
    `Si tu n'as pas encore de compte, crée-le avec cette même adresse : ${origin}/register`,
    `Ton accès à l'espace marque s'ouvre automatiquement : ${origin}/accueil`,
  ].join("\n");
}

export default function PartnerProfilePage() {
  const { data, error, errorMessage, reload, getToken } = usePartnerData((token) => partnerProfileApi.get(token));
  const { refresh } = usePartnerSummary();
  const { message, show } = useToast();
  const [inviting, setInviting] = useState(false);
  const isOwner = data?.me.role === "OWNER";

  const header = (
    <PageHeader
      title="Mon profil"
      subtitle="Vos informations, votre connexion et l'équipe de votre marque sur withyou."
      actions={
        isOwner && (
          <PillButton onClick={() => setInviting(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Inviter une personne
          </PillButton>
        )
      }
    />
  );

  if (error) return <>{header}<LoadError what="votre profil" message={errorMessage} /></>;
  if (!data) return <>{header}<p className="py-10 text-center text-partner-muted">Chargement…</p></>;

  const changed = (toast: string) => {
    void reload();
    void refresh();
    show(toast);
  };

  return (
    <>
      {header}
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-cols-1">
        <IdentityPanel me={data.me} brand={data.brandName} getToken={getToken} onChanged={changed} />
        <div className="flex flex-col gap-[18px]">
          <EmailPanel getToken={getToken} onChanged={changed} />
          <PasswordPanel onChanged={show} />
        </div>
      </div>
      <TeamPanel data={data} getToken={getToken} onChanged={changed} onError={show} onInvite={() => setInviting(true)} />
      {inviting && (
        <InviteDrawer
          brand={data.brandName}
          getToken={getToken}
          onClose={() => setInviting(false)}
          onSaved={(toast) => {
            setInviting(false);
            changed(toast);
          }}
        />
      )}
      <Toast message={message} />
    </>
  );
}

/* ------------------------------ Mes informations ------------------------------ */

function IdentityPanel({
  me,
  brand,
  getToken,
  onChanged,
}: {
  me: PartnerTeamMember;
  brand: string;
  getToken: GetToken;
  onChanged: (toast: string) => void;
}) {
  const [prenom, setPrenom] = useState(me.prenom ?? "");
  const [nom, setNom] = useState(me.nom ?? "");
  const [telephone, setTelephone] = useState(me.telephone ?? "");
  const [poste, setPoste] = useState(me.poste);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = prenom !== (me.prenom ?? "") || nom !== (me.nom ?? "") || telephone !== (me.telephone ?? "") || poste !== me.poste;

  async function save() {
    setErr(null);
    if (!prenom.trim()) return setErr("Indiquez votre prénom.");
    if (poste.trim().length < 2) return setErr("Indiquez votre poste dans la marque.");
    const tel = telephone.trim();
    if (tel && !/^\+?[0-9 ]{9,17}$/.test(tel)) return setErr("Numéro de téléphone invalide (ex. 0550 12 34 56).");
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      await partnerProfileApi.save(token, { prenom: prenom.trim(), nom: nom.trim(), telephone: tel || null, poste: poste.trim() });
      onChanged("Vos informations sont enregistrées.");
    } catch (e) {
      setErr(apiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader title="Mes informations" sub={`Visibles par votre équipe ${brand} et par votre contact withyou.`} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-partner-muted">
        <StatusPill tone="info">{PARTNER_ROLE_LABEL[me.role] ?? me.role}</StatusPill>
        {me.since && <span>Dans l&apos;équipe depuis le {shortDate(me.since)}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Prénom</span>
          <input type="text" maxLength={60} value={prenom} onChange={(e) => setPrenom(e.target.value)} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Nom</span>
          <input type="text" maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Poste dans la marque</span>
          <input type="text" maxLength={80} value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Ex. Fondatrice, Responsable marketing" className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Téléphone</span>
          <input type="tel" maxLength={17} value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="0550 12 34 56" className="partner-input" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
        <PillButton disabled={!dirty || busy} onClick={save}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </PillButton>
      </div>
    </Panel>
  );
}

/* ------------------------------ Adresse e-mail (Clerk) ------------------------------ */

function EmailPanel({ getToken, onChanged }: { getToken: GetToken; onChanged: (toast: string) => void }) {
  const { user } = useUser();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<EmailAddressResource | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Actions sensibles : Clerk peut redemander le mot de passe avant de les faire.
  const createEmail = useReverification((address: string) => user!.createEmailAddress({ email: address }));
  const makePrimary = useReverification((id: string) => user!.update({ primaryEmailAddressId: id }));

  const current = user?.primaryEmailAddress?.emailAddress ?? "";

  function reset() {
    setEditing(false);
    setEmail("");
    setCode("");
    setPending(null);
    setErr(null);
  }

  async function sendCode() {
    setErr(null);
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setErr("Adresse e-mail invalide.");
    if (address === current.toLowerCase()) return setErr("C'est déjà votre adresse.");
    setBusy(true);
    try {
      // Adresse déjà ajoutée lors d'un essai précédent : on renvoie simplement un code.
      const existing = user?.emailAddresses.find((e) => e.emailAddress.toLowerCase() === address);
      const ea = existing ?? (await createEmail(address));
      if (!ea) return;
      await ea.prepareVerification({ strategy: "email_code" });
      setPending(ea);
    } catch (e) {
      setErr(clerkMessage(e, "Impossible d'envoyer le code."));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!pending) return;
    setErr(null);
    setBusy(true);
    try {
      const verified = await pending.attemptVerification({ code: code.trim() });
      const old = user?.primaryEmailAddress;
      await makePrimary(verified.id);
      // L'ancienne adresse ne sert plus à se connecter.
      if (old && old.id !== verified.id) await old.destroy().catch(() => undefined);
      await user?.reload();
      const token = await getToken();
      if (token) await partnerProfileApi.syncEmail(token);
      reset();
      onChanged(`Votre adresse de connexion est maintenant ${verified.emailAddress}.`);
    } catch (e) {
      setErr(clerkMessage(e, "Code incorrect ou expiré."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader title="Adresse e-mail" sub="Celle qui vous sert à vous connecter." />
      <div className="flex items-center gap-2.5 rounded-xl border border-partner-border bg-partner-bg px-3 py-2.5 text-sm">
        <Mail className="h-4 w-4 flex-none text-partner-heading" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{current || "…"}</span>
        {!editing && (
          <PillButton variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Changer
          </PillButton>
        )}
      </div>
      {editing && (
        <div className="mt-3 flex flex-col gap-2.5">
          {!pending ? (
            <label className="flex flex-col gap-1.5">
              <span className="partner-lbl">Nouvelle adresse</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@votremarque.dz" className="partner-input" />
              <span className="text-[12.5px] text-partner-muted">Nous y envoyons un code pour vérifier qu&apos;elle est à vous.</span>
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="partner-lbl">Code reçu à {pending.emailAddress}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="partner-input tracking-[0.3em]"
              />
            </label>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
            <PillButton variant="ghost" size="sm" onClick={reset}>
              Annuler
            </PillButton>
            {!pending ? (
              <PillButton size="sm" disabled={busy} onClick={sendCode}>
                {busy ? "Envoi…" : "Envoyer le code"}
              </PillButton>
            ) : (
              <PillButton size="sm" disabled={busy || code.length < 6} onClick={confirm}>
                {busy ? "Vérification…" : "Confirmer"}
              </PillButton>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------ Équipe de la marque ------------------------------ */

function TeamPanel({
  data,
  getToken,
  onChanged,
  onError,
  onInvite,
}: {
  data: PartnerProfilePage;
  getToken: GetToken;
  onChanged: (toast: string) => void;
  onError: (msg: string) => void;
  onInvite: () => void;
}) {
  const isOwner = data.me.role === "OWNER";
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, fn: (token: string) => Promise<string>) {
    const token = await getToken();
    if (!token) return;
    setBusyId(id);
    try {
      onChanged(await fn(token));
    } catch (e) {
      onError(apiErrorMessage(e, "L'action a échoué."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title={`Équipe ${data.brandName}`}
        sub={
          isOwner
            ? "Les personnes qui ont accès à votre espace marque. Invitez-en d'autres ou retirez un accès."
            : "Les personnes qui ont accès à votre espace marque. Seul un responsable peut inviter ou retirer quelqu'un."
        }
        aside={
          isOwner && (
            <PillButton variant="ghost" size="sm" onClick={onInvite}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Inviter
            </PillButton>
          )
        }
      />
      <div className="-mx-1.5 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[12.5px] text-partner-muted">
              {["Membre", "Poste", "Téléphone", "Rôle", ""].map((h, i) => (
                <th key={h || i} className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.team.map((m) => {
              const isMe = m.id === data.me.id;
              const editable = isOwner && !isMe;
              const label = name(m, m.email);
              return (
                <tr key={m.id} className="border-b border-partner-border last:border-b-0">
                  <td className="px-3 py-3">
                    <b>{label}</b>
                    {isMe && <span className="text-partner-muted"> (vous)</span>}
                    <div className="truncate text-[12.5px] text-partner-muted">{m.email}</div>
                  </td>
                  <td className="px-3 py-3">{m.poste}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-partner-muted">{m.telephone || "—"}</td>
                  <td className="px-3 py-3">
                    {editable ? (
                      <select
                        value={m.role}
                        disabled={busyId === m.id}
                        aria-label={`Rôle de ${label}`}
                        onChange={(e) => {
                          const role = e.target.value as PartnerRole;
                          void run(m.id, async (tk) => {
                            await partnerProfileApi.setRole(tk, m.id, role);
                            return `${label} est maintenant ${PARTNER_ROLE_LABEL[role]}.`;
                          });
                        }}
                        className="partner-input w-auto min-w-[140px] py-1.5"
                      >
                        {ROLES.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      PARTNER_ROLE_LABEL[m.role] ?? m.role
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {editable && (
                      <PillButton
                        variant="ghost"
                        size="sm"
                        disabled={busyId === m.id}
                        onClick={() => {
                          if (!window.confirm(`Retirer ${label} de l'équipe ? Cette personne n'aura plus accès à l'espace marque.`)) return;
                          void run(m.id, async (tk) => {
                            await partnerProfileApi.remove(tk, m.id);
                            return `${label} n'a plus accès à l'espace marque.`;
                          });
                        }}
                      >
                        Retirer
                      </PillButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.invitations.length > 0 && (
        <>
          <h3 className="mb-1 mt-6 text-[15px] font-bold text-partner-heading">Invitations en attente</h3>
          <p className="mb-2 mt-0 text-[12.5px] text-partner-muted">
            L&apos;accès s&apos;ouvre dès que la personne se connecte (ou crée son compte) avec cette adresse. Envoyez-lui le message.
          </p>
          {data.invitations.map((inv) => (
            <PendingRow
              key={inv.id}
              inv={inv}
              brand={data.brandName}
              isOwner={isOwner}
              busy={busyId === inv.id}
              onError={onError}
              onCopied={() => onChanged("Message copié : collez-le dans un e-mail ou WhatsApp.")}
              onRevoke={() => {
                if (!window.confirm(`Annuler l'invitation de ${inv.email} ?`)) return;
                void run(inv.id, async (tk) => {
                  await partnerProfileApi.revokeInvitation(tk, inv.id);
                  return `L'invitation de ${inv.email} est annulée.`;
                });
              }}
            />
          ))}
        </>
      )}
    </Panel>
  );
}

function PendingRow({
  inv,
  brand,
  isOwner,
  busy,
  onRevoke,
  onCopied,
  onError,
}: {
  inv: PartnerInvitation;
  brand: string;
  isOwner: boolean;
  busy: boolean;
  onRevoke: () => void;
  onCopied: () => void;
  onError: (msg: string) => void;
}) {
  const text = invitationMessage(inv, brand);
  const mailto = `mailto:${inv.email}?subject=${encodeURIComponent(`Rejoins l'équipe ${brand} sur withyou`)}&body=${encodeURIComponent(text)}`;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-partner-border py-3 last:border-b-0 max-[700px]:grid-cols-1">
      <div className="min-w-0">
        <b>{name(inv, inv.email)}</b>{" "}
        <span className="text-partner-muted">
          · {PARTNER_ROLE_LABEL[inv.role] ?? inv.role}
          {inv.poste ? ` · ${inv.poste}` : ""}
        </span>
        <div className="truncate text-[12.5px] text-partner-muted">
          {inv.email} · invitée par {inv.invitedBy} le {shortDate(inv.createdAt)}, valable jusqu&apos;au {shortDate(inv.expiresAt)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <PillButton
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(text).then(onCopied, () => onError("Impossible de copier : utilisez « Envoyer par e-mail »."))}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copier le message
        </PillButton>
        <a href={mailto} className={pillButtonVariants({ variant: "ghost", size: "sm" })}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          Envoyer par e-mail
        </a>
        {isOwner && (
          <PillButton variant="ghost" size="sm" disabled={busy} onClick={onRevoke}>
            Annuler
          </PillButton>
        )}
      </div>
    </div>
  );
}

function InviteDrawer({
  brand,
  getToken,
  onClose,
  onSaved,
}: {
  brand: string;
  getToken: GetToken;
  onClose: () => void;
  onSaved: (toast: string) => void;
}) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [poste, setPoste] = useState("");
  const [role, setRole] = useState<PartnerRole>("MEMBER");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr(null);
    if (!prenom.trim()) return setErr("Indiquez le prénom.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr("Adresse e-mail invalide.");
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      const r = await partnerProfileApi.invite(token, {
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim(),
        poste: poste.trim() || null,
        role,
      });
      onSaved(
        r.existingAccount
          ? `${prenom.trim()} a déjà un compte withyou : son accès s'ouvre à sa prochaine connexion.`
          : `Invitation prête pour ${prenom.trim()}. Envoyez-lui le message pour qu'elle crée son compte.`,
      );
    } catch (e) {
      setErr(apiErrorMessage(e, "L'invitation a échoué."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Inviter dans l'équipe ${brand}`}
      subtitle="La personne se connecte (ou crée son compte) avec cette adresse : son accès à l'espace marque s'ouvre à ce moment-là. L'invitation est valable 30 jours."
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={save}>
            Inviter
          </PillButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Prénom</span>
          <input type="text" maxLength={60} value={prenom} onChange={(e) => setPrenom(e.target.value)} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Nom</span>
          <input type="text" maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Adresse e-mail</span>
          <input type="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@votremarque.dz" className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Poste (facultatif)</span>
          <input type="text" maxLength={80} value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Ex. Responsable marketing" className="partner-input" />
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        <span className="partner-lbl">Rôle</span>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <Chip key={r.key} pressed={role === r.key} onClick={() => setRole(r.key)}>
              {r.label}
            </Chip>
          ))}
        </div>
        <span className="text-[12.5px] text-partner-muted">{ROLES.find((r) => r.key === role)?.help}</span>
      </div>
    </Drawer>
  );
}
