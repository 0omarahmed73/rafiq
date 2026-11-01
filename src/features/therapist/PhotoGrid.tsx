import { toArabicDigits } from '../../lib/digits';

export interface Photo {
  id: string;
  dataUrl: string;
}

const icon = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, 'aria-hidden': true };

/** Three-column thumbnails; tap to enlarge, a labelled button on each to remove. */
export function PhotoGrid({
  photos,
  onOpen,
  onRemove,
  disabled = false,
  itemLabel = 'صورة الواجب',
}: {
  photos: Photo[];
  disabled?: boolean;
  itemLabel?: string;
  onOpen: (photo: Photo) => void;
  onRemove: (photo: Photo) => void;
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
      {photos.map((photo, index) => {
        const n = toArabicDigits(index + 1);
        return (
          <li key={photo.id} className="relative aspect-square min-w-0 overflow-hidden rounded-2xl border border-line bg-card">
            <button type="button" aria-label={`فتح الصورة ${n}`} onClick={() => onOpen(photo)} className="block h-full w-full">
              <img src={photo.dataUrl} alt={`${itemLabel} ${n}`} className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              aria-label={`حذف الصورة ${n}`}
              disabled={disabled}
              onClick={() => onRemove(photo)}
              className="absolute end-1 top-1 grid h-11 w-11 place-items-center rounded-full bg-card/90 text-ink shadow disabled:opacity-50"
            >
              <svg {...icon}><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
