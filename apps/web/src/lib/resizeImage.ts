const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Decodes any image the browser can display. createImageBitmap does not accept
 * SVG (common for logos), so fall back to an <img> element in that case.
 */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      // An SVG without intrinsic size reports 0×0: give it a sensible square.
      const width = img.naturalWidth || 512;
      const height = img.naturalHeight || 512;
      return { source: img, width, height };
    } catch {
      throw new Error(
        "Ce format d'image n'est pas lisible par le navigateur. Utilisez un fichier JPG, PNG, WebP ou SVG.",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function resizeImage(file: File, maxDimension: number, type: 'image/jpeg' | 'image/png'): Promise<File> {
  const { source, width: w, height: h } = await decode(file);
  const scale = Math.min(1, maxDimension / Math.max(w, h));
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Impossible d'initialiser le canvas de redimensionnement.");
  ctx.drawImage(source, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Échec de l'encodage de l'image."))),
      type,
      type === 'image/jpeg' ? JPEG_QUALITY : undefined,
    );
  });

  const ext = type === 'image/jpeg' ? '.jpg' : '.png';
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + ext, { type });
}

/**
 * Resizes an image file client-side to at most 1600px on its longest edge and
 * re-encodes it as JPEG (quality 0.82) before upload, per the brand page spec.
 */
export function resizeImageToJpeg(file: File): Promise<File> {
  return resizeImage(file, MAX_DIMENSION, 'image/jpeg');
}

/**
 * Logos keep their transparency (PNG, not JPEG, which would turn it black) and
 * SVG logos are rasterised, since the API only stores JPG/PNG/WebP.
 */
export function resizeLogoToPng(file: File): Promise<File> {
  return resizeImage(file, 512, 'image/png');
}
