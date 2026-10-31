import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { HomeworkListPage } from './HomeworkListPage';

function setup(repo: Repo) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <HomeworkListPage />
      </MemoryRouter>
    </RepoProvider>,
  );
  return userEvent.setup();
}

async function session(repo: Repo, id: string, date: string) {
  await repo.saveSession({ id, date, therapistSaid: 'جلسة', takeaway: '', homework: [], createdAt: `${date}T09:00:00.000Z` });
}
async function hw(repo: Repo, id: string, over: Record<string, unknown> = {}) {
  await repo.saveHomework({ id, sessionId: 's1', text: `واجب ${id}`, done: false, createdAt: '2026-10-20T09:00:00.000Z', ...over });
}

describe('HomeworkListPage', () => {
  it('lists open homework newest first, each with title, session date and status', async () => {
    const repo = createMemoryRepo();
    await session(repo, 's1', '2026-10-20');
    await session(repo, 's2', '2026-10-27');
    await hw(repo, 'old', { createdAt: '2026-10-20T09:00:00.000Z' });
    await hw(repo, 'new', { sessionId: 's2', createdAt: '2026-10-27T09:00:00.000Z', answer: 'كتبتُ شيئًا' });
    await hw(repo, 'finished', { done: true });
    setup(repo);

    const items = within(await screen.findByRole('list', { name: 'الواجبات' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('واجب new');
    expect(items[0]).toHaveTextContent('الثلاثاء ٢٧ أكتوبر');
    expect(items[0]).toHaveTextContent('أجبتُ');
    expect(items[1]).toHaveTextContent('واجب old');
    expect(items[1]).toHaveTextContent('بلا إجابة');
  });

  it('the المنجزة chip shows only done homework, with the أنجزتُ status', async () => {
    const repo = createMemoryRepo();
    await session(repo, 's1', '2026-10-20');
    await hw(repo, 'open');
    await hw(repo, 'finished', { done: true, answer: 'تم' });
    const user = setup(repo);
    await screen.findByRole('list', { name: 'الواجبات' });
    await user.click(screen.getByRole('button', { name: 'المنجزة' }));
    const items = within(screen.getByRole('list', { name: 'الواجبات' })).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('واجب finished');
    expect(items[0]).toHaveTextContent('أنجزتُ');
    expect(screen.getByRole('button', { name: 'المنجزة' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'المفتوحة' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('a card links to its homework page and shows the photo count', async () => {
    const repo = createMemoryRepo();
    await session(repo, 's1', '2026-10-20');
    await hw(repo, 'one');
    await hw(repo, 'three', { createdAt: '2026-10-21T09:00:00.000Z' });
    await repo.saveHomeworkImage({ id: 'a', homeworkId: 'one', dataUrl: 'data:image/jpeg;base64,A', createdAt: '2026-10-20T09:00:00.000Z' });
    for (const n of ['x', 'y', 'z']) await repo.saveHomeworkImage({ id: n, homeworkId: 'three', dataUrl: 'data:image/jpeg;base64,A', createdAt: '2026-10-20T09:00:00.000Z' });
    setup(repo);
    const items = within(await screen.findByRole('list', { name: 'الواجبات' })).getAllByRole('listitem');
    expect(within(items[0]).getByRole('link')).toHaveAttribute('href', '/therapist/homework/three');
    expect(items[0]).toHaveTextContent('٣ صور');
    expect(items[1]).toHaveTextContent('صورة واحدة');
  });

  it('shows calm empty states for each chip', async () => {
    const user = setup(createMemoryRepo());
    expect(await screen.findByText('لا توجد واجبات مفتوحة.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'المنجزة' }));
    expect(screen.getByText('لا توجد واجبات منجزة بعد.')).toBeInTheDocument();
  });

  it('wraps a very long unbroken title instead of widening the card', async () => {
    const repo = createMemoryRepo();
    await session(repo, 's1', '2026-10-20');
    await hw(repo, 'long', { text: 'ا'.repeat(300) });
    setup(repo);
    const title = await screen.findByText('ا'.repeat(300));
    expect(title.className).toContain('break-words');
    expect(title.closest('li')!.className).toContain('min-w-0');
  });

  it('links back to the therapist page', async () => {
    setup(createMemoryRepo());
    expect(await screen.findByRole('link', { name: /جلسات المعالج/ })).toHaveAttribute('href', '/therapist');
  });
});
