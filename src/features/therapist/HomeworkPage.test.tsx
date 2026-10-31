import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { ImageError, shrinkImage } from '../../lib/image';
import { HomeworkPage } from './HomeworkPage';

vi.mock('../../lib/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/image')>()),
  shrinkImage: vi.fn(),
}));
const shrink = vi.mocked(shrinkImage);

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname}</p>;
}

function Here() {
  const l = useLocation();
  return <p data-testid="here">{`${l.pathname}${l.search}`}</p>;
}

function setup(path: string, repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/therapist/homework/:id" element={<HomeworkPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
        <Here />
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup({ applyAccept: false }) };
}

async function seed(repo: Repo, over: Record<string, unknown> = {}) {
  await repo.saveHomework({
    id: 'h1', sessionId: 's1', text: 'أقرأ الفصل', notes: 'ملاحظة قديمة', answer: 'إجابة قديمة', done: false,
    createdAt: '2026-10-27T09:00:00.000Z', ...over,
  });
}

const photo = (name = 'a.jpg', type = 'image/jpeg') => new File(['x'], name, { type });
const picker = () => screen.getByLabelText('اختيار صور الواجب');

beforeEach(() => {
  shrink.mockReset();
  shrink.mockResolvedValue('data:image/jpeg;base64,SHRUNK');
});

describe('HomeworkPage: a new homework', () => {
  it('creates a homework from the title, notes and answer, linked to its session, and says it saved', async () => {
    const { repo, user } = setup('/therapist/homework/new?session=s7');
    await user.type(await screen.findByLabelText('ما الواجب؟'), 'أكتب يوميات الأسبوع');
    await user.type(screen.getByLabelText('ملاحظات'), 'من كلام المعالج');
    await user.type(screen.getByLabelText('إجابتي'), 'بدأتُ اليوم');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    expect(await screen.findByText('حفظتُ الواجب.')).toBeInTheDocument();
    const [saved] = await repo.listHomework();
    expect(saved).toMatchObject({ sessionId: 's7', text: 'أكتب يوميات الأسبوع', notes: 'من كلام المعالج', answer: 'بدأتُ اليوم', done: false });
    expect(saved.createdAt).toMatch(/^\d{4}-/);
  });

  it("after the first save the address becomes the homework's own page, so a reload or a second save never duplicates it", async () => {
    const { repo, user } = setup('/therapist/homework/new?session=s7');
    await user.type(await screen.findByLabelText('ما الواجب؟'), 'واجب جديد');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText('حفظتُ الواجب.');
    const [saved] = await repo.listHomework();
    expect(screen.getByTestId('here')).toHaveTextContent(`/therapist/homework/${saved.id}`);
    expect(screen.getByTestId('here')).not.toHaveTextContent('new');

    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await repo.listHomework()).toHaveLength(1);
  });

  it('does not save without a title and says so', async () => {
    const { repo, user } = setup('/therapist/homework/new?session=s7');
    await user.click(await screen.findByRole('button', { name: 'حفظ' }));
    expect(await screen.findByText('أكتب ما الواجب أولًا.')).toBeInTheDocument();
    expect(await repo.listHomework()).toEqual([]);
  });

  it('keeps a photo added before the first save, and writes it on that save', async () => {
    const { repo, user } = setup('/therapist/homework/new?session=s7');
    await user.type(await screen.findByLabelText('ما الواجب؟'), 'واجب بصورة');
    await user.upload(picker(), photo());
    expect(await screen.findByRole('img', { name: 'صورة الواجب ١' })).toBeInTheDocument();
    expect(await repo.exportAll().then((a) => a.homeworkImages)).toEqual([]);
    expect(screen.getByText('تُحفظ الصور مع الواجب عند الحفظ أو عند الخروج.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText('حفظتُ الواجب.');
    const [hw] = await repo.listHomework();
    expect((await repo.listHomeworkImages(hw.id)).map((i) => i.dataUrl)).toEqual(['data:image/jpeg;base64,SHRUNK']);
  });

  it('keeps typed text and offers a retry when saving fails', async () => {
    const { repo, user } = setup('/therapist/homework/new?session=s7');
    const real = repo.saveHomework.bind(repo);
    vi.spyOn(repo, 'saveHomework').mockRejectedValueOnce(new Error('disk full'));
    const title = await screen.findByLabelText('ما الواجب؟');
    await user.type(title, 'نص يجب ألا يضيع');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر حفظ الواجب، يمكنني المحاولة مرة أخرى.');
    expect(title).toHaveValue('نص يجب ألا يضيع');

    vi.mocked(repo.saveHomework).mockImplementation(real);
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByText('حفظتُ الواجب.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await repo.listHomework()).toHaveLength(1);
  });
});

describe('HomeworkPage: an existing homework', () => {
  it('opens with its notes, answer, tick and photos', async () => {
    const repo = createMemoryRepo();
    await seed(repo, { done: true });
    await repo.saveHomeworkImage({ id: 'i1', homeworkId: 'h1', dataUrl: 'data:image/jpeg;base64,AAA', createdAt: '2026-10-27T09:01:00.000Z' });
    setup('/therapist/homework/h1', repo);
    expect(await screen.findByLabelText('ما الواجب؟')).toHaveValue('أقرأ الفصل');
    expect(screen.getByLabelText('ملاحظات')).toHaveValue('ملاحظة قديمة');
    expect(screen.getByLabelText('إجابتي')).toHaveValue('إجابة قديمة');
    expect(screen.getByRole('checkbox', { name: 'أنجزتُ هذا الواجب' })).toBeChecked();
    expect(await screen.findByRole('img', { name: 'صورة الواجب ١' })).toHaveAttribute('src', 'data:image/jpeg;base64,AAA');
  });

  it('edits and saves, keeping the session link and the creation date', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    const { user } = setup('/therapist/homework/h1', repo);
    const answer = await screen.findByLabelText('إجابتي');
    await user.clear(answer);
    await user.type(answer, 'إجابة جديدة');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText('حفظتُ الواجب.');
    expect(await repo.getHomework('h1')).toMatchObject({
      answer: 'إجابة جديدة', sessionId: 's1', createdAt: '2026-10-27T09:00:00.000Z', text: 'أقرأ الفصل',
    });
  });

  it('ticking the box saves done at once', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    const { user } = setup('/therapist/homework/h1', repo);
    await user.click(await screen.findByRole('checkbox', { name: 'أنجزتُ هذا الواجب' }));
    await waitFor(async () => expect((await repo.getHomework('h1'))!.done).toBe(true));
  });

  it('says so when the homework cannot be found', async () => {
    setup('/therapist/homework/nope');
    expect(await screen.findByText('لا أجد هذا الواجب.')).toBeInTheDocument();
  });
});

