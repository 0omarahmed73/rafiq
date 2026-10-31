import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { toArabicDigits } from '../../lib/digits';
import { overall, toMap } from '../yearplan/progress';

export function YearPlanCard() {
  const repo = useRepo();
  const [progress, setProgress] = useState<ReturnType<typeof overall>>();

  useEffect(() => {
    let alive = true;
    void repo.listYearPlan().then((rows) => alive && setProgress(overall(toMap(rows))));
    return () => {
      alive = false;
    };
  }, [repo]);

  return (
    <Link to="/year" className="flex flex-col gap-1 rounded-2xl border border-line bg-card p-4">
      <span className="text-[17px] font-bold">عامي الخامس والعشرون</span>
      <span className="text-sm text-muted">السكون · الاستقرار · الاستقلال</span>
      {progress && (
        <span className="text-sm font-semibold text-teal">
          {`${toArabicDigits(progress.tasksDone)} من ${toArabicDigits(progress.tasksTotal)} خطوة · ${toArabicDigits(progress.percent)}٪`}
        </span>
      )}
    </Link>
  );
}
