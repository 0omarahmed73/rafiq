import type { Repo } from '../../db/repo';

const LAST_STEP = 10;

/** The lowest step that is not done, or the last step when all are done. */
export async function currentStepId(repo: Repo): Promise<number> {
  for (let id = 1; id <= LAST_STEP; id++) {
    if ((await repo.getStepProgress(id)).status !== 'done') return id;
  }
  return LAST_STEP;
}
