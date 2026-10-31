import type { Repo } from '../../db/repo';
import type { DayKey } from '../../lib/dates';

const LAST_STEP = 10;

/** The lowest step that is not done, or the last step when all are done. */
export async function currentStepId(repo: Repo): Promise<number> {
  for (let id = 1; id <= LAST_STEP; id++) {
    if ((await repo.getStepProgress(id)).status !== 'done') return id;
  }
  return LAST_STEP;
}

/** Records that the user practised this step on `day` (once per day) and starts it if needed. */
export async function markPracticed(repo: Repo, stepId: number, day: DayKey): Promise<void> {
  const progress = await repo.getStepProgress(stepId);
  const daysPracticed = progress.daysPracticed.includes(day)
    ? progress.daysPracticed
    : [...progress.daysPracticed, day].sort();
  await repo.saveStepProgress({
    ...progress,
    daysPracticed,
    status: progress.status === 'done' ? 'done' : 'inProgress',
  });
}
