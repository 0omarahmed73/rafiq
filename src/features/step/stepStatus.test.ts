import { createMemoryRepo } from '../../db/memoryRepo';
import { currentStepId, markPracticed } from './stepStatus';

describe('markPracticed', () => {
  it('records the day once, however many times it is called', async () => {
    const repo = createMemoryRepo();
    await markPracticed(repo, 2, '2026-10-31');
    await markPracticed(repo, 2, '2026-10-31');
    expect((await repo.getStepProgress(2)).daysPracticed).toEqual(['2026-10-31']);
  });

  it('keeps the days sorted and moves the step to in progress', async () => {
    const repo = createMemoryRepo();
    await markPracticed(repo, 2, '2026-11-02');
    await markPracticed(repo, 2, '2026-10-31');
    const progress = await repo.getStepProgress(2);
    expect(progress.daysPracticed).toEqual(['2026-10-31', '2026-11-02']);
    expect(progress.status).toBe('inProgress');
  });

  it('does not take a finished step back to in progress', async () => {
    const repo = createMemoryRepo();
    await repo.saveStepProgress({ stepId: 2, status: 'done', daysPracticed: [] });
    await markPracticed(repo, 2, '2026-10-31');
    expect((await repo.getStepProgress(2)).status).toBe('done');
  });

  it('leaves other steps untouched', async () => {
    const repo = createMemoryRepo();
    await markPracticed(repo, 2, '2026-10-31');
    expect((await repo.getStepProgress(3)).status).toBe('notStarted');
  });
});

describe('currentStepId', () => {
  it('is step 1 when nothing has been done', async () => {
    expect(await currentStepId(createMemoryRepo())).toBe(1);
  });

  it('is the first step that is not done', async () => {
    const repo = createMemoryRepo();
    await repo.saveStepProgress({ stepId: 1, status: 'done', daysPracticed: [] });
    await repo.saveStepProgress({ stepId: 2, status: 'done', daysPracticed: [] });
    expect(await currentStepId(repo)).toBe(3);
  });

  it('stays on step 10 when every step is done', async () => {
    const repo = createMemoryRepo();
    for (let id = 1; id <= 10; id++) {
      await repo.saveStepProgress({ stepId: id, status: 'done', daysPracticed: [] });
    }
    expect(await currentStepId(repo)).toBe(10);
  });
});
