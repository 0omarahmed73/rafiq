import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { TrackerPage } from './TrackerPage';

async function logDay(repo: Repo, day: string, emotions: string[], intensity: number) {
  await repo.addCheckin({
    at: `${day}T10:00:00.000Z`,
    day,
    emotions,
    intensity,
    tags: [],
    forNextSession: false,
  });
}

function renderTracker(repo: Repo) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <TrackerPage today={new Date(2026, 9, 31)} />
      </MemoryRouter>
    </RepoProvider>,
  );
}

describe('TrackerPage', () => {
  it('shows only the logged days in the calendar and hides the others', async () => {
    const repo = createMemoryRepo();
    await logDay(repo, '2026-10-01', ['sadness'], 4);
    await logDay(repo, '2026-10-03', ['sadness', 'anxiety'], 6);
    await logDay(repo, '2026-10-31', ['sadness'], 8);
    renderTracker(repo);

    const list = await screen.findByRole('list', { name: 'أيام التسجيل' });
    const cells = within(list).getAllByRole('listitem');
    expect(cells.map((c) => c.textContent)).toEqual(['١', '٣', '٣١']);
    expect(within(list).queryByText('٢')).not.toBeInTheDocument();
  });

  it('states the number of logged days without any failure wording', async () => {
    const repo = createMemoryRepo();
    await logDay(repo, '2026-10-01', ['sadness'], 4);
    await logDay(repo, '2026-10-03', ['sadness'], 6);
    await logDay(repo, '2026-10-31', ['sadness'], 8);
    renderTracker(repo);

    expect(await screen.findByText(/سجّلت ٣ أيام هذا الشهر/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/فارغ|فشل|streak|سلسلة/);
  });

  it('names the three intensity levels in the legend', async () => {
    renderTracker(createMemoryRepo());
    for (const word of ['خفيف', 'متوسط', 'شديد']) {
      expect(await screen.findByText(word)).toBeInTheDocument();
    }
  });

  it('invites a first entry when the month has none', async () => {
    renderTracker(createMemoryRepo());
    expect(await screen.findByText(/ابدأ بتسجيل أول يوم/)).toBeInTheDocument();
  });

  it('lists the most frequent emotions with their counts', async () => {
    const repo = createMemoryRepo();
    await logDay(repo, '2026-10-01', ['sadness'], 4);
    await logDay(repo, '2026-10-03', ['sadness', 'anxiety'], 6);
    await logDay(repo, '2026-10-31', ['sadness'], 8);
    renderTracker(repo);

    const list = await screen.findByRole('list', { name: 'أكثر المشاعر حضورًا' });
    const items = within(list).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('حزن');
    expect(items[0]).toHaveTextContent('٣');
    expect(items[1]).toHaveTextContent('قلق');
    expect(items[1]).toHaveTextContent('١');
  });

  it('describes a falling intensity curve over the last seven logged days', async () => {
    const repo = createMemoryRepo();
    const values = [9, 8, 7, 6, 4, 3, 2];
    for (let i = 0; i < 7; i++) await logDay(repo, `2026-10-${25 + i}`, ['sadness'], values[i]);
    renderTracker(repo);

    const chart = await screen.findByRole('img', { name: /الانخفاض/ });
    expect(chart).toBeInTheDocument();
  });
});
