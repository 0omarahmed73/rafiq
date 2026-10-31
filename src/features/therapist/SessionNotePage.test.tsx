import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { SessionNotePage } from './SessionNotePage';

function setup(path: string, repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/therapist" element={<p>صفحة المعالج</p>} />
          <Route path="/therapist/note" element={<SessionNotePage />} />
          <Route path="/therapist/note/:id" element={<SessionNotePage />} />
        </Routes>
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

describe('SessionNotePage', () => {
  it('saves a new session with what was said, the takeaway and homework not yet done', async () => {
    const { repo, user } = setup('/therapist/note');
    await user.type(await screen.findByLabelText('أهم ما قاله المعالج'), 'نبدأ بالانتظار قبل الردّ');
    await user.type(screen.getByLabelText('ما الذي سآخذه معي؟'), 'أهدأ أولًا');
    await user.type(screen.getByRole('textbox', { name: 'خطوة جديدة' }), 'أدوّن ما يحدث بعد ذلك');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    await user.click(screen.getByRole('button', { name: 'حفظ الملاحظات' }));

    const [saved] = await repo.listSessions();
    expect(saved.therapistSaid).toBe('نبدأ بالانتظار قبل الردّ');
    expect(saved.takeaway).toBe('أهدأ أولًا');
    expect(saved.homework).toEqual([{ text: 'أدوّن ما يحدث بعد ذلك', done: false }]);
    expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await screen.findByText('صفحة المعالج')).toBeInTheDocument();
  });

  it('opens an existing session, lets a homework item be ticked, and keeps that when saved', async () => {
    const repo = createMemoryRepo();
    await repo.saveSession({
      id: 's1',
      date: '2026-10-27',
      therapistSaid: 'قال شيئًا',
      takeaway: '',
      homework: [{ text: 'أنتظر قبل الردّ', done: false }],
      createdAt: '2026-10-27T09:00:00.000Z',
    });
    const { user } = setup('/therapist/note/s1', repo);

    expect(await screen.findByLabelText('أهم ما قاله المعالج')).toHaveValue('قال شيئًا');
    await user.click(screen.getByRole('checkbox', { name: 'أنتظر قبل الردّ' }));
    await user.click(screen.getByRole('button', { name: 'حفظ الملاحظات' }));

    const sessions = await repo.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].homework).toEqual([{ text: 'أنتظر قبل الردّ', done: true }]);
    expect(sessions[0].createdAt).toBe('2026-10-27T09:00:00.000Z');
  });

  it('says the notes are private', async () => {
    setup('/therapist/note');
    expect(await screen.findByText('ملاحظاتي خاصة ولا تدخل في الملخّص.')).toBeInTheDocument();
  });

  it('ignores a blank homework step', async () => {
    const { user } = setup('/therapist/note');
    await user.type(await screen.findByRole('textbox', { name: 'خطوة جديدة' }), '   ');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });
});
