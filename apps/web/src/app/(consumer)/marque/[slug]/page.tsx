import { notFound } from "next/navigation";
import type { PublicBrandPage } from "@withyou/shared-types";
import { api, ApiError } from "@/lib/api";
import MarqueView from "./MarqueView";

async function getBrandPage(slug: string): Promise<PublicBrandPage | null> {
  try {
    return await api.get<PublicBrandPage>(`/marques/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export default async function MarquePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getBrandPage(slug);
  if (!data) return notFound();

  return <MarqueView slug={slug} data={data} />;
}
