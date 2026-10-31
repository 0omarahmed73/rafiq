import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { practiceById } from '../../content/practices';
import { useRepo } from '../../db/RepoContext';
import type { PracticeRecord } from '../../db/schema';
import { dayKey, formatArabicFullDate, formatArabicTime } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';
import { answerText, JournalRecord } from './JournalRecord';

function recordTime(record: PracticeRecord): number {
  const value = Date.parse(record.completedAt ?? record.startedAt);
  return Number.isFinite(value) ? value : 0;
}

function dateLabel(record: PracticeRecord): string {
  const at = record.completedAt ?? record.startedAt;
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return 'وقت غير محدّد';
  return `${formatArabicFullDate(dayKey(date))} · ${formatArabicTime(at)}`;
}

export function TriggerJournalPage() {
  const repo = useRepo();
  const location = useLocation();
  const [rows, setRows] = useState<PracticeRecord[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true;
    void repo.listPractices().then(records => {
      if (alive) setRows(records);
    }).catch(() => {
      if (alive) setError('أحتاج إلى إعادة فتح سجلي لقراءة ما حفظتُه.');
    });
    return () => { alive = false; };
  }, [repo]);

  const entries = (rows ?? []).flatMap(record => {
    const def = practiceById(record.practiceId);
    return record.completedAt && def?.stepId === 4 ? [{ record, def }] : [];
  }).sort((a, b) => recordTime(b.record) - recordTime(a.record));
  const hasDraft = (id: string) => rows?.some(row => row.practiceId === id && !row.completedAt);
  const savedId = typeof location.state?.savedRecordId === 'string' ? location.state.savedRecordId : null;

  return (
    <div className="flex flex-col gap-4">
      <Link to="/step/4" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">‹ فهم الذات</Link>
      <header>
        <h1 className="mb-2 text-[28px] font-bold leading-snug">محفزاتي</h1>
        <p className="m-0 text-[15px] leading-8 text-muted">هنا أعود إلى محفزاتي وما كتبتُه لفهم نفسي. أستطيع حفظ أكثر من سجل، وكل سجل يبقى مستقلًا.</p>
      </header>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/practice/understand" className="flex min-h-12 items-center justify-center rounded-full bg-teal px-4 text-[15px] font-bold text-card">{hasDraft('understand') ? 'أكمل تتبّع المحفّز' : 'أضيف محفزًا'}</Link>
        <Link to="/practice/self-understanding" className="flex min-h-12 items-center justify-center rounded-full border border-teal bg-card px-4 text-[15px] font-bold text-teal-ink">{hasDraft('self-understanding') ? 'أكمل فهم المشكلة' : 'أبدأ فهم مشكلة'}</Link>
      </div>
      <p className="m-0 text-[13px] leading-7 text-muted">سجلاتي على جهازي. أختار بنفسي ما أشاركه مع معالجي.</p>
      {error && <p role="alert" className="rounded-2xl border border-line bg-card p-4 text-sm leading-7">{error}</p>}
      {!rows && !error && <p role="status" className="text-sm text-muted">أقرأ سجلّاتي…</p>}
      {notice && <p role="status" className="rounded-xl bg-teal-soft p-3 text-sm font-semibold leading-7 text-teal-ink">{notice}</p>}
      {entries.some(({ record }) => record.id === savedId) && <p role="status" className="rounded-xl bg-teal-soft p-3 text-sm font-semibold leading-7 text-teal-ink">حفظتُ سجلي، ويمكنني العودة إليه هنا.</p>}
      {rows && !error && entries.length === 0 && (
        <section className="rounded-2xl border border-dashed border-line bg-card p-5">
          <h2 className="mb-2 text-base font-bold">مساحة لما أكتشفه عن نفسي</h2>
          <p className="m-0 text-[15px] leading-8 text-muted">أبدأ بسجل واحد، وأعود إليه متى شئت. ما أكتبه قبل إنهاء التمرين يبقى مسودة أكملها من الزر أعلاه.</p>
        </section>
      )}
      {entries.length > 0 && (
        <>
          <h2 className="mb-0 mt-1 text-sm font-semibold text-muted">{`سجلاتي المحفوظة · ${toArabicDigits(entries.length)}`}</h2>
          <ul aria-label="سجلاتي المحفوظة" className="m-0 flex list-none flex-col gap-3 p-0">
            {entries.map(({ record, def }) => {
              const title = answerText(def.prompts[0], record.answers[def.prompts[0].id]) || def.title;
              return (
                <li key={record.id}>
                  <details data-record={record.id} open={record.id === savedId || undefined} className="overflow-hidden rounded-2xl border border-line bg-card">
                    <summary className="min-h-14 cursor-pointer p-4">
                      <span className="mb-2 block text-xs leading-6 text-muted">{def.title} · {dateLabel(record)}</span>
                      <span className="block line-clamp-2 break-words text-base font-semibold leading-8 text-ink">{title}</span>
                      <span className="mt-2 block text-[13px] font-semibold text-teal">أقرأ ما كتبتُه</span>
                    </summary>
                    <JournalRecord
                      record={record}
                      def={def}
                      onSaved={next => {
                        setRows(current => (current ?? []).map(r => (r.id === next.id ? next : r)));
                        setNotice('حفظتُ التعديل.');
                      }}
                      onDeleted={id => {
                        setRows(current => (current ?? []).filter(r => r.id !== id));
                        setNotice('حذفتُ السجل.');
                      }}
                    />
                  </details>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
