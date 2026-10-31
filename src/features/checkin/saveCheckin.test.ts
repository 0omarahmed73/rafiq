import { createMemoryRepo } from '../../db/memoryRepo';
import { saveCheckin, ValidationError } from './saveCheckin';

const wholeRange = { from: '2000-01-01', to: '2999-12-31' };

describe('saveCheckin', () => {
  it('rejects a check-in with no emotion and saves nothing', async () => {
    const repo = createMemoryRepo();
    await expect(saveCheckin(repo, { emotions: [], intensity: 5 })).rejects.toThrow(
      new ValidationError('أختار شعورًا واحدًا على الأقل'),
    );
    expect(await repo.listCheckins(wholeRange)).toHaveLength(0);
  });

  it.each([11, -1, 2.5])('rejects the intensity %s', async (intensity) => {
    const repo = createMemoryRepo();
    await expect(saveCheckin(repo, { emotions: ['sadness'], intensity })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await repo.listCheckins(wholeRange)).toHaveLength(0);
  });

  it('files a check-in made at 23:59 under that local day', async () => {
    const repo = createMemoryRepo();
    const saved = await saveCheckin(
      repo,
      { emotions: ['sadness'], intensity: 5 },
      new Date(2026, 9, 31, 23, 59),
    );
    expect(saved.day).toBe('2026-10-31');
  });

  it('files a check-in made at 00:01 under the next local day', async () => {
    const repo = createMemoryRepo();
    const saved = await saveCheckin(
      repo,
      { emotions: ['sadness'], intensity: 5 },
      new Date(2026, 10, 1, 0, 1),
    );
    expect(saved.day).toBe('2026-11-01');
  });

  it('defaults tags to none and the next-session flag to off', async () => {
    const repo = createMemoryRepo();
    const saved = await saveCheckin(repo, { emotions: ['calm'], intensity: 0 });
    expect(saved.tags).toEqual([]);
    expect(saved.forNextSession).toBe(false);
    expect(saved.intensity).toBe(0);
  });
});
