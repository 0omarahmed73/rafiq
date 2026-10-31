import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readinessQuestions } from '../../content/readiness';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { ReadinessCheck } from './ReadinessCheck';

function setup(repo: Repo = createMemoryRepo(), stepId = 2) {
  render(
    <RepoProvider repo={repo}>
      <ReadinessCheck stepId={stepId} />
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
