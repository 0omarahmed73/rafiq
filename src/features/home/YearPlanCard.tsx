import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { toArabicDigits } from '../../lib/digits';
import { DEFAULT_AGE, overall, planTitle, toMap } from '../yearplan/progress';

export function YearPlanCard() {
  const repo = useRepo();
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
      <span className="text-sm text-muted">السكون · الاستقرار · الاستقلال</span>
      {progress && (
        <span className="text-sm font-semibold text-teal">
          {`${toArabicDigits(progress.tasksDone)} من ${toArabicDigits(progress.tasksTotal)} خطوة · ${toArabicDigits(progress.percent)}٪`}
        </span>
      )}
    </Link>
  );
}
