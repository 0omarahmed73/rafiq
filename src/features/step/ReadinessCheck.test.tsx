import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { readinessQuestions } from '../../content/readiness';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { ReadinessCheck } from './ReadinessCheck';

function setup(repo: Repo = createMemoryRepo(), stepId = 2) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter><ReadinessCheck stepId={stepId} /></MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup(), questions: readinessQuestions[stepId] };
}

async function answer(
  user: ReturnType<typeof userEvent.setup>,
  statement: string,
  value: string,
) {
  const group = await screen.findByRole('group', { name: statement });
  await user.click(within(group).getByRole('radio', { name: value }));
}

describe('ReadinessCheck', () => {
  it('asks the three statements on a one to five scale with labelled ends', async () => {
    const { questions } = setup();
    for (const q of questions) {
      const group = await screen.findByRole('group', { name: q });
      expect(within(group).getAllByRole('radio')).toHaveLength(5);
    }
    expect(screen.getAllByText('لا ينطبق')).toHaveLength(3);
    expect(screen.getAllByText('ينطبق تمامًا')).toHaveLength(3);
  });

  it('cannot be saved until all three are answered', async () => {
    const { user, questions } = setup();
    await answer(user, questions[0], '٤');
    expect(screen.getByRole('button', { name: 'حفظ الإجابات' })).toBeDisabled();
  });

  it('says it seems time to move on when the answers are high, and saves them', async () => {
    const { repo, user, questions } = setup();
    await answer(user, questions[0], '٤');
    await answer(user, questions[1], '٤');
    await answer(user, questions[2], '٣');
    await user.click(screen.getByRole('button', { name: 'حفظ الإجابات' }));

    expect(await screen.findByText('يبدو أن الوقت مناسب للانتقال إلى الخطوة التالية.')).toBeInTheDocument();
    const saved = (await repo.getStepProgress(2)).readiness;
    expect(saved?.answers).toEqual([4, 4, 3]);
    expect(saved?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('suggests staying a little longer when the answers are low', async () => {
    const { user, questions } = setup();
    await answer(user, questions[0], '٢');
    await answer(user, questions[1], '٣');
    await answer(user, questions[2], '٣');
    await user.click(screen.getByRole('button', { name: 'حفظ الإجابات' }));

    expect(await screen.findByText('من الأفضل البقاء قليلًا في هذه الخطوة.')).toBeInTheDocument();
  });

  it('lets the user finish the step whatever the result', async () => {
    const { repo, user, questions } = setup();
    await answer(user, questions[0], '١');
    await answer(user, questions[1], '١');
    await answer(user, questions[2], '١');
    await user.click(screen.getByRole('button', { name: 'حفظ الإجابات' }));
    await user.click(await screen.findByRole('button', { name: 'أنهيتُ هذه الخطوة' }));

    expect((await repo.getStepProgress(2)).status).toBe('done');
  });

  it('shows earlier answers and result when the step was already checked', async () => {
    const repo = createMemoryRepo();
    await repo.saveStepProgress({
      stepId: 2,
      status: 'inProgress',
      daysPracticed: [],
      readiness: { answers: [5, 5, 5], at: '2026-10-31T10:00:00.000Z' },
    });
    const { questions } = setup(repo);

    expect(await screen.findByText('يبدو أن الوقت مناسب للانتقال إلى الخطوة التالية.')).toBeInTheDocument();
    const group = screen.getByRole('group', { name: questions[0] });
    expect(within(group).getByRole('radio', { name: '٥' })).toBeChecked();
  });
});


describe('ReadinessCheck completion flow', () => {
  it('lets me complete a step without making readiness answers a gate', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByRole('button', { name: 'أنهيتُ هذه الخطوة' }));
    await waitFor(async () => expect((await repo.getStepProgress(2)).status).toBe('done'));
    expect(screen.getByRole('link', { name: 'أنتقل إلى الخطوة التالية' })).toHaveAttribute('href', '/step/3');
    expect(screen.getByText('أقدّر ما أنجزتُه في هذه الخطوة.')).toBeVisible();
    expect((await repo.getStepProgress(2)).readiness).toBeUndefined();
  });

  it('keeps the next action available when a completed step is reopened', async () => {
    const repo = createMemoryRepo();
    await repo.saveStepProgress({ stepId: 4, status: 'done', daysPracticed: [] });
    setup(repo, 4);
    expect(await screen.findByRole('link', { name: 'أنتقل إلى الخطوة التالية' })).toHaveAttribute('href', '/step/5');
    expect(screen.queryByRole('button', { name: 'أنهيتُ هذه الخطوة' })).not.toBeInTheDocument();
  });

  it('returns to the journey after step ten instead of creating step eleven', async () => {
    const repo = createMemoryRepo();
    await repo.saveStepProgress({ stepId: 10, status: 'done', daysPracticed: [] });
    setup(repo, 10);
    expect(await screen.findByRole('link', { name: 'أعود إلى رحلتي' })).toHaveAttribute('href', '/journey');
    expect(screen.queryByRole('link', { name: 'أنتقل إلى الخطوة التالية' })).not.toBeInTheDocument();
  });

  it('does not celebrate or advance when completion could not be saved', async () => {
    const { repo, user } = setup();
    await screen.findByRole('button', { name: 'أنهيتُ هذه الخطوة' });
    vi.spyOn(repo, 'saveStepProgress').mockRejectedValueOnce(new Error('write unavailable'));
    await user.click(screen.getByRole('button', { name: 'أنهيتُ هذه الخطوة' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('أحتاج إلى المحاولة مرة أخرى لحفظ إتمام هذه الخطوة.');
    expect(screen.queryByRole('link', { name: 'أنتقل إلى الخطوة التالية' })).not.toBeInTheDocument();
    expect((await repo.getStepProgress(2)).status).toBe('notStarted');
  });
});
