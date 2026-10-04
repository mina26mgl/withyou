import { CheckCircle2, AlertTriangle } from "lucide-react";
import { checkBrandContrast } from "@withyou/shared-utils";
import { cn } from "@/lib/utils";

export function ContrastBanner({
  textColor,
  bgColor,
  accentColor,
  cardColor,
}: {
  textColor: string;
  bgColor: string;
  accentColor: string;
  cardColor?: string;
}) {
  const { ok, textRatio, accentRatio } = checkBrandContrast(textColor, bgColor, accentColor, cardColor);
  const fmt = (n: number) => n.toFixed(1).replace(".", ",");

  return (
    <div
      className={cn(
        "mt-3.5 flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-[13px]",
        ok ? "bg-partner-leafBg text-partner-heading" : "bg-partner-warnBg text-partner-warn",
      )}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] flex-none" aria-hidden="true" />
      ) : (
        <AlertTriangle className="mt-0.5 h-[18px] w-[18px] flex-none" aria-hidden="true" />
      )}
      <span>
        {ok
          ? `Lisible. Texte ${fmt(textRatio)}:1, titres ${fmt(accentRatio)}:1.`
          : `Contraste trop faible. Texte ${fmt(textRatio)}:1 (minimum 4,5), titres ${fmt(accentRatio)}:1 (minimum 3). Les clientes auront du mal à lire votre histoire.`}
      </span>
    </div>
  );
}
