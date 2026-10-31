import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  describe('a day with several check-ins', () => {
    async function logAt(repo: Repo, local: Date, emotions: string[], intensity: number, note?: string) {
      await repo.addCheckin({
        at: local.toISOString(),
        day: `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`,
        emotions,
        intensity,
        tags: [],
        ...(note ? { note } : {}),
        forNextSession: false,
      });
    }

    it('lists each check-in of the chosen day with its own time, emotions and intensity', async () => {
      const repo = createMemoryRepo();
      await logAt(repo, new Date(2026, 9, 3, 9, 30), ['sadness', 'anxiety'], 6, 'الصباح ثقيل');
      await logAt(repo, new Date(2026, 9, 3, 21, 5), ['grateful'], 2);
      await logAt(repo, new Date(2026, 9, 31, 8, 0), ['calm'], 1);
      renderTracker(repo);

      const list = await screen.findByRole('list', { name: 'أيام التسجيل' });
      await userEvent.setup().click(within(list).getByRole('button', { name: '٣' }));

      const entries = within(screen.getByRole('list', { name: 'تسجيلات اليوم' })).getAllByRole('listitem');
      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveTextContent('٠٩:٣٠');
      expect(entries[0]).toHaveTextContent('حزن');
      expect(entries[0]).toHaveTextContent('قلق');
      expect(entries[0]).toHaveTextContent('٦ / ١٠');
      expect(entries[0]).toHaveTextContent('الصباح ثقيل');
      expect(entries[1]).toHaveTextContent('٢١:٠٥');
      expect(entries[1]).toHaveTextContent('ممتنّ');
      expect(entries[1]).toHaveTextContent('٢ / ١٠');
    });

    it('shows today’s check-ins before any day is chosen', async () => {
      const repo = createMemoryRepo();
      await logAt(repo, new Date(2026, 9, 3, 9, 30), ['sadness'], 6);
      await logAt(repo, new Date(2026, 9, 31, 8, 0), ['calm'], 1);
      renderTracker(repo);

      const entries = within(await screen.findByRole('list', { name: 'تسجيلات اليوم' })).getAllByRole('listitem');
      expect(entries).toHaveLength(1);
      expect(entries[0]).toHaveTextContent('هادئ');
    });

    it('marks the chosen day', async () => {
      const repo = createMemoryRepo();
      await logAt(repo, new Date(2026, 9, 3, 9, 30), ['sadness'], 6);
      renderTracker(repo);

      const list = await screen.findByRole('list', { name: 'أيام التسجيل' });
      const day = within(list).getByRole('button', { name: '٣' });
      expect(day).toHaveAttribute('aria-pressed', 'true');
    });
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
