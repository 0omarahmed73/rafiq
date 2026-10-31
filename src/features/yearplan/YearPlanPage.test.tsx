import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { YEAR_MONTHS } from '../../content/yearPlan';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { YearPlanPage } from './YearPlanPage';

function setup(repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <YearPlanPage />
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

const first = YEAR_MONTHS[0].weeks[0].tasks[0];

describe('YearPlanPage', () => {
  it('shows the vision, the goals and the progress at zero', async () => {
    setup();
    expect(await screen.findByText('السكون · الاستقرار · الاستقلال')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox', { name: /^هدف:/ })).toHaveLength(12);
    expect(screen.getByText(/^التقدم: ٠٪/)).toBeInTheDocument();
  });

  it('saves a ticked task and shows the month percentage', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByText(YEAR_MONTHS[0].name));
    await user.click(screen.getByRole('checkbox', { name: first }));

    expect((await repo.listYearPlan()).map((e) => [e.id, e.value])).toEqual([['t:0:0:0', true]]);
    const month = screen.getByRole('group', { name: YEAR_MONTHS[0].name });
    expect(within(month).getByText(/تقدم الشهر: ٨٪/)).toBeInTheDocument();
  });

  it('restores ticks and notes saved earlier', async () => {
    const repo = createMemoryRepo();
    await repo.saveYearPlanEntry({ id: 't:0:0:0', value: true });
    await repo.saveYearPlanEntry({ id: 'n:m0', value: 'كتبتها قبل' });
    const { user } = setup(repo);
    await user.click(await screen.findByText(YEAR_MONTHS[0].name));

    expect(screen.getByRole('checkbox', { name: first })).toBeChecked();
    const month = screen.getByRole('group', { name: YEAR_MONTHS[0].name });
    expect(within(month).getByRole('textbox', { name: 'ملاحظات الشهر' })).toHaveValue('كتبتها قبل');
  });

  it('saves a month note as typed', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByText(YEAR_MONTHS[0].name));
    const month = screen.getByRole('group', { name: YEAR_MONTHS[0].name });
    await user.type(within(month).getByRole('textbox', { name: 'ملاحظات الشهر' }), 'جيد');

    await vi.waitFor(async () => {
      expect((await repo.listYearPlan()).find((e) => e.id === 'n:m0')?.value).toBe('جيد');
    });
  });

  it('saves the answers of the year review', async () => {
    const { repo, user } = setup();
    await user.type(await screen.findByRole('textbox', { name: 'ما الذي نجح معي هذا العام؟' }), 'الهدوء');
    await vi.waitFor(async () => {
      expect((await repo.listYearPlan()).find((e) => e.id === 'r:0')?.value).toBe('الهدوء');
    });
  });
});