describe('HomeworkPage: photos', () => {
  it('adds a shrunk photo to a saved homework at once', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    const { user } = setup('/therapist/homework/h1', repo);
    await screen.findByLabelText('ما الواجب؟');
    await user.upload(picker(), photo());
    await screen.findByRole('img', { name: 'صورة الواجب ١' });
    expect((await repo.listHomeworkImages('h1')).map((i) => i.dataUrl)).toEqual(['data:image/jpeg;base64,SHRUNK']);
    expect(shrink).toHaveBeenCalledTimes(1);
  });

  it('removes a photo', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    await repo.saveHomeworkImage({ id: 'i1', homeworkId: 'h1', dataUrl: 'data:image/jpeg;base64,AAA', createdAt: '2026-10-27T09:01:00.000Z' });
    const { user } = setup('/therapist/homework/h1', repo);
    await user.click(await screen.findByRole('button', { name: 'حذف الصورة ١' }));
    await waitFor(() => expect(screen.queryByRole('img', { name: 'صورة الواجب ١' })).not.toBeInTheDocument());
    expect(await repo.listHomeworkImages('h1')).toEqual([]);
  });

  it('shows an Arabic message and adds nothing for a non-image', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    shrink.mockRejectedValueOnce(new ImageError('not-image'));
    const { user } = setup('/therapist/homework/h1', repo);
    await screen.findByLabelText('ما الواجب؟');
    await user.upload(picker(), photo('a.txt', 'text/plain'));
    expect(await screen.findByRole('alert')).toHaveTextContent('الملف ليس صورة.');
    expect(await repo.listHomeworkImages('h1')).toEqual([]);
  });

  it('shows an Arabic message and adds nothing for an unreadable image', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    shrink.mockRejectedValueOnce(new ImageError('unreadable'));
    const { user } = setup('/therapist/homework/h1', repo);
    await screen.findByLabelText('ما الواجب؟');
    await user.upload(picker(), photo());
    expect(await screen.findByRole('alert')).toHaveTextContent('لا أستطيع قراءة هذه الصورة.');
    expect(await repo.listHomeworkImages('h1')).toEqual([]);
  });

  it('refuses a seventh photo with a message', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    for (let i = 0; i < 6; i++) {
      await repo.saveHomeworkImage({ id: `i${i}`, homeworkId: 'h1', dataUrl: 'data:image/jpeg;base64,AAA', createdAt: `2026-10-27T09:0${i}:00.000Z` });
    }
    const { user } = setup('/therapist/homework/h1', repo);
    await screen.findByLabelText('ما الواجب؟');
    await user.upload(picker(), photo());
    expect(await screen.findByRole('alert')).toHaveTextContent('وصلتُ إلى الحد الأقصى: ٦ صور.');
    expect(await repo.listHomeworkImages('h1')).toHaveLength(6);
    expect(shrink).not.toHaveBeenCalled();
  });

  it('opens a photo larger and closes the viewer', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    await repo.saveHomeworkImage({ id: 'i1', homeworkId: 'h1', dataUrl: 'data:image/jpeg;base64,AAA', createdAt: '2026-10-27T09:01:00.000Z' });
    const { user } = setup('/therapist/homework/h1', repo);
    await user.click(await screen.findByRole('button', { name: 'فتح الصورة ١' }));
    const viewer = screen.getByRole('dialog', { name: 'عرض الصورة' });
    expect(within(viewer).getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,AAA');
    await user.click(within(viewer).getByRole('button', { name: 'إغلاق' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('HomeworkPage: deleting', () => {
  it('asks first; cancelling keeps it; confirming removes it and its photos but not other homework', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    await seed(repo, { id: 'h2', text: 'واجب آخر' });
    await repo.saveHomeworkImage({ id: 'i1', homeworkId: 'h1', dataUrl: 'data:image/jpeg;base64,AAA', createdAt: '2026-10-27T09:01:00.000Z' });
    await repo.saveHomeworkImage({ id: 'i2', homeworkId: 'h2', dataUrl: 'data:image/jpeg;base64,BBB', createdAt: '2026-10-27T09:01:00.000Z' });
    const { user } = setup('/therapist/homework/h1', repo);
    await user.click(await screen.findByRole('button', { name: 'حذف الواجب' }));
    expect(screen.getByText('أحذف هذا الواجب مع صوره؟ لا يمكن التراجع عن ذلك.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'إلغاء الحذف' }));
    expect(await repo.listHomework()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'حذف الواجب' }));
    await user.click(screen.getByRole('button', { name: 'نعم، أحذف' }));
    expect(await screen.findByTestId('where')).toHaveTextContent('/therapist/homework');
    expect((await repo.listHomework()).map((h) => h.id)).toEqual(['h2']);
    expect((await repo.exportAll()).homeworkImages.map((i) => i.id)).toEqual(['i2']);
  });

  it('keeps the homework and shows an Arabic error when deleting fails', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    const { user } = setup('/therapist/homework/h1', repo);
    vi.spyOn(repo, 'deleteHomework').mockRejectedValueOnce(new Error('locked'));
    await user.click(await screen.findByRole('button', { name: 'حذف الواجب' }));
    await user.click(screen.getByRole('button', { name: 'نعم، أحذف' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر حذف الواجب، يمكنني المحاولة مرة أخرى.');
    expect(await repo.listHomework()).toHaveLength(1);
  });
});

describe('HomeworkPage: review fixes', () => {
  const stored = (repo: Repo, n: number) =>
    Promise.all(
      Array.from({ length: n }, (_, i) =>
        repo.saveHomeworkImage({ id: `i${i}`, homeworkId: 'h1', dataUrl: 'data:image/jpeg;base64,AAA', createdAt: `2026-10-27T09:0${i}:00.000Z` }),
      ),
    );

  it('never goes past six photos even when many are picked at once', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    await stored(repo, 4);
    const { user } = setup('/therapist/homework/h1', repo);
    await screen.findByLabelText('ما الواجب؟');
    await user.upload(picker(), [photo('1.jpg'), photo('2.jpg'), photo('3.jpg'), photo('4.jpg'), photo('5.jpg')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('وصلتُ إلى الحد الأقصى: ٦ صور.');
    expect(await repo.listHomeworkImages('h1')).toHaveLength(6);
    expect(shrink).toHaveBeenCalledTimes(2);
  });

  it('does not reload and overwrite the form after the first save', async () => {
    const { repo, user } = setup('/therapist/homework/new?session=s7');
    const load = vi.spyOn(repo, 'getHomework');
    await user.type(await screen.findByLabelText('ما الواجب؟'), 'واجب جديد');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText('حفظتُ الواجب.');
    const answer = screen.getByLabelText('إجابتي');
    await user.type(answer, 'تابعتُ الكتابة');
    expect(answer).toHaveValue('تابعتُ الكتابة');
    expect(load).not.toHaveBeenCalled();
  });

  it('saves a new homework with its photo when I leave the page without pressing حفظ', async () => {
    const { repo, user } = setup('/therapist/homework/new?session=s7');
    await user.type(await screen.findByLabelText('ما الواجب؟'), 'واجب لم أحفظه');
    await user.type(screen.getByLabelText('إجابتي'), 'إجابة لا أريد أن أفقدها');
    await user.upload(picker(), photo());
    await screen.findByRole('img', { name: 'صورة الواجب ١' });
    await user.click(screen.getByRole('link', { name: /ملاحظات الجلسة/ }));
    await screen.findByTestId('where');
    await waitFor(async () => expect(await repo.listHomework()).toHaveLength(1));
    const [saved] = await repo.listHomework();
    expect(saved).toMatchObject({ sessionId: 's7', text: 'واجب لم أحفظه', answer: 'إجابة لا أريد أن أفقدها' });
    expect(await repo.listHomeworkImages(saved.id)).toHaveLength(1);
  });

  it('saves edits to an existing homework when I leave without pressing حفظ', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    const { user } = setup('/therapist/homework/h1', repo);
    const answer = await screen.findByLabelText('إجابتي');
    await user.clear(answer);
    await user.type(answer, 'تعديل لم أحفظه');
    await user.click(screen.getByRole('link', { name: /ملاحظات الجلسة/ }));
    await waitFor(async () => expect((await repo.getHomework('h1'))!.answer).toBe('تعديل لم أحفظه'));
  });

  it('writes nothing on leaving when nothing changed, or when there is no title', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    const save = vi.spyOn(repo, 'saveHomework');
    const { user } = setup('/therapist/homework/h1', repo);
    await screen.findByLabelText('ما الواجب؟');
    await user.click(screen.getByRole('link', { name: /ملاحظات الجلسة/ }));
    await screen.findByTestId('where');
    expect(save).not.toHaveBeenCalled();
  });

  it('writes nothing for a new homework that has no title', async () => {
    const { repo, user } = setup('/therapist/homework/new?session=s7');
    await user.type(await screen.findByLabelText('إجابتي'), 'بلا عنوان');
    await user.click(screen.getByRole('link', { name: /ملاحظات الجلسة/ }));
    await screen.findByTestId('where');
    expect(await repo.listHomework()).toEqual([]);
  });

  it('after a failed photo save the homework counts as saved: it can be deleted, and a retry stores the photo once', async () => {
    const { repo, user } = setup('/therapist/homework/new?session=s7');
    const real = repo.saveHomeworkImage.bind(repo);
    vi.spyOn(repo, 'saveHomeworkImage').mockRejectedValueOnce(new Error('disk full'));
    await user.type(await screen.findByLabelText('ما الواجب؟'), 'واجب بصورة');
    await user.upload(picker(), photo());
    await screen.findByRole('img', { name: 'صورة الواجب ١' });
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر حفظ الواجب، يمكنني المحاولة مرة أخرى.');
    expect(screen.getByRole('button', { name: 'حذف الواجب' })).toBeInTheDocument();

    vi.mocked(repo.saveHomeworkImage).mockImplementation(real);
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText('حفظتُ الواجب.');
    const [hw] = await repo.listHomework();
    expect(await repo.listHomework()).toHaveLength(1);
    expect(await repo.listHomeworkImages(hw.id)).toHaveLength(1);
  });

  it('turns the tick, photo and delete controls off while a save is running', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    await repo.saveHomeworkImage({ id: 'i0', homeworkId: 'h1', dataUrl: 'data:image/jpeg;base64,AAA', createdAt: '2026-10-27T09:01:00.000Z' });
    let release!: () => void;
    const real = repo.saveHomework.bind(repo);
    vi.spyOn(repo, 'saveHomework').mockImplementationOnce(
      (h) => new Promise<void>((resolve) => (release = () => void real(h).then(resolve))),
    );
    const { user } = setup('/therapist/homework/h1', repo);
    await screen.findByLabelText('ما الواجب؟');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(screen.getByRole('checkbox', { name: 'أنجزتُ هذا الواجب' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'أضيف صورة' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'حذف الصورة ١' })).toBeDisabled();
    release();
    await screen.findByText('حفظتُ الواجب.');
    expect(screen.getByRole('checkbox', { name: 'أنجزتُ هذا الواجب' })).toBeEnabled();
  });

  it('undoes the tick and says why when the title is empty', async () => {
    const repo = createMemoryRepo();
    await seed(repo);
    const { user } = setup('/therapist/homework/h1', repo);
    await user.clear(await screen.findByLabelText('ما الواجب؟'));
    await user.click(screen.getByRole('checkbox', { name: 'أنجزتُ هذا الواجب' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('أكتب ما الواجب أولًا.');
    expect(screen.getByRole('checkbox', { name: 'أنجزتُ هذا الواجب' })).not.toBeChecked();
    expect((await repo.getHomework('h1'))!.done).toBe(false);
  });
});

describe('HomeworkPage: layout safety', () => {
  it('lets long unbroken text wrap instead of widening the page', async () => {
    const repo = createMemoryRepo();
    await seed(repo, { text: 'ا'.repeat(300), notes: 'ب'.repeat(300), answer: 'ج'.repeat(300) });
    setup('/therapist/homework/h1', repo);
    for (const label of ['ما الواجب؟', 'ملاحظات', 'إجابتي']) {
      const field = await screen.findByLabelText(label);
      expect(field.className).toContain('w-full');
      expect(field.className).toContain('min-w-0');
      expect(field.className).toContain('break-words');
    }
  });
});
