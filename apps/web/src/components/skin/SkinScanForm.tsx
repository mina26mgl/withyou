"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const SKIN_TYPES = ["Sèche", "Grasse", "Mixte", "Normale", "Sensible"];
const CONCERNS = ["Acné", "Pores dilatés", "Taches pigmentaires", "Rides", "Déshydratation", "Rougeurs"];

export default function SkinScanForm() {
  const router = useRouter();
  const [skinType, setSkinType] = useState<string | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleConcern(concern: string) {
    setConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!skinType) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post("/skin-scans", { skinType, concerns });
      router.push("/profil");
    } catch {
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 py-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-withyou-text">Quel est votre type de peau ?</p>
        <div className="flex flex-wrap gap-2">
          {SKIN_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSkinType(type)}
              className={`rounded-full px-4 py-2 text-sm border ${
                skinType === type
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-withyou-text border-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-withyou-text">Quelles sont vos préoccupations ?</p>
        <div className="flex flex-wrap gap-2">
          {CONCERNS.map((concern) => (
            <button
              key={concern}
              type="button"
              onClick={() => toggleConcern(concern)}
              className={`rounded-full px-4 py-2 text-sm border ${
                concerns.includes(concern)
                  ? "bg-secondary-500 text-white border-secondary-500"
                  : "bg-white text-withyou-text border-gray-200"
              }`}
            >
              {concern}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!skinType || isSubmitting}
        className="rounded-2xl bg-primary-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? "Envoi..." : "Valider mon profil"}
      </button>
    </form>
  );
}
