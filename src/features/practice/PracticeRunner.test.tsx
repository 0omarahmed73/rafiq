import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PracticeDef } from '../../content/schema';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { dayKey } from '../../lib/dates';
import { PracticeRunner } from './PracticeRunner';
import { branchingDef } from './testDefs';

function renderRunner(repo: Repo, def: PracticeDef = branchingDef, onFinished = vi.fn()) {
  const view = render(
    <RepoProvider repo={repo}>
      <PracticeRunner def={def} onFinished={onFinished} />
    </RepoProvider>,
  );
  return { ...view, onFinished, user: userEvent.setup() };
}

const next = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'التالي' }));

describe('PracticeRunner safety', () => {
  const letterDef: PracticeDef = {
    id: 'letter2',
    stepId: 5,
    title: 'رسالة',
    sink: 'letter:self',
    prompts: [{ id: 'l1', kind: 'text', label: 'اكتب رسالة' }],
  };

  async function toFinish(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByRole('textbox', { name: 'اكتب رسالة' }), 'عزيزي أنا');
    await user.click(screen.getByRole('button', { name: 'التالي' }));
  }

  it('saves the text at once when the page is closed, without waiting for the autosave delay', async () => {
    const repo = createMemoryRepo();
    const { user } = renderRunner(repo);
    await user.type(await screen.findByRole('textbox', { name: 'ما الموقف؟' }), 'آخر ما كتبته');
    window.dispatchEvent(new Event('pagehide'));

    expect((await repo.getDraft('t1'))?.answers.p1).toEqual({ text: 'آخر ما كتبته' });
  });

  it('also saves at once when the tab is hidden', async () => {
    const repo = createMemoryRepo();
    const { user } = renderRunner(repo);
    await user.type(await screen.findByRole('textbox', { name: 'ما الموقف؟' }), 'قبل تبديل التبويب');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    expect((await repo.getDraft('t1'))?.answers.p1).toEqual({ text: 'قبل تبديل التبويب' });
  });

  it('still opens the practice when the saved draft cannot be read', async () => {
    const repo = createMemoryRepo();
    repo.getDraft = () => Promise.reject(new Error('storage failed'));
    renderRunner(repo);
    expect(await screen.findByRole('textbox', { name: 'ما الموقف؟' })).toBeInTheDocument();
  });

  it('saves one letter even if the finish button is tapped twice quickly', async () => {
    const repo = createMemoryRepo();
    const { user } = renderRunner(repo, letterDef);
    await toFinish(user);
    await user.dblClick(screen.getByRole('button', { name: 'إنهاء التمرين' }));

    expect(await repo.listLetters()).toHaveLength(1);
    expect(await repo.listPractices()).toHaveLength(1);
  });

  it('says so in Arabic when finishing fails, and lets the user try again', async () => {
    const repo = createMemoryRepo();
    const real = repo.addLetter.bind(repo);
    let failures = 1;
    repo.addLetter = async (l) => {
      if (failures-- > 0) throw new Error('storage failed');
      return real(l);
    };
    const { user, onFinished } = renderRunner(repo, letterDef);
    await toFinish(user);
    await user.click(screen.getByRole('button', { name: 'إنهاء التمرين' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر حفظ التمرين، يمكنني المحاولة مرة أخرى.');
    expect(onFinished).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'إنهاء التمرين' }));
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(await repo.listLetters()).toHaveLength(1);
  });

  it('uses the first person on the final screen', async () => {
    const repo = createMemoryRepo();
    const { user } = renderRunner(repo, letterDef);
    await toFinish(user);
    expect(await screen.findByRole('heading', { name: 'قبل أن أنهي' })).toBeInTheDocument();
    expect(screen.getByText(/ما أكتبه خاص بي/)).toBeInTheDocument();
  });
});

