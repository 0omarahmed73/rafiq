import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { newId } from '../../db/repo';
import { useRepo } from '../../db/RepoContext';
import { ImageError, MAX_PHOTOS, shrinkImage } from '../../lib/image';
import { PhotoGrid, type Photo } from './PhotoGrid';
import { useI18n } from '../../i18n/LanguageProvider';

const label = 'text-[13px] font-semibold text-muted';
const field = 'w-full min-w-0 break-words rounded-2xl border border-line bg-card px-3.5 text-base leading-8 text-ink';
const primary = 'min-h-12 flex-1 rounded-full bg-teal px-5 text-[15px] font-bold text-card disabled:opacity-50';
const secondary = 'min-h-12 flex-1 rounded-full border-[1.5px] border-teal bg-card px-5 text-[15px] font-bold text-teal-ink';

interface Stored extends Photo {
  persisted: boolean;
  createdAt: string;
  kind: 'prompt' | 'answer';
}

export function HomeworkPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const navigate = useNavigate();
  const { id: param = 'new' } = useParams();
  const [search] = useSearchParams();
  const isNew = param === 'new';
  const newIdRef = useRef(newId());
  const id = isNew ? newIdRef.current : param;

  const [loaded, setLoaded] = useState(isNew);
  const [missing, setMissing] = useState(false);
  const [persisted, setPersisted] = useState(!isNew);
  const [sessionId, setSessionId] = useState(search.get('session') ?? '');
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [answer, setAnswer] = useState('');
  const [done, setDone] = useState(false);
  const [photos, setPhotos] = useState<Stored[]>([]);
  const [viewer, setViewer] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const addingPhotos = useRef(false);
  const didUnmount = useRef(false);
  const promptFileInput = useRef<HTMLInputElement>(null);
  const promptCameraInput = useRef<HTMLInputElement>(null);
  const answerFileInput = useRef<HTMLInputElement>(null);
  const answerCameraInput = useRef<HTMLInputElement>(null);
  // After the first save the address changes to the homework's own id; that must not reload (and overwrite) the form.
  const skipLoad = useRef<string | null>(null);
  // True while there is typed text or a photo that is not stored yet; leaving the page then saves it.
  const dirty = useRef(false);
  const latest = useRef({ id, sessionId, createdAt, text, notes, answer, done, photos });
  latest.current = { id, sessionId, createdAt, text, notes, answer, done, photos };

  useEffect(() => {
    if (isNew || skipLoad.current === param) return;
    let alive = true;
    void Promise.all([repo.getHomework(param), repo.listHomeworkImages(param)]).then(([found, images]) => {
      if (!alive) return;
      if (!found) {
        setMissing(true);
      } else {
        setSessionId(found.sessionId);
        setCreatedAt(found.createdAt);
        setText(found.text);
        setNotes(found.notes ?? '');
        setAnswer(found.answer ?? '');
        setDone(found.done);
        setPhotos(images.map((i) => ({ id: i.id, dataUrl: i.dataUrl, createdAt: i.createdAt, kind: i.kind ?? 'prompt', persisted: true })));
      }
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [repo, param, isNew]);

  useEffect(
    () => {
      didUnmount.current = false;
      return () => {
        didUnmount.current = true;
        const v = latest.current;
        if (!dirty.current || !v.text.trim()) return;
        void (async () => {
          try {
            await repo.saveHomework({
              id: v.id,
              sessionId: v.sessionId,
              text: v.text.trim(),
              ...(v.notes.trim() ? { notes: v.notes.trim() } : {}),
              ...(v.answer.trim() ? { answer: v.answer.trim() } : {}),
              done: v.done,
              createdAt: v.createdAt,
            });
            for (const photo of v.photos.filter((p) => !p.persisted)) {
              await repo.saveHomeworkImage({ id: photo.id, homeworkId: v.id, kind: photo.kind, dataUrl: photo.dataUrl, createdAt: photo.createdAt });
            }
          } catch {
            // Leaving must never throw; the person can open the homework again and save.
          }
        })();
      };
    },
    [repo],
  );

  async function persist(doneValue: boolean): Promise<boolean> {
    if (addingPhotos.current) {
      setNotice('');
      setError(t({ ar: 'أنتظر انتهاء تجهيز الصور قبل الحفظ.', en: 'I am waiting for the photos to finish preparing before I save.' }));
      return false;
    }
    const title = text.trim();
    if (!title) {
      setNotice('');
      setError(t({ ar: 'أكتب ما الواجب أولًا.', en: 'I write what the homework is first.' }));
      return false;
    }
    setBusy(true);
    setError('');
    try {
      await repo.saveHomework({
        id,
        sessionId,
        text: title,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(answer.trim() ? { answer: answer.trim() } : {}),
        done: doneValue,
        createdAt,
      });
      // The row exists from here on, even if a photo below fails: delete and the tick must work, and a retry reuses the ids.
      setPersisted(true);
      for (const photo of photos.filter((p) => !p.persisted)) {
        await repo.saveHomeworkImage({ id: photo.id, homeworkId: id, kind: photo.kind, dataUrl: photo.dataUrl, createdAt: photo.createdAt });
        setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, persisted: true } : p)));
      }
      dirty.current = false;
      setNotice(t({ ar: 'حفظتُ الواجب.', en: 'I saved the homework.' }));
      // From now on this is the homework's own page: a reload or a second save must not start a new one.
      if (isNew) {
        skipLoad.current = id;
        navigate(`/therapist/homework/${id}`, { replace: true });
      }
      return true;
    } catch {
      setNotice('');
      setError(t({ ar: 'تعذّر حفظ الواجب، يمكنني المحاولة مرة أخرى.', en: 'Could not save the homework. I can try again.' }));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleDone(value: boolean) {
    setDone(value);
    if (!persisted) {
      dirty.current = true;
      return;
    }
    if (!(await persist(value))) setDone(!value);
  }

  async function addPhotos(files: FileList | null, kind: Stored['kind']) {
    if (addingPhotos.current) return;
    addingPhotos.current = true;
    setError('');
    setNotice('');
    let count = photos.length;
    setBusy(true);
    try {
      for (const file of Array.from(files ?? [])) {
        if (count >= MAX_PHOTOS) {
          if (!didUnmount.current) setError(t({ ar: 'وصلتُ إلى الحد الأقصى: ٦ صور.', en: 'I have reached the limit: 6 photos.' }));
          break;
        }
        try {
          const dataUrl = await shrinkImage(file);
          const photo: Stored = { id: newId(), dataUrl, createdAt: new Date().toISOString(), kind, persisted: false };
          if (persisted) {
            await repo.saveHomeworkImage({ id: photo.id, homeworkId: id, kind, dataUrl, createdAt: photo.createdAt });
            photo.persisted = true;
          } else if (didUnmount.current && latest.current.text.trim()) {
            const v = latest.current;
            await repo.saveHomework({
              id: v.id,
              sessionId: v.sessionId,
              text: v.text.trim(),
              ...(v.notes.trim() ? { notes: v.notes.trim() } : {}),
              ...(v.answer.trim() ? { answer: v.answer.trim() } : {}),
              done: v.done,
              createdAt: v.createdAt,
            });
            await repo.saveHomeworkImage({ id: photo.id, homeworkId: v.id, kind, dataUrl, createdAt: photo.createdAt });
            photo.persisted = true;
          } else {
            dirty.current = true;
          }
          count += 1;
          if (!didUnmount.current) setPhotos((list) => [...list, photo]);
        } catch (e) {
          if (!didUnmount.current) {
            setError(
              e instanceof ImageError
                ? e.code === 'not-image'
                  ? t({ ar: 'الملف ليس صورة.', en: 'The file is not a picture.' })
                  : t({ ar: 'لا أستطيع قراءة هذه الصورة.', en: 'I cannot read this picture.' })
                : t({ ar: 'تعذّر حفظ الصورة، يمكنني المحاولة مرة أخرى.', en: 'Could not save the picture. I can try again.' }),
            );
          }
          break;
        }
      }
    } finally {
      addingPhotos.current = false;
      if (!didUnmount.current) setBusy(false);
      for (const input of [promptFileInput, promptCameraInput, answerFileInput, answerCameraInput]) {
        if (input.current) input.current.value = '';
      }
    }
  }

  async function removePhoto(photo: Photo) {
    const stored = photos.find((p) => p.id === photo.id);
    try {
      if (stored?.persisted) await repo.deleteHomeworkImage(photo.id);
      else dirty.current = true;
      setPhotos((list) => list.filter((p) => p.id !== photo.id));
    } catch {
      setError(t({ ar: 'تعذّر حذف الصورة، يمكنني المحاولة مرة أخرى.', en: 'Could not delete the picture. I can try again.' }));
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await repo.deleteHomework(id);
      dirty.current = false;
      navigate('/therapist/homework');
    } catch {
      setError(t({ ar: 'تعذّر حذف الواجب، يمكنني المحاولة مرة أخرى.', en: 'Could not delete the homework. I can try again.' }));
      setBusy(false);
    }
  }

  if (!loaded) return null;
  if (missing) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/therapist/homework" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">{t({ ar: '‹ واجباتي', en: '‹ My homework' })}</Link>
        <p className="m-0 text-[15px] leading-8">{t({ ar: 'لا أجد هذا الواجب.', en: 'I cannot find this homework.' })}</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link
        to={sessionId ? `/therapist/note/${sessionId}` : '/therapist/homework'}
        className="flex min-h-11 items-center text-[15px] font-semibold text-teal"
      >
        {sessionId ? t({ ar: '‹ ملاحظات الجلسة', en: '‹ Session notes' }) : t({ ar: '‹ واجباتي', en: '‹ My homework' })}
      </Link>
      <h1 className="text-2xl font-bold leading-snug">{isNew ? t({ ar: 'واجب جديد', en: 'New homework' }) : t({ ar: 'الواجب', en: 'The homework' })}</h1>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="hw-title" className={label}>{t({ ar: 'ما الواجب؟', en: 'What is the homework?' })}</label>
        <input id="hw-title" type="text" value={text} onChange={(e) => {
            dirty.current = true;
            setText(e.target.value);
          }} className={`${field} min-h-12`} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="hw-notes" className={label}>{t({ ar: 'ملاحظات', en: 'Notes' })}</label>
        <textarea id="hw-notes" rows={3} value={notes} onChange={(e) => {
            dirty.current = true;
            setNotes(e.target.value);
          }} className={`${field} py-3`} />
      </div>

      <section aria-labelledby="hw-photos" className="flex flex-col gap-2">
        <h2 id="hw-photos" className={label}>{t({ ar: 'صور الواجب', en: 'Homework photos' })}</h2>
        {photos.some((p) => p.kind === 'prompt') && <PhotoGrid photos={photos.filter((p) => p.kind === 'prompt')} disabled={busy} onOpen={setViewer} onRemove={(p) => void removePhoto(p)} />}
        <input
          ref={promptFileInput}
          type="file"
          accept="image/*"
          multiple
          aria-label={t({ ar: 'اختيار صور الواجب', en: 'Choose homework photos' })}
          className="sr-only"
          onChange={(e) => void addPhotos(e.target.files, 'prompt')}
        />
        <input ref={promptCameraInput} type="file" accept="image/*" capture="environment" aria-label={t({ ar: 'التقاط صورة للواجب', en: 'Take a photo of the homework' })} className="sr-only" onChange={(e) => void addPhotos(e.target.files, 'prompt')} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={busy || photos.length >= MAX_PHOTOS} onClick={() => promptFileInput.current?.click()} className={`${secondary} flex-none disabled:opacity-50`}>{t({ ar: 'أضيف صورة', en: 'Add a photo' })}</button>
          <button type="button" disabled={busy || photos.length >= MAX_PHOTOS} onClick={() => promptCameraInput.current?.click()} className={`${secondary} flex-none disabled:opacity-50`}>{t({ ar: 'ألتقط صورة', en: 'Take a photo' })}</button>
        </div>
        {!persisted && photos.length > 0 && <p className="m-0 text-xs text-muted">{t({ ar: 'تُحفظ الصور مع الواجب عند الحفظ أو عند الخروج.', en: 'The photos are saved with the homework when I save or leave.' })}</p>}
      </section>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="hw-answer" className={label}>{t({ ar: 'إجابتي', en: 'My answer' })}</label>
        <textarea id="hw-answer" rows={5} value={answer} onChange={(e) => {
            dirty.current = true;
            setAnswer(e.target.value);
          }} className={`${field} py-3`} />
      </div>

      <section aria-labelledby="hw-answer-photos" className="flex flex-col gap-2">
        <h2 id="hw-answer-photos" className={label}>{t({ ar: 'صور الإجابة الخاصة', en: 'My private answer photos' })}</h2>
        {photos.some((p) => p.kind === 'answer') && <PhotoGrid photos={photos.filter((p) => p.kind === 'answer')} disabled={busy} itemLabel={t({ ar: 'صورة الإجابة', en: 'Answer photo' })} onOpen={setViewer} onRemove={(p) => void removePhoto(p)} />}
        <input ref={answerFileInput} type="file" accept="image/*" multiple aria-label={t({ ar: 'اختيار صور الإجابة', en: 'Choose answer photos' })} className="sr-only" onChange={(e) => void addPhotos(e.target.files, 'answer')} />
        <input ref={answerCameraInput} type="file" accept="image/*" capture="environment" aria-label={t({ ar: 'التقاط صورة للإجابة', en: 'Take a photo for the answer' })} className="sr-only" onChange={(e) => void addPhotos(e.target.files, 'answer')} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={busy || photos.length >= MAX_PHOTOS} onClick={() => answerFileInput.current?.click()} className={`${secondary} flex-none disabled:opacity-50`}>{t({ ar: 'أختار صورة للإجابة', en: 'Choose a photo for the answer' })}</button>
          <button type="button" disabled={busy || photos.length >= MAX_PHOTOS} onClick={() => answerCameraInput.current?.click()} className={`${secondary} flex-none disabled:opacity-50`}>{t({ ar: 'ألتقط صورة للإجابة', en: 'Take a photo for the answer' })}</button>
        </div>
        <p className="m-0 text-xs leading-6 text-muted">{t({ ar: 'صور الإجابة خاصة ولا تظهر في ملخّص المعالج.', en: 'Answer photos are private and do not appear in the therapist summary.' })}</p>
      </section>

      <label className="flex min-h-12 cursor-pointer items-center gap-3 text-[15px] font-medium">
        <input type="checkbox" checked={done} disabled={busy} onChange={(e) => void toggleDone(e.target.checked)} className="plan-check !mt-0" />
        {t({ ar: 'أنجزتُ هذا الواجب', en: 'I have done this homework' })}
      </label>

      {error && <p role="alert" className="m-0 text-sm font-semibold leading-7 text-ink">{error}</p>}
      {notice && <p role="status" className="m-0 text-sm font-semibold leading-7 text-teal-ink">{notice}</p>}

      <button type="button" onClick={() => void persist(done)} disabled={busy} className={`${primary} flex-none`}>{t({ ar: 'حفظ', en: 'Save' })}</button>

      {persisted &&
        (confirming ? (
          <div role="group" aria-label={t({ ar: 'تأكيد الحذف', en: 'Confirm deletion' })} className="flex flex-col gap-3 rounded-2xl bg-teal-soft p-4">
            <p className="m-0 text-[15px] font-semibold leading-8 text-teal-ink">{t({ ar: 'أحذف هذا الواجب مع صوره؟ لا يمكن التراجع عن ذلك.', en: 'Delete this homework and its photos? This cannot be undone.' })}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void remove()} disabled={busy} className="min-h-12 flex-1 rounded-full bg-ink px-5 text-[15px] font-bold text-card disabled:opacity-50">{t({ ar: 'نعم، أحذف', en: 'Yes, delete' })}</button>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={secondary}>{t({ ar: 'إلغاء الحذف', en: 'Cancel deletion' })}</button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="min-h-12 rounded-full border border-line bg-card px-5 text-[15px] font-semibold text-ink disabled:opacity-50">{t({ ar: 'حذف الواجب', en: 'Delete the homework' })}</button>
        ))}

      {viewer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t({ ar: 'عرض الصورة', en: 'View the photo' })}
          onKeyDown={(e) => e.key === 'Escape' && setViewer(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-4"
        >
          <img src={viewer.dataUrl} alt={t({ ar: 'الصورة مكبّرة', en: 'Enlarged photo' })} className="max-h-[75vh] max-w-full rounded-2xl object-contain" />
          <button type="button" autoFocus onClick={() => setViewer(null)} className="min-h-12 rounded-full bg-card px-8 text-[15px] font-bold text-ink">{t({ ar: 'إغلاق', en: 'Close' })}</button>
        </div>
      )}
    </div>
  );
}
