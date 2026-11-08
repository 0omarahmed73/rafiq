import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { MUTATING_METHODS, READING_METHODS, withChangeSignal } from './changeSignal';

describe('withChangeSignal', () => {
  it('classifies every Repo method exactly once', () => {
    expect([...MUTATING_METHODS, ...READING_METHODS].sort()).toEqual(Object.keys(createMemoryRepo()).sort());
  });

  it('signals once after each mutation resolves', async () => {
    const methods = Object.fromEntries(
      Object.keys(createMemoryRepo()).map((method) => [method, vi.fn().mockResolvedValue(undefined)]),
    ) as Record<string, () => Promise<unknown>>;
    const onChange = vi.fn();
    const repo = withChangeSignal(methods as unknown as Repo, onChange) as unknown as Record<
      string,
      () => Promise<unknown>
    >;

    for (const method of MUTATING_METHODS) {
      onChange.mockClear();
      await repo[method]();
      expect(onChange).toHaveBeenCalledTimes(1);
    }
  });

  it('signals only after the mutation promise resolves', async () => {
    const raw = createMemoryRepo();
    let resolve!: () => void;
    const pending = new Promise<void>((done) => {
      resolve = done;
    });
    vi.spyOn(raw, 'saveSettings').mockReturnValue(pending);
    const onChange = vi.fn();
    const result = withChangeSignal(raw, onChange).saveSettings({ id: 'settings', theme: 'system' });

    expect(onChange).not.toHaveBeenCalled();
    resolve();
    await result;
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not signal readers or rejected mutations', async () => {
    const methods = Object.fromEntries(
      Object.keys(createMemoryRepo()).map((method) => [method, vi.fn().mockResolvedValue(undefined)]),
    ) as Record<string, () => Promise<unknown>>;
    const onChange = vi.fn();
    const repo = withChangeSignal(methods as unknown as Repo, onChange) as unknown as Record<
      string,
      () => Promise<unknown>
    >;

    for (const method of READING_METHODS) await repo[method]();
    expect(onChange).not.toHaveBeenCalled();

    const failure = new Error('write failed');
    methods.saveSettings = vi.fn().mockRejectedValue(failure);
    await expect(repo.saveSettings()).rejects.toBe(failure);
    expect(onChange).not.toHaveBeenCalled();
  });
});
