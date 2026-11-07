import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { DEFAULT_AGE, overall, planTitle, toMap } from '../yearplan/progress';
import { useI18n } from '../../i18n/LanguageProvider';
import { YEAR_VISION } from '../../content/yearPlan';

export function YearPlanCard() {
  const repo = useRepo();
  const { t } = useI18n();
  const [progress, setProgress] = useState<ReturnType<typeof overall>>();
  const [age, setAge] = useState(DEFAULT_AGE);

  useEffect(() => {
    let alive = true;
    void Promise.all([repo.listYearPlan(), repo.getSettings()]).then(([rows, settings]) => {
      if (!alive) return;
      setProgress(overall(toMap(rows)));
      setAge(settings.planAge ?? DEFAULT_AGE);
    });
    return () => {
      alive = false;
    };
  }, [repo]);

  return (
    <Link to="/year" className="flex flex-col gap-1 rounded-2xl border border-line bg-card p-4">
      <span className="text-[17px] font-bold">{planTitle(age)}</span>
      <span className="text-sm text-muted">{t(YEAR_VISION.motto)}</span>
      {progress && (
        <span className="text-sm font-semibold text-teal">
          {t(
            { ar: '{done} من {total} خطوة · {percent}٪', en: '{done} of {total} steps · {percent}%' },
            { done: progress.tasksDone, total: progress.tasksTotal, percent: progress.percent },
          )}
        </span>
      )}
    </Link>
  );
}
