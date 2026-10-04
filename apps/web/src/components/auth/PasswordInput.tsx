"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authInputClass } from "./AuthShell";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  /** Classe du champ (par défaut : style des pages de connexion). */
  className?: string;
}

export function PasswordInput({ value, onChange, placeholder = "Mot de passe", autoComplete, className = authInputClass }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#4A6E4F] hover:text-[#07320D]"
      >
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}
