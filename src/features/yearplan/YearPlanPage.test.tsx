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

describe('YearPlanPage settings', () => {
  it('is titled with the saved age', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', planAge: 27 });
    setup(repo);
    expect(await screen.findByRole('heading', { name: 'عامي السابع والعشرون' })).toBeInTheDocument();
  });

  it('defaults to the twenty-fifth year starting in October 2026', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'عامي الخامس والعشرون' })).toBeInTheDocument();
    expect(screen.getByLabelText('شهر البداية')).toHaveValue('2026-10');
    expect(screen.getByText(/من أكتوبر ٢٠٢٦ إلى سبتمبر ٢٠٢٧/)).toBeInTheDocument();
  });

  it('saves a new age and start month, relabelling the months and keeping progress', async () => {
    const repo = createMemoryRepo();
    await repo.saveYearPlanEntry({ id: 't:0:0:0', value: true });
    const { user } = setup(repo);
    const age = await screen.findByLabelText('عمري في هذه السنة');
    await user.clear(age);
    await user.type(age, '26');
    await user.clear(screen.getByLabelText('شهر البداية'));
    await user.type(screen.getByLabelText('شهر البداية'), '2027-03');

    expect(await screen.findByRole('heading', { name: 'عامي السادس والعشرون' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'مارس ٢٠٢٧' })).toBeInTheDocument();
    expect(screen.getByText(/من مارس ٢٠٢٧ إلى فبراير ٢٠٢٨/)).toBeInTheDocument();
    await vi.waitFor(async () => {
      const s = await repo.getSettings();
      expect([s.planAge, s.planStart]).toEqual([26, '2027-03']);
    });
    expect((await repo.listYearPlan())[0].value).toBe(true);
  });
});

describe('YearPlanPage', () => {
  it('shows the vision, the goals and the progress at zero', async () => {
    setup();
    expect(await screen.findByText('السكون · الاستقرار · الاستقلال')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox', { name: /^هدف:/ })).toHaveLength(12);
    expect(screen.getByText(/^التقدم: ٠٪/)).toBeInTheDocument();
  });

  it('saves a ticked task and shows the month percentage', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByText('أكتوبر ٢٠٢٦'));
    await user.click(screen.getByRole('checkbox', { name: first }));

    expect((await repo.listYearPlan()).map((e) => [e.id, e.value])).toEqual([['t:0:0:0', true]]);
    const month = screen.getByRole('group', { name: 'أكتوبر ٢٠٢٦' });
    expect(within(month).getByText(/تقدم الشهر: ٨٪/)).toBeInTheDocument();
  });

  it('restores ticks and notes saved earlier', async () => {
    const repo = createMemoryRepo();
    await repo.saveYearPlanEntry({ id: 't:0:0:0', value: true });
    await repo.saveYearPlanEntry({ id: 'n:m0', value: 'كتبتها قبل' });
    const { user } = setup(repo);
    await user.click(await screen.findByText('أكتوبر ٢٠٢٦'));

    expect(screen.getByRole('checkbox', { name: first })).toBeChecked();
    const month = screen.getByRole('group', { name: 'أكتوبر ٢٠٢٦' });
    expect(within(month).getByRole('textbox', { name: 'ملاحظات الشهر' })).toHaveValue('كتبتها قبل');
  });

  it('saves a month note as typed', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByText('أكتوبر ٢٠٢٦'));
    const month = screen.getByRole('group', { name: 'أكتوبر ٢٠٢٦' });
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
