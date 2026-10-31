import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { weeklyQuestions } from '../../content/weeklyQuestions';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { WeeklyReviewCard } from './WeeklyReviewCard';

async function withLastWeekCheckin(repo: Repo) {
  await repo.addCheckin({
    at: '2026-10-26T10:00:00.000Z',
    day: '2026-10-26',
    emotions: ['anxiety'],
    intensity: 6,
    tags: [],
    forNextSession: false,
  });
}

function setup(repo: Repo) {
  const { container } = render(
    <RepoProvider repo={repo}>
      <WeeklyReviewCard today={new Date(2026, 9, 31)} />
    </RepoProvider>,
  );
  return { container, user: userEvent.setup() };
}

describe('WeeklyReviewCard', () => {
  it('renders nothing when last week has no check-ins', async () => {
    const { container } = setup(createMemoryRepo());
    await new Promise((r) => setTimeout(r, 30));
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the week summary and the question when last week has check-ins', async () => {
    const repo = createMemoryRepo();
    await withLastWeekCheckin(repo);
    setup(repo);

    expect(await screen.findByText('مراجعة الأسبوع جاهزة')).toBeInTheDocument();
    expect(screen.getByText(/قلق/)).toBeInTheDocument();
    // The week starting 2026-10-24 is 42 weeks after the question epoch (2026-01-03).
    expect(screen.getByText(weeklyQuestions[42 % weeklyQuestions.length])).toBeInTheDocument();
  });

  it('saves the answer to the question', async () => {
    const repo = createMemoryRepo();
    await withLastWeekCheckin(repo);
    const { user } = setup(repo);

    await user.type(await screen.findByRole('textbox', { name: 'إجابتي' }), 'حين جلستُ وحدي');
    await user.click(screen.getByRole('button', { name: 'حفظ إجابتي' }));

    expect((await repo.listWeeklyReviews())[0].answer).toBe('حين جلستُ وحدي');
  });

  it('shares the review with the therapist only when its switch is turned on', async () => {
    const repo = createMemoryRepo();
    await withLastWeekCheckin(repo);
    const { user } = setup(repo);

    const sw = await screen.findByRole('switch', { name: 'مشاركة مع معالجي' });
    expect((await repo.listWeeklyReviews())[0].share).toBe(false);
    await user.click(sw);
    expect((await repo.listWeeklyReviews())[0].share).toBe(true);
  });
});
