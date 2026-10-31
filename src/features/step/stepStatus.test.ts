import { createMemoryRepo } from '../../db/memoryRepo';
import { currentStepId } from './stepStatus';

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
