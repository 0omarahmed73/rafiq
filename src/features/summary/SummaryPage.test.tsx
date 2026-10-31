import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { SummaryPage } from './SummaryPage';

function setup(repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <SummaryPage today={new Date(2026, 9, 31)} />
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

describe('SummaryPage', () => {
  it('defaults the range to the current calendar month', async () => {
    setup();
    expect(await screen.findByLabelText('من')).toHaveValue('2026-10-01');
    expect(screen.getByLabelText('إلى')).toHaveValue('2026-10-31');
  });

  it('has the five include-switches, all on by default', async () => {
    setup();
    for (const name of [
      'تسجيلات المشاعر',
      'منحنى الشدّة',
      'مراجعات الأسبوع',
      'الممارسات الموجّهة',
      'ما وسمتُه «للنقاش في الجلسة»',
    ]) {
      expect(await screen.findByRole('checkbox', { name })).toBeChecked();
    }
  });

  it('shows check-ins in the preview and removes them when that switch is turned off', async () => {
    const repo = createMemoryRepo();
    await repo.addCheckin({
      at: new Date(2026, 9, 12, 9, 30).toISOString(),
      day: '2026-10-12',
      emotions: ['sadness'],
      intensity: 6,
      tags: [],
      note: 'ملاحظة ظاهرة',
      forNextSession: false,
    });
    const { user } = setup(repo);
    expect(await screen.findByText('ملاحظة ظاهرة')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'تسجيلات المشاعر' }));
    expect(screen.queryByText('ملاحظة ظاهرة')).not.toBeInTheDocument();
  });

  it('opens the print dialog from the save button', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: 'حفظ كملف PDF' }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it('says nothing is sent automatically', async () => {
    setup();
    expect(await screen.findByText('لا يُرسل شيء تلقائيًا، وأنا أختار ما يدخل في الملخّص.')).toBeInTheDocument();
  });
});

describe('SummaryPage printing in colour', () => {
  it('uses the light colours of the chosen accent while printing, then puts the theme back', async () => {
    document.documentElement.dataset.theme = 'dark';
    const repo = createMemoryRepo();
    render(
      <RepoProvider repo={repo}>
        <MemoryRouter>
          <SummaryPage today={new Date(2026, 9, 31)} />
        </MemoryRouter>
      </RepoProvider>,
    );
    await screen.findByRole('article');

    window.dispatchEvent(new Event('beforeprint'));
    expect(document.documentElement.dataset.theme).toBe('light');
    window.dispatchEvent(new Event('afterprint'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    delete document.documentElement.dataset.theme;
  });

  it('removes the attribute afterwards when there was none before', async () => {
    delete document.documentElement.dataset.theme;
    render(
      <RepoProvider repo={createMemoryRepo()}>
        <MemoryRouter>
          <SummaryPage today={new Date(2026, 9, 31)} />
        </MemoryRouter>
      </RepoProvider>,
    );
    await screen.findByRole('article');
    window.dispatchEvent(new Event('beforeprint'));
    window.dispatchEvent(new Event('afterprint'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
