import { useEffect, useState } from 'react';
import { practiceById } from '../../content/practices';
import { useRepo } from '../../db/RepoContext';
import type { PracticeRecord } from '../../db/schema';
import { JournalRecord, recordDateLabel, recordTime } from '../triggers/JournalRecord';
import { useI18n } from '../../i18n/LanguageProvider';

/** The finished practices of one step, newest first, so what was written can be found again. */
export function StepRecords({ stepId }: { stepId: number }) {
  const repo = useRepo();
  const { t } = useI18n();
  const [rows, setRows] = useState<PracticeRecord[]>([]);

  useEffect(() => {
    let alive = true;
    void repo.listPractices().then((records) => {
      if (alive) setRows(records);
    });
    return () => {
      alive = false;
    };
  }, [repo]);

  const entries = rows
    .flatMap((record) => {
      const def = practiceById(record.practiceId);
      return record.completedAt && def?.stepId === stepId ? [{ record, def }] : [];
    })
    .sort((a, b) => recordTime(b.record) - recordTime(a.record));

  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold">
        {t({ ar: 'ما كتبتُه في هذه الخطوة · {count}', en: 'What I wrote in this step · {count}' }, { count: entries.length })}
      </h2>
      <ul aria-label={t({ ar: 'ما كتبتُه في هذه الخطوة', en: 'What I wrote in this step' })} className="m-0 flex list-none flex-col gap-3 p-0">
        {entries.map(({ record, def }) => (
          <li key={record.id}>
            <details className="overflow-hidden rounded-2xl border border-line bg-card">
              <summary className="min-h-14 cursor-pointer p-4">
                <span className="mb-2 block text-xs leading-6 text-muted">
                  {t(def.title)} · {recordDateLabel(record)}
                </span>
                <span className="mt-2 block text-[13px] font-semibold text-teal">
                  {t({ ar: 'أقرأ ما كتبتُه', en: 'Read what I wrote' })}
                </span>
              </summary>
              <JournalRecord
                record={record}
                def={def}
                editable={false}
                onDeleted={(id) => setRows((current) => current.filter((r) => r.id !== id))}
              />
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
