import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { TherapistPage } from './TherapistPage';

function setup(repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <TherapistPage />
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

describe('TherapistPage', () => {
  it('links to the note editor and to the summary', async () => {
    setup();
    expect(await screen.findByRole('link', { name: 'إضافة ملاحظات جلسة' })).toHaveAttribute(
      'href',
      '/therapist/note',
    );
    expect(screen.getByRole('link', { name: /إنشاء ملخّص/ })).toHaveAttribute('href', '/therapist/summary');
  });

  it('lists what was flagged for the next session', async () => {
    const repo = createMemoryRepo();
    await repo.addCheckin({
      at: '2026-10-30T10:00:00.000Z',
      day: '2026-10-30',
      emotions: ['anger'],
      intensity: 9,
      tags: [],
      forNextSession: true,
    });
    setup(repo);
    const list = await screen.findByRole('list', { name: 'ما أريد مناقشته' });
    expect(within(list).getByText(/غضب/)).toBeInTheDocument();
  });

  it('adds an agenda point that then appears in the list', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByRole('button', { name: '+ إضافة نقطة' }));
    await user.type(screen.getByRole('textbox', { name: 'نقطة جديدة' }), 'غضبي أكبر من الموقف');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));

    const list = await screen.findByRole('list', { name: 'ما أريد مناقشته' });
    expect(within(list).getByText('غضبي أكبر من الموقف')).toBeInTheDocument();
    expect(await repo.listAgendaPoints()).toHaveLength(1);
  });

  describe('editing and deleting a point', () => {
    const seed = async () => {
      const repo = createMemoryRepo();
      await repo.saveAgendaPoint({ id: 'a1', text: 'نقطة قديمة', day: '2026-10-30', done: false });
      return repo;
    };

    it('edits the text and keeps it in the list', async () => {
      const repo = await seed();
      const { user } = setup(repo);
      await user.click(await screen.findByRole('button', { name: 'تعديل: نقطة قديمة' }));
      const input = screen.getByRole('textbox', { name: 'تعديل النقطة' });
      await user.clear(input);
      await user.type(input, 'نقطة جديدة');
      await user.click(screen.getByRole('button', { name: 'حفظ' }));

      expect(await screen.findByText('نقطة جديدة')).toBeInTheDocument();
      expect(screen.queryByText('نقطة قديمة')).not.toBeInTheDocument();
      expect((await repo.listAgendaPoints())[0]).toMatchObject({ id: 'a1', text: 'نقطة جديدة', done: false });
    });

    it('cancelling an edit changes nothing', async () => {
      const repo = await seed();
      const { user } = setup(repo);
      await user.click(await screen.findByRole('button', { name: 'تعديل: نقطة قديمة' }));
      await user.type(screen.getByRole('textbox', { name: 'تعديل النقطة' }), 'xx');
      await user.click(screen.getByRole('button', { name: 'إلغاء' }));

      expect(screen.getByText('نقطة قديمة')).toBeInTheDocument();
      expect((await repo.listAgendaPoints())[0].text).toBe('نقطة قديمة');
    });

    it('does not save an empty edit', async () => {
      const repo = await seed();
      const { user } = setup(repo);
      await user.click(await screen.findByRole('button', { name: 'تعديل: نقطة قديمة' }));
      await user.clear(screen.getByRole('textbox', { name: 'تعديل النقطة' }));
      await user.click(screen.getByRole('button', { name: 'حفظ' }));

      expect((await repo.listAgendaPoints())[0].text).toBe('نقطة قديمة');
    });

    it('asks before deleting, then removes the point', async () => {
      const repo = await seed();
      const { user } = setup(repo);
      await user.click(await screen.findByRole('button', { name: 'حذف: نقطة قديمة' }));
      expect(await repo.listAgendaPoints()).toHaveLength(1);
      expect(screen.getByText('حذف هذه النقطة؟')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'تأكيد الحذف' }));

      expect(screen.queryByText('نقطة قديمة')).not.toBeInTheDocument();
      expect(await repo.listAgendaPoints()).toEqual([]);
    });

    it('keeps the point when the deletion is cancelled', async () => {
      const repo = await seed();
      const { user } = setup(repo);
      await user.click(await screen.findByRole('button', { name: 'حذف: نقطة قديمة' }));
      await user.click(screen.getByRole('button', { name: 'إلغاء' }));

      expect(screen.getByText('نقطة قديمة')).toBeInTheDocument();
      expect(await repo.listAgendaPoints()).toHaveLength(1);
    });

    it('offers no edit or delete on items flagged from check-ins', async () => {
      const repo = createMemoryRepo();
      await repo.addCheckin({ at: '2026-10-30T10:00:00.000Z', day: '2026-10-30', emotions: ['anger'], intensity: 9, tags: [], forNextSession: true });
      setup(repo);
      await screen.findByRole('list', { name: 'ما أريد مناقشته' });
      expect(screen.queryByRole('button', { name: /^(تعديل|حذف):/ })).not.toBeInTheDocument();
    });
  });

  it('marks an agenda point as discussed, which removes it from the list', async () => {
    const repo = createMemoryRepo();
    await repo.saveAgendaPoint({ id: 'a1', text: 'نقطة', day: '2026-10-30', done: false });
    const { user } = setup(repo);
    await user.click(await screen.findByRole('checkbox', { name: 'تمت مناقشتها: نقطة' }));

    expect((await repo.listAgendaPoints())[0].done).toBe(true);
    expect(screen.queryByText('نقطة')).not.toBeInTheDocument();
  });

  it('shows past sessions with their homework progress, newest first', async () => {
    const repo = createMemoryRepo();
    await repo.saveSession({
      id: 's1',
      date: '2026-10-20',
      therapistSaid: 'بدأنا بتصديق المشاعر',
      takeaway: '',
      homework: [
        { text: 'أ', done: true },
        { text: 'ب', done: true },
        { text: 'ج', done: true },
      ],
      createdAt: '2026-10-20T09:00:00.000Z',
    });
    await repo.saveSession({
      id: 's2',
      date: '2026-10-27',
      therapistSaid: 'اتفقنا على الانتظار قبل الردّ',
      takeaway: '',
      homework: [
        { text: 'أ', done: true },
        { text: 'ب', done: false },
        { text: 'ج', done: true },
      ],
      createdAt: '2026-10-27T09:00:00.000Z',
    });
    setup(repo);

    const list = await screen.findByRole('list', { name: 'الجلسات السابقة' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('الثلاثاء ٢٧ أكتوبر');
    expect(items[0]).toHaveTextContent('الواجب: ٢ من ٣');
    expect(items[0]).toHaveTextContent('اتفقنا على الانتظار قبل الردّ');
    expect(items[1]).toHaveTextContent('الواجب: ٣ من ٣');
    expect(within(items[0]).getByRole('link')).toHaveAttribute('href', '/therapist/note/s2');
  });
});
