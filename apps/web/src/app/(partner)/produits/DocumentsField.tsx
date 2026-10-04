"use client";

import { useState } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import type { ProduitDocument, ProduitDocumentType } from "@withyou/shared-types";
import { apiErrorMessage, partnerApi } from "@/lib/partnerApi";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS,
  formatFileSize,
  guessDocumentType,
} from "@/lib/productDocuments";

/** Documents joints au produit : fiche technique, certificat, analyses… */
export function DocumentsField({
  documents,
  onChange,
  getToken,
  onError,
}: {
  documents: ProduitDocument[];
  onChange: (docs: ProduitDocument[]) => void;
  getToken: () => Promise<string | null>;
  onError: (msg: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const full = documents.length >= MAX_DOCUMENTS;

  // Reçoit une copie des fichiers : la FileList de l'input est vidée dès qu'on le réinitialise.
  async function add(files: File[]) {
    if (!files.length) return;
    const token = await getToken();
    if (!token) return;
    const list = files.slice(0, MAX_DOCUMENTS - documents.length);
    const tooBig = list.find((f) => f.size > MAX_DOCUMENT_BYTES);
    if (tooBig) return onError(`« ${tooBig.name} » est trop lourd (10 Mo maximum).`);
    setUploading(true);
    const added: ProduitDocument[] = [];
    try {
      for (const file of list) {
        const { url } = await partnerApi.uploadFile(token, file, "document");
        added.push({ nom: file.name.slice(0, 160), url, type: guessDocumentType(file.name), taille: file.size });
      }
    } catch (e) {
      onError(apiErrorMessage(e, "Échec de l'envoi d'un document."));
    } finally {
      if (added.length) onChange([...documents, ...added]);
      setUploading(false);
    }
  }

  const setType = (i: number, type: ProduitDocumentType) => onChange(documents.map((d, j) => (j === i ? { ...d, type } : d)));

  return (
    <div>
      <label
        className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-partner-border bg-partner-bg p-4 text-center text-[13.5px] text-partner-muted ${full ? "opacity-60" : "cursor-pointer hover:border-partner-leaf hover:text-partner-ink"}`}
      >
        <Paperclip className="h-5 w-5" aria-hidden="true" />
        <b className="font-normal text-partner-ink">
          {uploading ? "Envoi en cours…" : full ? `${MAX_DOCUMENTS} documents au maximum` : "Joindre un document"}
        </b>
        <span>Fiche technique, certificat (bio, halal…), analyses de laboratoire. PDF, image ou Word, 10 Mo maximum.</span>
        <input
          type="file"
          accept={DOCUMENT_ACCEPT}
          multiple
          disabled={uploading || full}
          aria-label="Joindre un document"
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void add(files);
          }}
        />
      </label>

      {documents.length > 0 && (
        <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0">
          {documents.map((d, i) => (
            <li key={d.url} className="flex items-center gap-2.5 rounded-xl border border-partner-border bg-white px-3 py-2">
              <FileText className="h-5 w-5 flex-none text-partner-heading" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <a href={d.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-partner-ink hover:underline">
                  {d.nom}
                </a>
                {d.taille ? <span className="text-[12px] text-partner-muted">{formatFileSize(d.taille)}</span> : null}
              </div>
              <select
                value={d.type}
                onChange={(e) => setType(i, e.target.value as ProduitDocumentType)}
                aria-label={`Type du document ${d.nom}`}
                className="partner-input w-auto py-1.5 text-[13px]"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onChange(documents.filter((_, j) => j !== i))}
                aria-label={`Retirer ${d.nom}`}
                className="grid h-7 w-7 flex-none place-items-center rounded-full text-partner-muted hover:bg-partner-bg hover:text-partner-danger"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
