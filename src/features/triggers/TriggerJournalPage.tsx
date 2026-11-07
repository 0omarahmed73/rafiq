import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { practiceById } from '../../content/practices';
import { useRepo } from '../../db/RepoContext';
import type { PracticeRecord } from '../../db/schema';
import { answerText, JournalRecord, recordDateLabel, recordTime } from './JournalRecord';
import { t } from '../../i18n';

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
      if (alive) setError(t({ ar: 'أحتاج إلى إعادة فتح سجلي لقراءة ما حفظتُه.', en: 'I need to open my record again to read what I saved.' }));
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
      <Link to="/step/4" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">{t({ ar: '‹ فهم الذات', en: '‹ Understanding myself' })}</Link>
      <header>
        <h1 className="mb-2 text-[28px] font-bold leading-snug">{t({ ar: 'محفزاتي', en: 'My triggers' })}</h1>
        <p className="m-0 text-[15px] leading-8 text-muted">{t({ ar: 'هنا أعود إلى محفزاتي وما كتبتُه لفهم نفسي. أستطيع حفظ أكثر من سجل، وكل سجل يبقى مستقلًا.', en: 'Here I come back to my triggers and what I wrote to understand myself. I can save more than one record, and each record stays separate.' })}</p>
      </header>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/practice/understand" className="flex min-h-12 items-center justify-center rounded-full bg-teal px-4 text-[15px] font-bold text-card">{hasDraft('understand') ? t({ ar: 'أكمل تتبّع المحفّز', en: 'Continue tracing a trigger' }) : t({ ar: 'أضيف محفزًا', en: 'Add a trigger' })}</Link>
        <Link to="/practice/self-understanding" className="flex min-h-12 items-center justify-center rounded-full border border-teal bg-card px-4 text-[15px] font-bold text-teal-ink">{hasDraft('self-understanding') ? t({ ar: 'أكمل فهم المشكلة', en: 'Continue understanding a problem' }) : t({ ar: 'أبدأ فهم مشكلة', en: 'Start understanding a problem' })}</Link>
      </div>
      <p className="m-0 text-[13px] leading-7 text-muted">{t({ ar: 'سجلاتي على جهازي. أختار بنفسي ما أشاركه مع معالجي.', en: 'My records are on my device. I choose what I share with my therapist.' })}</p>
      {error && <p role="alert" className="rounded-2xl border border-line bg-card p-4 text-sm leading-7">{error}</p>}
      {!rows && !error && <p role="status" className="text-sm text-muted">{t({ ar: 'أقرأ سجلّاتي…', en: 'Reading my records…' })}</p>}
      {notice && <p role="status" className="rounded-xl bg-teal-soft p-3 text-sm font-semibold leading-7 text-teal-ink">{notice}</p>}
      {entries.some(({ record }) => record.id === savedId) && <p role="status" className="rounded-xl bg-teal-soft p-3 text-sm font-semibold leading-7 text-teal-ink">{t({ ar: 'حفظتُ سجلي، ويمكنني العودة إليه هنا.', en: 'I saved my record, and I can come back to it here.' })}</p>}
      {rows && !error && entries.length === 0 && (
        <section className="rounded-2xl border border-dashed border-line bg-card p-5">
          <h2 className="mb-2 text-base font-bold">{t({ ar: 'مساحة لما أكتشفه عن نفسي', en: 'A space for what I discover about myself' })}</h2>
          <p className="m-0 text-[15px] leading-8 text-muted">{t({ ar: 'أبدأ بسجل واحد، وأعود إليه متى شئت. ما أكتبه قبل إنهاء التمرين يبقى مسودة أكملها من الزر أعلاه.', en: 'I start with one record, and I come back to it whenever I like. What I write before finishing the practice stays as a draft that I finish from the button above.' })}</p>
        </section>
      )}
      {entries.length > 0 && (
        <>
          <h2 className="mb-0 mt-1 text-sm font-semibold text-muted">{t({ ar: 'سجلاتي المحفوظة · {count}', en: 'My saved records · {count}' }, { count: entries.length })}</h2>
          <ul aria-label={t({ ar: 'سجلاتي المحفوظة', en: 'My saved records' })} className="m-0 flex list-none flex-col gap-3 p-0">
            {entries.map(({ record, def }) => {
              const title = answerText(def.prompts[0], record.answers[def.prompts[0].id]) || t(def.title);
              return (
                <li key={record.id}>
                  <details data-record={record.id} open={record.id === savedId || undefined} className="overflow-hidden rounded-2xl border border-line bg-card">
                    <summary className="min-h-14 cursor-pointer p-4">
                      <span className="mb-2 block text-xs leading-6 text-muted">{t(def.title)} · {recordDateLabel(record)}</span>
                      <span className="block line-clamp-2 break-words text-base font-semibold leading-8 text-ink">{title}</span>
                      <span className="mt-2 block text-[13px] font-semibold text-teal">{t({ ar: 'أقرأ ما كتبتُه', en: 'Read what I wrote' })}</span>
                    </summary>
                    <JournalRecord
                      record={record}
                      def={def}
                      onSaved={next => {
                        setRows(current => (current ?? []).map(r => (r.id === next.id ? next : r)));
                        setNotice(t({ ar: 'حفظتُ التعديل.', en: 'I saved the edit.' }));
                      }}
                      onDeleted={id => {
                        setRows(current => (current ?? []).filter(r => r.id !== id));
                        setNotice(t({ ar: 'حذفتُ السجل.', en: 'I deleted the record.' }));
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
