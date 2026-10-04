import { formatPrice } from "@withyou/shared-utils";
import { FitBar } from "@/components/partner/FitBar";
import { ProductVisual } from "@/components/partner/ProductVisual";

export function ProductCardPreview({
  name,
  price,
  imageUrl,
  category,
  fitScore,
}: {
  name: string;
  price: number | "";
  imageUrl?: string;
  category?: string | null;
  fitScore?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-2.5 text-[13px]">
      <div className="aspect-square overflow-hidden rounded-xl bg-[#F2F4F1]">
        <ProductVisual imageUrl={imageUrl} category={category} name={name || "Produit"} />
      </div>
      <div className="mt-2 line-clamp-2 min-h-[36px] px-0.5 text-[13.5px] font-semibold leading-tight">
        {name || "Nom du produit"}
      </div>
      <div className="mt-1 flex items-center justify-between gap-1.5 px-0.5 pb-2">
        <strong className="text-sm">{price ? formatPrice(price) : "—"}</strong>
        <FitBar value={fitScore ?? null} />
      </div>
      <span className="block rounded-full bg-partner-cta py-1.5 text-center text-[11px] font-semibold text-white">
        Garder ce produit
      </span>
    </div>
  );
}
