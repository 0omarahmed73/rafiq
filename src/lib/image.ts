export const MAX_PHOTOS = 6;
export const MAX_SIDE = 1280;
export const JPEG_QUALITY = 0.8;

export class ImageError extends Error {
  constructor(public readonly code: 'not-image' | 'unreadable') {
    super(code);
    this.name = 'ImageError';
  }
}

export interface ImageDeps {
  decode(file: Blob): Promise<{ width: number; height: number; draw(width: number, height: number): Promise<string> }>;
}

/** Scales so the longer side is at most `max`, keeping the ratio; never enlarges. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Browser decoder: applies the photo's rotation, then re-encodes as JPEG on a canvas (which drops EXIF and GPS). */
const browserDeps: ImageDeps = {
  async decode(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return {
      width: bitmap.width,
      height: bitmap.height,
      async draw(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No canvas');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      },
    };
  },
};

/** A shrunk JPEG data URL for a chosen file. Throws `ImageError` for a non-image or an unreadable one. */
export async function shrinkImage(file: Blob, deps: ImageDeps = browserDeps): Promise<string> {
  if (!file.type.startsWith('image/')) throw new ImageError('not-image');
  try {
    const decoded = await deps.decode(file);
    const size = fitWithin(decoded.width, decoded.height, MAX_SIDE);
    return await decoded.draw(size.width, size.height);
  } catch {
    throw new ImageError('unreadable');
  }
}
