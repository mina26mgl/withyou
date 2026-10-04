"use client";

import { useRef, useState } from "react";
import { Camera, Copy, Mail, Plus, Trash2, UserPlus } from "lucide-react";
import type { AdminAccessMember, AdminInvitation, AdminMe, AdminProfilePage, AdminRole } from "@withyou/shared-types";
import { PasswordPanel } from "@/components/account/PasswordPanel";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useAdmin } from "@/components/admin/AdminContext";
import { Chip } from "@/components/partner/Chip";
import { Drawer } from "@/components/partner/Drawer";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton, pillButtonVariants } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, LoadError, Panel, PanelHeader } from "@/components/partner/ui-blocks";
import { ADMIN_ROLE_LABEL, adminProfileApi, sinceLabel } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";
import { resizeImageToJpeg } from "@/lib/resizeImage";
import { usePartnerData } from "@/lib/usePartnerData";

type GetToken = () => Promise<string | null>;

const ROLES: { key: AdminRole; label: string; help: string }[] = [
  { key: "OPERATIONS", label: "Opérations", help: "Toute la console : validations, commandes, livraisons, marques…" },
  { key: "OWNER", label: "Direction", help: "Toute la console, et en plus donner, modifier ou retirer des accès." },
];

/** Libellés du journal d'audit pour « Mon activité ». */
const ACTIONS: Record<string, string> = {
  PAGE_APPROVED: "Page de marque publiée",
  PAGE_CHANGES_REQUESTED: "Corrections demandées sur une page",
  BRAND_APPROVED: "Nouvelle marque acceptée",
  BRAND_REJECTED: "Demande de marque refusée",
  BRAND_UPDATED: "Marque modifiée",
  BRAND_LEGAL_UPDATED: "Infos fiscales mises à jour",
  PRODUCT_APPROVED: "Produit validé",
  PRODUCT_CHANGES_REQUESTED: "Corrections demandées sur un produit",
  PRODUCT_COMMISSION_UPDATED: "Commission d'un produit modifiée",
  CARRIER_CREATED: "Service de livraison ajouté",
  CARRIER_UPDATED: "Service de livraison modifié",
  TICKET_OPENED: "Ticket transporteur ouvert",
  TICKET_RELANCE: "Transporteur relancé",
  TICKET_REPLY: "Réponse du transporteur notée",
  TICKET_RESOLVED: "Ticket résolu",
  OFFER_CREATED: "Offre d'abonnement créée",
  OFFER_UPDATED: "Offre d'abonnement modifiée",
  SUBSCRIPTION_ACTIVATED: "Abonnement activé",
  SUBSCRIPTION_RENEWED: "Abonnement renouvelé",
  SUBSCRIPTION_REFUSED: "Demande d'abonnement refusée",
  SUBSCRIPTION_STOPPED: "Abonnement arrêté",
  SALON_CREATED: "Salon ajouté",
  SALON_UPDATED: "Salon modifié",
  SPECIALIST_CREATED: "Spécialiste ajoutée",
  SPECIALIST_UPDATED: "Spécialiste modifiée",
  BOX_CREATED: "Box créée",
  BOX_UPDATED: "Box modifiée",
  BOX_PRODUCT_ADDED: "Produit ajouté à une box",
  BOX_PRODUCT_UPDATED: "Produit d'une box modifié",
  BOX_PRODUCT_REMOVED: "Produit retiré d'une box",
  BOX_RELANCE: "Marque relancée pour une box",
  BOX_CANDIDATURE_RETENUE: "Candidature box retenue",
  BOX_CANDIDATURE_REFUSEE: "Candidature box refusée",
  PROFILE_UPDATED: "Profil mis à jour",
  PROFILE_PHOTO_UPDATED: "Photo de profil changée",
  PROFILE_PHOTO_REMOVED: "Photo de profil retirée",
  ADMIN_INVITED: "Accès à la console donné",
  INVITATION_REVOKED: "Accès en attente annulé",
  ADMIN_ROLE_CHANGED: "Rôle d'un membre modifié",
  ADMIN_ACCESS_REMOVED: "Accès d'un membre retiré",
  ADMIN_ACCESS_RESTORED: "Accès d'un membre rendu",
};
const actionLabel = (a: string) => ACTIONS[a] ?? a.toLowerCase().replace(/_/g, " ");
const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Message à envoyer à la personne invitée : l'accès s'active à sa connexion avec cette adresse. */
function invitationMessage(inv: { prenom: string; email: string; roleAdmin: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return [
    `Bonjour ${inv.prenom},`,
    "",
    `Tu as maintenant accès à la console withyou (rôle : ${ADMIN_ROLE_LABEL[inv.roleAdmin] ?? inv.roleAdmin}).`,
    `Connecte-toi avec l'adresse ${inv.email} : ${origin}/login`,
    `Si tu n'as pas encore de compte, crée-le avec cette même adresse : ${origin}/register`,
    `Ensuite, la console est ici : ${origin}/admin`,
  ].join("\n");
}

export default function AdminProfilePage() {
  const { data, error, errorMessage, reload, getToken } = usePartnerData((token) => adminProfileApi.get(token));
  const { refreshMe } = useAdmin();
  const { message, show } = useToast();
  const [inviting, setInviting] = useState(false);

  const header = (
    <PageHeader
      title="Mon profil"
      subtitle="Vos informations, votre photo, votre mot de passe et les accès de l'équipe withyou à la console."
      actions={
        data?.me.roleAdmin === "OWNER" && (
          <PillButton onClick={() => setInviting(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Donner un accès
          </PillButton>
        )
      }
    />
  );

  if (error) return <>{header}<LoadError what="votre profil" message={errorMessage} /></>;
  if (!data) return <>{header}<p className="py-10 text-center text-partner-muted">Chargement…</p></>;

  const changed = (toast: string, meToo = false) => {
    void reload();
    if (meToo) refreshMe();
    show(toast);
  };

  return (
    <>
      {header}
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-cols-1">
        <div className="flex flex-col gap-[18px]">
          <IdentityPanel me={data.me} getToken={getToken} onChanged={(t) => changed(t, true)} onError={show} />
          <PasswordPanel onChanged={show} />
        </div>
        <Panel>
          <PanelHeader title="Mon activité" sub="Vos dernières actions dans la console." />
          {data.activity.length === 0 ? (
            <EmptyState>Aucune action enregistrée pour l&apos;instant.</EmptyState>
          ) : (
            <ul className="m-0 list-none p-0">
              {data.activity.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 border-b border-partner-border py-2.5 text-sm last:border-b-0">
                  <span className="min-w-0">
                    {actionLabel(a.action)}
                    {a.targetName && <span className="block truncate text-[12.5px] text-partner-muted">{a.targetName}</span>}
                  </span>
                  <span className="flex-none whitespace-nowrap text-[12.5px] text-partner-muted">{sinceLabel(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <TeamPanel data={data} getToken={getToken} onChanged={changed} onError={show} onInvite={() => setInviting(true)} />

      {inviting && (
        <InviteDrawer
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
  getToken,
  onChanged,
  onError,
}: {
  me: AdminMe;
  getToken: GetToken;
  onChanged: (toast: string) => void;
  onError: (msg: string) => void;
}) {
  const [prenom, setPrenom] = useState(me.prenom);
  const [nom, setNom] = useState(me.nom);
  const [telephone, setTelephone] = useState(me.telephone ?? "");
  const [poste, setPoste] = useState(me.poste ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "photo" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = prenom !== me.prenom || nom !== me.nom || telephone !== (me.telephone ?? "") || poste !== (me.poste ?? "");

  async function save() {
    setErr(null);
    if (!prenom.trim()) return setErr("Indiquez votre prénom.");
    const tel = telephone.trim();
    if (tel && !/^\+?[0-9 ]{9,17}$/.test(tel)) return setErr("Numéro de téléphone invalide (ex. 0550 12 34 56).");
    const token = await getToken();
    if (!token) return;
    setBusy("save");
    try {
      await adminProfileApi.save(token, { prenom: prenom.trim(), nom: nom.trim(), telephone: tel || null, poste: poste.trim() || null });
      onChanged("Vos informations sont enregistrées.");
    } catch (e) {
      setErr(apiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setBusy(null);
    }
  }

  async function photo(file: File | null) {
    const token = await getToken();
    if (!token) return;
    setBusy("photo");
    try {
      if (file) {
        await adminProfileApi.uploadPhoto(token, await resizeImageToJpeg(file));
        onChanged("Votre photo de profil est changée.");
      } else {
        await adminProfileApi.removePhoto(token);
        onChanged("Votre photo de profil est retirée.");
      }
    } catch (e) {
      onError(apiErrorMessage(e, "L'envoi de la photo a échoué."));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Panel>
      <PanelHeader title="Mes informations" sub="Visibles par l'équipe withyou, et par les marques dont vous êtes chargée de compte (prénom)." />
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <AdminAvatar prenom={prenom || me.prenom} nom={nom} photoUrl={me.photoUrl} size={88} />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <PillButton variant="ghost" size="sm" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              {me.photoUrl ? "Changer la photo" : "Ajouter une photo"}
            </PillButton>
            {me.photoUrl && (
              <PillButton variant="ghost" size="sm" disabled={busy !== null} onClick={() => photo(null)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Retirer
              </PillButton>
            )}
          </div>
          <span className="text-[12.5px] text-partner-muted">
            {busy === "photo" ? "Envoi en cours…" : "JPG, PNG ou WebP. Sans photo, vos initiales s'affichent."}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && photo(e.target.files[0])}
          />
        </div>
        <div className="ml-auto flex flex-col items-end gap-1 text-[12.5px] text-partner-muted max-[700px]:ml-0 max-[700px]:items-start">
          <StatusPill tone="info">{ADMIN_ROLE_LABEL[me.roleAdmin] ?? me.roleAdmin}</StatusPill>
          <span>Dans l&apos;équipe depuis le {longDate(me.since)}</span>
        </div>
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
          <span className="partner-lbl">Poste</span>
          <input type="text" maxLength={80} value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Ex. Responsable des marques" className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Téléphone</span>
          <input type="tel" maxLength={17} value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="0550 12 34 56" className="partner-input" />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 max-[700px]:col-span-1">
          <span className="partner-lbl">Adresse de connexion</span>
          <input type="email" value={me.email} readOnly className="partner-input bg-partner-bg text-partner-muted" />
          <span className="text-[12.5px] text-partner-muted">C&apos;est l&apos;adresse de votre compte : elle ne se change pas ici.</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
        <PillButton disabled={!dirty || busy !== null} onClick={save}>
          {busy === "save" ? "Enregistrement…" : "Enregistrer"}
        </PillButton>
      </div>
    </Panel>
  );
}

/* ------------------------------ Équipe et accès ------------------------------ */

function TeamPanel({
  data,
  getToken,
  onChanged,
  onError,
  onInvite,
}: {
  data: AdminProfilePage;
  getToken: GetToken;
  onChanged: (toast: string) => void;
  onError: (msg: string) => void;
  onInvite: () => void;
}) {
  const isOwner = data.me.roleAdmin === "OWNER";
  const [busyId, setBusyId] = useState<string | null>(null);
  const active = data.team.filter((m) => m.actif).length;

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

  function toggleAccess(m: AdminAccessMember) {
    const name = `${m.prenom} ${m.nom}`.trim();
    if (m.actif) {
      const extra = m.brands ? ` Les ${m.brands} marque(s) qu'elle suit n'auront plus de chargé de compte.` : "";
      if (!window.confirm(`Retirer l'accès de ${name} à la console ?${extra}`)) return;
    }
    void run(m.id, async (tk) => {
      const r = await adminProfileApi.updateMember(tk, m.id, { actif: !m.actif });
      if (m.actif) {
        return r.brandsUnassigned
          ? `Accès de ${name} retiré. ${r.brandsUnassigned} marque(s) à réassigner dans Marques.`
          : `Accès de ${name} retiré.`;
      }
      return `${name} a de nouveau accès à la console.`;
    });
  }

  function changeRole(m: AdminAccessMember, role: AdminRole) {
    void run(m.id, async (tk) => {
      await adminProfileApi.updateMember(tk, m.id, { roleAdmin: role });
      return `${m.prenom} est maintenant ${ADMIN_ROLE_LABEL[role]}.`;
    });
  }

  return (
    <Panel>
      <PanelHeader
        title="Équipe et accès"
        sub={
          isOwner
            ? `${active} personne(s) ont accès à la console. Donnez un accès, changez un rôle ou retirez un accès.`
            : `${active} personne(s) ont accès à la console. Seule la direction peut gérer les accès.`
        }
        aside={
          isOwner && (
            <PillButton variant="ghost" size="sm" onClick={onInvite}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Donner un accès
            </PillButton>
          )
        }
      />
      <div className="-mx-1.5 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[12.5px] text-partner-muted">
              {["Membre", "Rôle", "Marques suivies", "Dernière action", "Accès", ""].map((h, i) => (
                <th key={h || i} className={`whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold ${i === 2 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.team.map((m) => {
              const isMe = m.id === data.me.id;
              const editable = isOwner && !isMe;
              return (
                <tr key={m.id} className={`border-b border-partner-border last:border-b-0 ${m.actif ? "" : "opacity-60"}`}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <AdminAvatar prenom={m.prenom} nom={m.nom} photoUrl={m.photoUrl} size={36} />
                      <div className="min-w-0">
                        <b>
                          {m.prenom} {m.nom}
                        </b>
                        {isMe && <span className="text-partner-muted"> (vous)</span>}
                        <div className="truncate text-[12.5px] text-partner-muted">
                          {m.poste ? `${m.poste} · ` : ""}
                          {m.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {editable && m.actif ? (
                      <select
                        value={m.roleAdmin}
                        disabled={busyId === m.id}
                        onChange={(e) => changeRole(m, e.target.value as AdminRole)}
                        aria-label={`Rôle de ${m.prenom}`}
                        className="partner-input w-auto min-w-[140px] py-1.5"
                      >
                        {ROLES.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      ADMIN_ROLE_LABEL[m.roleAdmin] ?? m.roleAdmin
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{m.brands}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[13px] text-partner-muted">{m.lastActionAt ? sinceLabel(m.lastActionAt) : "—"}</td>
                  <td className="px-3 py-3">{m.actif ? <StatusPill tone="ok">Actif</StatusPill> : <StatusPill tone="mute">Accès retiré</StatusPill>}</td>
                  <td className="px-3 py-3 text-right">
                    {editable && (
                      <PillButton variant="ghost" size="sm" disabled={busyId === m.id} onClick={() => toggleAccess(m)}>
                        {m.actif ? "Retirer l'accès" : "Rendre l'accès"}
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
          <h3 className="mb-1 mt-6 text-[15px] font-bold text-partner-heading">Accès en attente</h3>
          <p className="mb-2 mt-0 text-[12.5px] text-partner-muted">
            L&apos;accès s&apos;active dès que la personne se connecte (ou crée son compte) avec cette adresse. Envoyez-lui le message.
          </p>
          {data.invitations.map((inv) => (
            <PendingRow
              key={inv.id}
              inv={inv}
              isOwner={isOwner}
              busy={busyId === inv.id}
              onError={onError}
              onCopied={() => onChanged("Message copié : collez-le dans un e-mail ou WhatsApp.")}
              onRevoke={() => {
                if (!window.confirm(`Annuler l'accès prévu pour ${inv.email} ?`)) return;
                void run(inv.id, async (tk) => {
                  await adminProfileApi.revokeInvitation(tk, inv.id);
                  return `L'accès prévu pour ${inv.email} est annulé.`;
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
  isOwner,
  busy,
  onRevoke,
  onCopied,
  onError,
}: {
  inv: AdminInvitation;
  isOwner: boolean;
  busy: boolean;
  onRevoke: () => void;
  onCopied: () => void;
  onError: (msg: string) => void;
}) {
  const text = invitationMessage(inv);
  const mailto = `mailto:${inv.email}?subject=${encodeURIComponent("Ton accès à la console withyou")}&body=${encodeURIComponent(text)}`;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-partner-border py-3 last:border-b-0 max-[700px]:grid-cols-1">
      <div className="min-w-0">
        <b>
          {inv.prenom} {inv.nom}
        </b>{" "}
        <span className="text-partner-muted">· {ADMIN_ROLE_LABEL[inv.roleAdmin] ?? inv.roleAdmin}</span>
        <div className="truncate text-[12.5px] text-partner-muted">
          {inv.email} · donné par {inv.invitedBy} {sinceLabel(inv.createdAt)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <PillButton
          variant="ghost"
          size="sm"
          onClick={() =>
            navigator.clipboard.writeText(text).then(onCopied, () => onError("Impossible de copier : utilisez « Envoyer par e-mail »."))
          }
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

function InviteDrawer({ getToken, onClose, onSaved }: { getToken: GetToken; onClose: () => void; onSaved: (toast: string) => void }) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [poste, setPoste] = useState("");
  const [role, setRole] = useState<AdminRole>("OPERATIONS");
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
      const r = await adminProfileApi.invite(token, {
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim(),
        roleAdmin: role,
        poste: poste.trim() || null,
      });
      onSaved(
        r.existingAccount
          ? `${prenom.trim()} a déjà un compte : l'accès s'active à sa prochaine connexion.`
          : `Accès prévu pour ${prenom.trim()}. Envoyez-lui le message pour qu'elle crée son compte.`,
      );
    } catch (e) {
      setErr(apiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Donner un accès à la console"
      subtitle="La personne se connecte (ou crée son compte) avec cette adresse : son accès s'active à ce moment-là."
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={save}>
            Donner l&apos;accès
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
          <input type="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@withyou.dz" className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Poste (facultatif)</span>
          <input type="text" maxLength={80} value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Ex. Chargée des marques" className="partner-input" />
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
