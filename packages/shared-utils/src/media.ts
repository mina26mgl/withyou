/** Couverture vidéo (MP4/WebM) plutôt qu'image. */
export function isVideoUrl(url: string | null | undefined): boolean {
  return /\.(mp4|webm)$/i.test(url ?? '');
}

/**
 * Image de couverture d'une marque (cartes « Marques du jour », affiche de la
 * vidéo) : la couverture elle-même si c'est une image, sinon l'image fournie
 * avec la vidéo.
 */
export function brandCoverImage(coverUrl: string | null | undefined, coverImageUrl: string | null | undefined): string | null {
  if (!coverUrl) return null;
  return isVideoUrl(coverUrl) ? (coverImageUrl ?? null) : coverUrl;
}
