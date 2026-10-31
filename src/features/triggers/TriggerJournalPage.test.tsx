import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import { App } from '../../App';
import { routes } from '../../routes';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';

async function openJournal(repo: Repo) {
  await repo.saveSettings({ id: 'settings', theme: 'system', disclaimerAcceptedAt: '2026-10-31T00:00:00Z' });
  const router = createMemoryRouter(routes, { initialEntries: ['/triggers'] });
  const view = render(<App router={router} repo={repo} persistent />);
  return { ...view, user: userEvent.setup() };
}

async function add(repo: Repo, id: string, practiceId: string, text: unknown, completed = true) {
  await repo.savePractice({
    id, practiceId, stepId: 4, startedAt: '2026-10-31T10:00:00Z',
    ...(completed ? { completedAt: '2026-10-31T10:05:00Z' } : {}),
    answers: { [practiceId === 'understand' ? 'u1' : 's1']: { text } },
    share: false, forNextSession: false,
  });
}

describe('my trigger and self-understanding journal', () => {
  it('offers a place to add an entry when I have no completed records', async () => {
    await openJournal(createMemoryRepo());
    expect(await screen.findByRole('heading', { name: 'محفزاتي' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'أضيف محفزًا' })).toHaveAttribute('href', '/practice/understand');
    expect(screen.getByRole('link', { name: 'أبدأ فهم مشكلة' })).toHaveAttribute('href', '/practice/self-understanding');
    expect(screen.queryByRole('list', { name: 'سجلاتي المحفوظة' })).not.toBeInTheDocument();
  });

  it('keeps multiple private trigger entries and shows their original saved answers', async () => {
    const repo = createMemoryRepo();
    await add(repo, 'first', 'understand', 'موقف أول');
    await add(repo, 'second', 'understand', 'موقف ثان');
    const before = await repo.listPractices();
    const { user } = await openJournal(repo);
    const list = await screen.findByRole('list', { name: 'سجلاتي المحفوظة' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    const summary = screen.getAllByText('موقف أول')[0].closest('summary')!;
    await user.click(summary);
    expect(screen.getAllByText('موقف أول').some(el => el.tagName === 'DD')).toBe(true);
    expect(within(summary.closest('li')!).getByText('ما الموقف بالتحديد؟')).toBeVisible();
    expect(await repo.listPractices()).toEqual(before);
  });

  it('labels the distinct self-understanding records with their own questions', async () => {
    const repo = createMemoryRepo();
    await add(repo, 'problem', 'self-understanding', 'مشكلة أحاول فهمها');
    const { user } = await openJournal(repo);
    const list = await screen.findByRole('list', { name: 'سجلاتي المحفوظة' });
    await user.click(within(list).getAllByText('مشكلة أحاول فهمها')[0].closest('summary')!);
    expect(within(list).getByText('ما المشكلة في جملة واحدة؟')).toBeVisible();
    expect(within(list).getByText(/أفهم مشكلة صعبة/)).toBeVisible();
  });

  it('offers draft resume without counting it as a finished item', async () => {
    const repo = createMemoryRepo();
    await add(repo, 'draft', 'understand', 'مسودة خاصة', false);
    await openJournal(repo);
    expect(await screen.findByRole('link', { name: 'أكمل تتبّع المحفّز' })).toHaveAttribute('href', '/practice/understand');
    expect(screen.queryByRole('list', { name: 'سجلاتي المحفوظة' })).not.toBeInTheDocument();
    expect(screen.queryByText('مسودة خاصة')).not.toBeInTheDocument();
  });

  it('renders answer markup as text and tolerates unreadable imported answers', async () => {
    const repo = createMemoryRepo();
    await add(repo, 'text', 'understand', '<img src="https://example.invalid/private">');
    await add(repo, 'bad-answer', 'understand', 42);
    const { container } = await openJournal(repo);
    await screen.findByRole('list', { name: 'سجلاتي المحفوظة' });
    expect(screen.getAllByText('<img src="https://example.invalid/private">').length).toBeGreaterThan(0);
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows a readable error if the record list cannot be loaded', async () => {
    const repo = createMemoryRepo();
    vi.spyOn(repo, 'listPractices').mockRejectedValueOnce(new Error('read unavailable'));
    await openJournal(repo);
    expect(await screen.findByRole('alert')).toHaveTextContent('أحتاج إلى إعادة فتح سجلي لقراءة ما حفظتُه.');
  });

  describe('editing and deleting a saved record', () => {
    async function open(repo: Repo, id: string) {
      const view = await openJournal(repo);
      const list = await screen.findByRole('list', { name: 'سجلاتي المحفوظة' });
      const card = within(list).getAllByRole('listitem').find(li => li.querySelector(`[data-record="${id}"]`))!;
      await view.user.click(card.querySelector('summary')!);
      return { ...view, card };
    }

    it('shows تعديل and حذف as labelled buttons inside an opened record', async () => {
      const repo = createMemoryRepo();
      await add(repo, 'r1', 'understand', 'موقف أول');
      const { card } = await open(repo, 'r1');
      expect(within(card).getByRole('button', { name: 'تعديل' })).toBeVisible();
      expect(within(card).getByRole('button', { name: 'حذف' })).toBeVisible();
    });

    it('edits an answer in a labelled box and saves it, keeping the date and the privacy choices', async () => {
      const repo = createMemoryRepo();
      await repo.savePractice({
        id: 'r1', practiceId: 'understand', stepId: 4, startedAt: '2026-10-31T10:00:00Z', completedAt: '2026-10-31T10:05:00Z',
        answers: { u1: { text: 'موقف أول' }, u2: { text: 'فكرة' } }, share: true, forNextSession: true,
      });
      const { card, user } = await open(repo, 'r1');
      await user.click(within(card).getByRole('button', { name: 'تعديل' }));
      const box = within(card).getByLabelText('ما الموقف بالتحديد؟');
      expect(box).toHaveValue('موقف أول');
      await user.clear(box);
      await user.type(box, 'موقف بعد التعديل');
      await user.click(within(card).getByRole('button', { name: 'حفظ التعديل' }));

      expect(await screen.findByText('حفظتُ التعديل.')).toBeInTheDocument();
      const [saved] = await repo.listPractices();
      expect(saved.answers).toEqual({ u1: { text: 'موقف بعد التعديل' }, u2: { text: 'فكرة' } });
      expect(saved).toMatchObject({ share: true, forNextSession: true, completedAt: '2026-10-31T10:05:00Z', startedAt: '2026-10-31T10:00:00Z' });
      expect(within(card).queryByRole('button', { name: 'حفظ التعديل' })).not.toBeInTheDocument();
      expect(within(card).getAllByText('موقف بعد التعديل').length).toBeGreaterThan(0);
    });

    it('cancelling an edit changes nothing', async () => {
      const repo = createMemoryRepo();
      await add(repo, 'r1', 'understand', 'موقف أول');
      const before = await repo.listPractices();
      const { card, user } = await open(repo, 'r1');
      await user.click(within(card).getByRole('button', { name: 'تعديل' }));
      await user.type(within(card).getByLabelText('ما الموقف بالتحديد؟'), ' زيادة');
      await user.click(within(card).getByRole('button', { name: 'إلغاء التعديل' }));
      expect(await repo.listPractices()).toEqual(before);
      expect(within(card).getAllByText('موقف أول').length).toBeGreaterThan(0);
    });

    it('does not allow saving when every answer is empty', async () => {
      const repo = createMemoryRepo();
      await add(repo, 'r1', 'understand', 'موقف أول');
      const { card, user } = await open(repo, 'r1');
      await user.click(within(card).getByRole('button', { name: 'تعديل' }));
      await user.clear(within(card).getByLabelText('ما الموقف بالتحديد؟'));
      expect(within(card).getByRole('button', { name: 'حفظ التعديل' })).toBeDisabled();
    });

    it('says so in Arabic when saving fails, keeps what I typed, and lets me try again', async () => {
      const repo = createMemoryRepo();
      await add(repo, 'r1', 'understand', 'موقف أول');
      const { card, user } = await open(repo, 'r1');
      const real = repo.savePractice.bind(repo);
      vi.spyOn(repo, 'savePractice').mockRejectedValueOnce(new Error('disk full'));
      await user.click(within(card).getByRole('button', { name: 'تعديل' }));
      const box = within(card).getByLabelText('ما الموقف بالتحديد؟');
      await user.clear(box);
      await user.type(box, 'نص جديد');
      await user.click(within(card).getByRole('button', { name: 'حفظ التعديل' }));
      expect(await within(card).findByRole('alert')).toHaveTextContent('تعذّر حفظ التعديل، يمكنني المحاولة مرة أخرى.');
      expect(box).toHaveValue('نص جديد');

      vi.mocked(repo.savePractice).mockImplementation(real);
      await user.click(within(card).getByRole('button', { name: 'حفظ التعديل' }));
      expect(await screen.findByText('حفظتُ التعديل.')).toBeInTheDocument();
      expect((await repo.listPractices())[0].answers.u1).toEqual({ text: 'نص جديد' });
    });

    it('asks before deleting, and cancelling keeps the record', async () => {
      const repo = createMemoryRepo();
      await add(repo, 'r1', 'understand', 'موقف أول');
      const { card, user } = await open(repo, 'r1');
      await user.click(within(card).getByRole('button', { name: 'حذف' }));
      expect(within(card).getByText('أحذف هذا السجل؟ لا يمكن التراجع عن ذلك.')).toBeVisible();
      await user.click(within(card).getByRole('button', { name: 'إلغاء الحذف' }));
      expect(within(card).queryByText('أحذف هذا السجل؟ لا يمكن التراجع عن ذلك.')).not.toBeInTheDocument();
      expect(await repo.listPractices()).toHaveLength(1);
    });

    it('deletes only the confirmed record and says so', async () => {
      const repo = createMemoryRepo();
      await add(repo, 'r1', 'understand', 'موقف أول');
      await add(repo, 'r2', 'understand', 'موقف ثان');
      const { card, user } = await open(repo, 'r1');
      await user.click(within(card).getByRole('button', { name: 'حذف' }));
      await user.click(within(card).getByRole('button', { name: 'نعم، أحذف' }));
      expect(await screen.findByText('حذفتُ السجل.')).toBeInTheDocument();
      expect((await repo.listPractices()).map(r => r.id)).toEqual(['r2']);
      expect(screen.queryByText('موقف أول')).not.toBeInTheDocument();
      expect(screen.getAllByText('موقف ثان').length).toBeGreaterThan(0);
    });

    it('keeps the record and shows an Arabic error when deleting fails', async () => {
      const repo = createMemoryRepo();
      await add(repo, 'r1', 'understand', 'موقف أول');
      const { card, user } = await open(repo, 'r1');
      vi.spyOn(repo, 'deletePractice').mockRejectedValueOnce(new Error('locked'));
      await user.click(within(card).getByRole('button', { name: 'حذف' }));
      await user.click(within(card).getByRole('button', { name: 'نعم، أحذف' }));
      expect(await within(card).findByRole('alert')).toHaveTextContent('تعذّر حذف السجل، يمكنني المحاولة مرة أخرى.');
      expect(await repo.listPractices()).toHaveLength(1);
    });

    it('shows the delete question in place of the buttons, and edit never shows it', async () => {
      const repo = createMemoryRepo();
      await add(repo, 'r1', 'understand', 'موقف أول');
      const { card, user } = await open(repo, 'r1');
      await user.click(within(card).getByRole('button', { name: 'حذف' }));
      expect(within(card).queryByRole('button', { name: 'تعديل' })).not.toBeInTheDocument();
      await user.click(within(card).getByRole('button', { name: 'إلغاء الحذف' }));
      await user.click(within(card).getByRole('button', { name: 'تعديل' }));
      expect(within(card).queryByText('أحذف هذا السجل؟ لا يمكن التراجع عن ذلك.')).not.toBeInTheDocument();
      expect(within(card).getByRole('button', { name: 'حفظ التعديل' })).toBeVisible();
      expect(within(card).queryByRole('button', { name: 'حذف' })).not.toBeInTheDocument();
    });
  });
});
