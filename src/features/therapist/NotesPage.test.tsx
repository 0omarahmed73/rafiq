import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { NotesPage } from './NotesPage';

function setup(repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <NotesPage />
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

const note = (repo: Repo, id: string, text: string, over: Record<string, unknown> = {}) =>
  repo.saveNote({ id, text, createdAt: '2026-10-20T09:00:00.000Z', ...over });

describe('NotesPage', () => {
  it('shows an empty state and keeps «تجديد» disabled when there are no notes', async () => {
    setup();
    expect(await screen.findByText('لا توجد ملاحظات هذا الأسبوع بعد.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تجديد' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'إضافة ملاحظة' })).toBeDisabled();
  });

  it('adds a note, clears the box, and lists it', async () => {
    const { repo, user } = setup();
    await user.type(await screen.findByLabelText('ملاحظة جديدة'), 'نمتُ متأخرًا وشعرتُ بالقلق');
    await user.click(screen.getByRole('button', { name: 'إضافة ملاحظة' }));

    const list = await screen.findByRole('list', { name: 'ملاحظات هذا الأسبوع' });
    expect(within(list).getByText('نمتُ متأخرًا وشعرتُ بالقلق')).toBeInTheDocument();
    expect(screen.getByLabelText('ملاحظة جديدة')).toHaveValue('');
    expect((await repo.listNotes()).map((n) => [n.text, n.archivedAt])).toEqual([['نمتُ متأخرًا وشعرتُ بالقلق', undefined]]);
  });

  it('does not add a note made only of spaces', async () => {
    const { repo, user } = setup();
    await user.type(await screen.findByLabelText('ملاحظة جديدة'), '   ');
    expect(screen.getByRole('button', { name: 'إضافة ملاحظة' })).toBeDisabled();
    expect(await repo.listNotes()).toEqual([]);
  });

  it('edits a note in place and can cancel an edit', async () => {
    const repo = createMemoryRepo();
    await note(repo, 'n1', 'قبل');
    const { user } = setup(repo);
    await user.click(await screen.findByRole('button', { name: 'تعديل الملاحظة' }));
    const box = screen.getByLabelText('تعديل الملاحظة');
    await user.clear(box);
    await user.type(box, 'بعد');
    await user.click(screen.getByRole('button', { name: 'إلغاء التعديل' }));
    expect(screen.getByText('قبل')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'تعديل الملاحظة' }));
    const again = screen.getByLabelText('تعديل الملاحظة');
    await user.clear(again);
    await user.type(again, 'بعد');
    await user.click(screen.getByRole('button', { name: 'حفظ التعديل' }));
    expect(await screen.findByText('بعد')).toBeInTheDocument();
    expect((await repo.listNotes())[0].text).toBe('بعد');
  });

  it('asks before deleting, keeps the note when cancelled, and deletes it when confirmed', async () => {
    const repo = createMemoryRepo();
    await note(repo, 'n1', 'تُحذف');
    const { user } = setup(repo);
    await user.click(await screen.findByRole('button', { name: 'حذف الملاحظة' }));
    expect(screen.getByText('أحذف هذه الملاحظة؟ لا يمكن التراجع عن ذلك.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'إلغاء الحذف' }));
    expect(screen.getByText('تُحذف')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'حذف الملاحظة' }));
    await user.click(screen.getByRole('button', { name: 'نعم، أحذف' }));
    await waitFor(() => expect(screen.queryByText('تُحذف')).not.toBeInTheDocument());
    expect(await repo.listNotes()).toEqual([]);
  });

  it('renews: asks first, then moves every current note to the archive and says how many', async () => {
    const repo = createMemoryRepo();
    await note(repo, 'a', 'أولى');
    await note(repo, 'b', 'ثانية', { createdAt: '2026-10-21T09:00:00.000Z' });
    const { user } = setup(repo);

    await user.click(await screen.findByRole('button', { name: 'تجديد' }));
    expect(screen.getByText(/أنقل ملاحظات هذا الأسبوع إلى الأرشيف/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'إلغاء التجديد' }));
    expect((await repo.listNotes()).every((n) => !n.archivedAt)).toBe(true);

    await user.click(screen.getByRole('button', { name: 'تجديد' }));
    await user.click(screen.getByRole('button', { name: 'نعم، أجدّد' }));

    expect(await screen.findByRole('status')).toHaveTextContent('نقلتُ ملاحظتين إلى الأرشيف.');
    expect(screen.getByText('لا توجد ملاحظات هذا الأسبوع بعد.')).toBeInTheDocument();
    expect((await repo.listNotes()).every((n) => n.archivedAt)).toBe(true);
    expect(screen.getByRole('button', { name: 'تجديد' })).toBeDisabled();
  });

  it('keeps each archived renewal collapsed, newest first, and opens one to read and delete its notes', async () => {
    const repo = createMemoryRepo();
    await note(repo, 'old1', 'قديمة أولى', { createdAt: '2026-10-05T09:00:00.000Z', archivedAt: '2026-10-08T08:00:00.000Z' });
    await note(repo, 'old2', 'قديمة ثانية', { createdAt: '2026-10-06T09:00:00.000Z', archivedAt: '2026-10-08T08:00:00.000Z' });
    await note(repo, 'mid', 'وسطى', { createdAt: '2026-10-15T09:00:00.000Z', archivedAt: '2026-10-16T08:00:00.000Z' });
    const { user } = setup(repo);

    const toggles = await screen.findAllByRole('button', { name: /أُرشفت في/ });
    expect(toggles).toHaveLength(2);
    expect(toggles[0]).toHaveAccessibleName(/١٦ أكتوبر/);
    expect(toggles[1]).toHaveAccessibleName(/٨ أكتوبر/);
    expect(toggles.every((t) => t.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);

    await user.click(toggles[1]);
    expect(toggles[1]).toHaveAttribute('aria-expanded', 'true');
    const region = screen.getByRole('region', { name: /٨ أكتوبر/ });
    expect(within(region).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByRole('region')).toHaveLength(1);

    await user.click(within(region).getAllByRole('button', { name: 'حذف الملاحظة' })[0]);
    await user.click(screen.getByRole('button', { name: 'نعم، أحذف' }));
    await waitFor(async () => expect((await repo.listNotes()).map((n) => n.id).sort()).toEqual(['mid', 'old1']));

    await user.click(toggles[1]);
    expect(toggles[1]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows a one-line preview of the newest note on a collapsed archive', async () => {
    const repo = createMemoryRepo();
    await note(repo, 'a', 'أقدم', { createdAt: '2026-10-05T09:00:00.000Z', archivedAt: '2026-10-08T08:00:00.000Z' });
    await note(repo, 'b', 'الأحدث في المجموعة', { createdAt: '2026-10-06T09:00:00.000Z', archivedAt: '2026-10-08T08:00:00.000Z' });
    setup(repo);
    expect(await screen.findByRole('button', { name: /أُرشفت في/ })).toHaveTextContent('الأحدث في المجموعة');
  });

  it('shows an archive empty state when nothing was renewed yet', async () => {
    setup();
    expect(await screen.findByText('لم أنقل ملاحظات إلى الأرشيف بعد.')).toBeInTheDocument();
  });
});