describe('PracticeRunner', () => {
  it('resumes an abandoned practice with the typed text intact', async () => {
    const repo = createMemoryRepo();
    const first = renderRunner(repo);
    await first.user.type(await screen.findByRole('textbox', { name: 'ما الموقف؟' }), 'نص كتبته');
    first.unmount();

    renderRunner(repo);
    expect(await screen.findByRole('textbox', { name: 'ما الموقف؟' })).toHaveValue('نص كتبته');
  });

  it('resumes at the prompt where the user stopped', async () => {
    const repo = createMemoryRepo();
    const first = renderRunner(repo);
    await screen.findByRole('textbox', { name: 'ما الموقف؟' });
    await next(first.user);
    expect(await screen.findByRole('heading', { name: 'ما نوعه؟' })).toBeInTheDocument();
    first.unmount();

    renderRunner(repo);
    expect(await screen.findByRole('heading', { name: 'ما نوعه؟' })).toBeInTheDocument();
  });

  it('asks the gated question only when the condition holds', async () => {
    const repo = createMemoryRepo();
    const { user } = renderRunner(repo);
    await screen.findByRole('textbox', { name: 'ما الموقف؟' });
    await next(user);
    await user.click(screen.getByRole('radio', { name: 'حاجة' }));
    await next(user);
    expect(screen.getByRole('heading', { name: 'أي حاجة؟' })).toBeInTheDocument();
  });

  it('skips the gated question otherwise', async () => {
    const repo = createMemoryRepo();
    const { user } = renderRunner(repo);
    await screen.findByRole('textbox', { name: 'ما الموقف؟' });
    await next(user);
    await user.click(screen.getByRole('radio', { name: 'رغبة' }));
    await next(user);
    expect(screen.getByRole('heading', { name: 'الأسباب' })).toBeInTheDocument();
  });

  it('keeps an answer when going back', async () => {
    const repo = createMemoryRepo();
    const { user } = renderRunner(repo);
    await user.type(await screen.findByRole('textbox', { name: 'ما الموقف؟' }), 'ثابت');
    await next(user);
    await user.click(screen.getByRole('button', { name: 'السابق' }));
    expect(screen.getByRole('textbox', { name: 'ما الموقف؟' })).toHaveValue('ثابت');
  });

  async function finish(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByRole('textbox', { name: 'ما الموقف؟' });
    await next(user);
    await user.click(screen.getByRole('radio', { name: 'رغبة' }));
    await next(user);
    await next(user);
  }

  it('saves private and completed when the final switches are left alone', async () => {
    const repo = createMemoryRepo();
    const { user, onFinished } = renderRunner(repo);
    await finish(user);
    await user.click(screen.getByRole('button', { name: 'إنهاء التمرين' }));

    const [saved] = await repo.listPractices();
    expect(saved.share).toBe(false);
    expect(saved.forNextSession).toBe(false);
    expect(saved.completedAt).toBeTruthy();
    expect(await repo.getDraft('t1')).toBeUndefined();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('marks today as practised on the step when the practice is finished', async () => {
    const repo = createMemoryRepo();
    const { user } = renderRunner(repo);
    await finish(user);
    await user.click(screen.getByRole('button', { name: 'إنهاء التمرين' }));

    const progress = await repo.getStepProgress(branchingDef.stepId);
    expect(progress.status).toBe('inProgress');
    expect(progress.daysPracticed).toEqual([dayKey(new Date())]);
  });

  it('does not mark the step as practised while the practice is only a draft', async () => {
    const repo = createMemoryRepo();
    const { user, unmount } = renderRunner(repo);
    await screen.findByRole('textbox', { name: 'ما الموقف؟' });
    await next(user);
    unmount();
    expect((await repo.getStepProgress(branchingDef.stepId)).daysPracticed).toEqual([]);
  });

  it('saves the next-session flag when its switch is on', async () => {
    const repo = createMemoryRepo();
    const { user } = renderRunner(repo);
    await finish(user);
    await user.click(screen.getByRole('switch', { name: 'للنقاش في الجلسة القادمة' }));
    await user.click(screen.getByRole('button', { name: 'إنهاء التمرين' }));

    const [saved] = await repo.listPractices();
    expect(saved.forNextSession).toBe(true);
    expect(saved.share).toBe(false);
  });

  it('adds the soothing choices of a finished practice to the soothing list', async () => {
    const repo = createMemoryRepo();
    const def: PracticeDef = {
      id: 'soothe1',
      stepId: 1,
      title: 'تهدئة',
      prompts: [{ id: 'soothe', kind: 'list', label: 'ماذا يريحني؟', saveToSoothing: 'step1' }],
    };
    const { user } = renderRunner(repo, def);
    await user.type(await screen.findByRole('textbox', { name: 'إضافة' }), 'مشي قصير');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    await next(user);
    await user.click(screen.getByRole('button', { name: 'إنهاء التمرين' }));

    const list = await repo.listSoothing();
    expect(list.map((s) => [s.text, s.source])).toEqual([['مشي قصير', 'step1']]);
  });

  it('writes a letter for a practice with a letter sink', async () => {
    const repo = createMemoryRepo();
    const def: PracticeDef = {
      id: 'letter1',
      stepId: 5,
      title: 'رسالة',
      sink: 'letter:self',
      prompts: [{ id: 'l1', kind: 'text', label: 'اكتب رسالة' }],
    };
    const { user } = renderRunner(repo, def);
    await user.type(await screen.findByRole('textbox', { name: 'اكتب رسالة' }), 'عزيزي أنا');
    await next(user);
    await user.click(screen.getByRole('button', { name: 'إنهاء التمرين' }));

    const letters = await repo.listLetters();
    expect(letters).toHaveLength(1);
    expect(letters[0]).toMatchObject({ kind: 'self', text: 'عزيزي أنا' });
  });
});
