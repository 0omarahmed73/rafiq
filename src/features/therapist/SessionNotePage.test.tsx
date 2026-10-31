import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { SessionNotePage } from './SessionNotePage';

function NewHomework() {
  const l = useLocation();
  return <p data-testid="new-homework">{`${l.pathname}${l.search}`}</p>;
}

function setup(path: string, repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/therapist" element={<p>صفحة المعالج</p>} />
          <Route path="/therapist/note" element={<SessionNotePage />} />
          <Route path="/therapist/note/:id" element={<SessionNotePage />} />
          <Route path="/therapist/homework/:id" element={<NewHomework />} />
        </Routes>
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

async function seedSession(repo: Repo) {
  await repo.saveSession({
    id: 's1', date: '2026-10-27', therapistSaid: 'قال شيئًا', takeaway: 'آخذ هذا', homework: [], createdAt: '2026-10-27T09:00:00.000Z',
  });
}

describe('SessionNotePage', () => {
  it('saves a new session with what was said and the takeaway, with no homework inside the session row', async () => {
    const { repo, user } = setup('/therapist/note');
    await user.type(await screen.findByLabelText('أهم ما قاله المعالج'), 'نبدأ بالانتظار قبل الردّ');
    await user.type(screen.getByLabelText('ما الذي سآخذه معي؟'), 'أهدأ أولًا');
    await user.click(screen.getByRole('button', { name: 'حفظ الملاحظات' }));

    const [saved] = await repo.listSessions();
    expect(saved.therapistSaid).toBe('نبدأ بالانتظار قبل الردّ');
    expect(saved.takeaway).toBe('أهدأ أولًا');
    expect(saved.homework).toEqual([]);
    expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await screen.findByText('صفحة المعالج')).toBeInTheDocument();
  });

  it('opens an existing session and keeps its creation date when saved again', async () => {
    const repo = createMemoryRepo();
    await seedSession(repo);
    const { user } = setup('/therapist/note/s1', repo);
    expect(await screen.findByLabelText('أهم ما قاله المعالج')).toHaveValue('قال شيئًا');
    await user.click(screen.getByRole('button', { name: 'حفظ الملاحظات' }));
    const sessions = await repo.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].createdAt).toBe('2026-10-27T09:00:00.000Z');
  });

  it('says the notes are private', async () => {
    setup('/therapist/note');
    expect(await screen.findByText('ملاحظاتي خاصة ولا تدخل في الملخّص.')).toBeInTheDocument();
  });

  it('has no inline homework editor any more', async () => {
    setup('/therapist/note');
    await screen.findByLabelText('أهم ما قاله المعالج');
    expect(screen.queryByRole('textbox', { name: 'خطوة جديدة' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('lets the date field shrink with the screen', async () => {
    setup('/therapist/note');
    const date = await screen.findByLabelText('تاريخ الجلسة');
    expect(date.className).toContain('w-full');
    expect(date.className).toContain('min-w-0');
  });
});

describe('SessionNotePage homework section', () => {
  it("shows this session's homework as cards that open the homework page", async () => {
    const repo = createMemoryRepo();
    await seedSession(repo);
    await repo.saveHomework({ id: 'h1', sessionId: 's1', text: 'أقرأ الفصل', done: false, createdAt: '2026-10-27T09:00:00.000Z' });
    await repo.saveHomework({ id: 'h2', sessionId: 's1', text: 'أكتب يومياتي', answer: 'بدأت', done: false, createdAt: '2026-10-27T09:01:00.000Z' });
    await repo.saveHomework({ id: 'h3', sessionId: 's1', text: 'أمشي قليلًا', done: true, createdAt: '2026-10-27T09:02:00.000Z' });
    await repo.saveHomework({ id: 'other', sessionId: 's2', text: 'ليس من هذه الجلسة', done: false, createdAt: '2026-10-27T09:03:00.000Z' });
    await repo.saveHomeworkImage({ id: 'i1', homeworkId: 'h1', dataUrl: 'data:image/jpeg;base64,A', createdAt: '2026-10-27T09:00:00.000Z' });
    setup('/therapist/note/s1', repo);

    const items = within(await screen.findByRole('list', { name: 'الواجب' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('أقرأ الفصل');
    expect(items[0]).toHaveTextContent('بلا إجابة');
    expect(items[0]).toHaveTextContent('صورة واحدة');
    expect(items[1]).toHaveTextContent('أجبتُ');
    expect(items[2]).toHaveTextContent('أنجزتُ');
    expect(within(items[0]).getByRole('link')).toHaveAttribute('href', '/therapist/homework/h1');
    expect(screen.queryByText('ليس من هذه الجلسة')).not.toBeInTheDocument();
  });

  it('shows a calm empty state when there is no homework', async () => {
    const repo = createMemoryRepo();
    await seedSession(repo);
    setup('/therapist/note/s1', repo);
    expect(await screen.findByText('لم أضف واجبًا بعد.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أضيف واجبًا' })).toBeInTheDocument();
  });

  it('«أضيف واجبًا» saves a new session first and opens the new-homework page with its id', async () => {
    const { repo, user } = setup('/therapist/note');
    await user.type(await screen.findByLabelText('أهم ما قاله المعالج'), 'قال المعالج');
    await user.click(screen.getByRole('button', { name: 'أضيف واجبًا' }));

    const [saved] = await repo.listSessions();
    expect(saved.therapistSaid).toBe('قال المعالج');
    expect(saved.homework).toEqual([]);
    expect(await screen.findByTestId('new-homework')).toHaveTextContent(`/therapist/homework/new?session=${saved.id}`);
    expect(await repo.listSessions()).toHaveLength(1);
  });

  it('«أضيف واجبًا» on an existing session creates no second session', async () => {
    const repo = createMemoryRepo();
    await seedSession(repo);
    const { user } = setup('/therapist/note/s1', repo);
    await user.click(await screen.findByRole('button', { name: 'أضيف واجبًا' }));
    expect(await screen.findByTestId('new-homework')).toHaveTextContent('/therapist/homework/new?session=s1');
    expect(await repo.listSessions()).toHaveLength(1);
  });

  it('keeps what I typed and shows an Arabic error if the session cannot be saved first', async () => {
    const { repo, user } = setup('/therapist/note');
    vi.spyOn(repo, 'saveSession').mockRejectedValueOnce(new Error('disk full'));
    const said = await screen.findByLabelText('أهم ما قاله المعالج');
    await user.type(said, 'كلام مهم');
    await user.click(screen.getByRole('button', { name: 'أضيف واجبًا' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر حفظ الملاحظات، يمكنني المحاولة مرة أخرى.');
    expect(said).toHaveValue('كلام مهم');
    expect(screen.queryByTestId('new-homework')).not.toBeInTheDocument();
  });

  it('wraps a very long homework title in its card', async () => {
    const repo = createMemoryRepo();
    await seedSession(repo);
    await repo.saveHomework({ id: 'h1', sessionId: 's1', text: 'ا'.repeat(300), done: false, createdAt: '2026-10-27T09:00:00.000Z' });
    setup('/therapist/note/s1', repo);
    const title = await screen.findByText('ا'.repeat(300));
    expect(title.className).toContain('break-words');
    expect(title.closest('li')!.className).toContain('min-w-0');
  });
});
