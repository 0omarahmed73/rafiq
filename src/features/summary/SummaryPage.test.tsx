import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { SummaryPage } from './SummaryPage';
import { isAndroidPlatform, printSummaryDocument } from '../../platform/documents';

vi.mock('../../platform/documents', () => ({
  isAndroidPlatform: vi.fn(() => false),
  printSummaryDocument: vi.fn(() => Promise.resolve()),
}));
const mockedPrint = vi.mocked(printSummaryDocument);
const mockedAndroid = vi.mocked(isAndroidPlatform);


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

  it('has the seven include-switches, all on by default', async () => {
    setup();
    for (const name of [
      'تسجيلات المشاعر',
      'منحنى الشدّة',
      'مراجعات الأسبوع',
      'الممارسات الموجّهة',
      'ما وسمتُه «للنقاش في الجلسة»',
      'إجابات الواجبات',
      'ملاحظاتي',
    ]) {
      expect(await screen.findByRole('checkbox', { name })).toBeChecked();
    }
  });

  it('shows homework answers and notes of the period in the preview, and drops each with its own switch', async () => {
    const repo = createMemoryRepo();
    await repo.saveHomework({ id: 'h1', sessionId: 's1', text: 'واجب ظاهر', answer: 'إجابة ظاهرة', done: true, createdAt: new Date(2026, 9, 12, 9).toISOString() });
    await repo.saveNote({ id: 'n1', text: 'ملاحظة ظاهرة للأسبوع', createdAt: new Date(2026, 9, 14, 9).toISOString() });
    const { user } = setup(repo);
    expect(await screen.findByText('إجابة ظاهرة')).toBeInTheDocument();
    expect(screen.getByText('ملاحظة ظاهرة للأسبوع')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'إجابات الواجبات' }));
    expect(screen.queryByText('إجابة ظاهرة')).not.toBeInTheDocument();
    expect(screen.getByText('ملاحظة ظاهرة للأسبوع')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'ملاحظاتي' }));
    expect(screen.queryByText('ملاحظة ظاهرة للأسبوع')).not.toBeInTheDocument();
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

describe('SummaryPage native printing', () => {
  beforeEach(() => {
    mockedAndroid.mockReturnValue(true);
    mockedPrint.mockClear();
    mockedPrint.mockResolvedValue(undefined);
  });
  afterEach(() => {
    mockedAndroid.mockReturnValue(false);
    delete (document as { fonts?: unknown }).fonts;
  });

  async function seeded() {
    const repo = createMemoryRepo();
    await repo.addCheckin({ at: new Date(2026, 9, 12, 9, 30).toISOString(), day: '2026-10-12', emotions: ['sadness'], intensity: 6, tags: [], note: 'ملاحظة ظاهرة', forNextSession: false });
    const base = { practiceId: 'validate', stepId: 1, forNextSession: false };
    await repo.savePractice({ ...base, id: 'shared', startedAt: new Date(2026, 9, 20, 9).toISOString(), completedAt: new Date(2026, 9, 20, 9, 5).toISOString(), answers: { v1: { text: 'نص مشارَك' } }, share: true });
    await repo.savePractice({ ...base, id: 'private', startedAt: new Date(2026, 9, 21, 9).toISOString(), completedAt: new Date(2026, 9, 21, 9, 5).toISOString(), answers: { v1: { text: 'نص خاص' } }, share: false });
    await repo.saveSession({ id: 's1', date: '2026-10-22', therapistSaid: 'كلام الجلسة السري', takeaway: '', homework: [], createdAt: new Date(2026, 9, 22).toISOString() });
    return repo;
  }

  it('printsOnlySelectedArticle: sends the report without private data, navigation or controls', async () => {
    const { user } = setup(await seeded());
    await screen.findByText('ملاحظة ظاهرة');
    await user.click(screen.getByRole('button', { name: 'حفظ كملف PDF' }));

    expect(mockedPrint).toHaveBeenCalledTimes(1);
    const html = mockedPrint.mock.calls[0][0];
    expect(html).toContain('ملاحظة ظاهرة');
    for (const hidden of ['نص خاص', 'كلام الجلسة السري', 'جلسات المعالج', 'حفظ كملف PDF', 'splash']) {
      expect(html).not.toContain(hidden);
    }
  });

  it('prints an all-switches-off report with the nothing-chosen message', async () => {
    const { user } = setup(await seeded());
    for (const name of ['تسجيلات المشاعر', 'منحنى الشدّة', 'مراجعات الأسبوع', 'الممارسات الموجّهة', 'ما وسمتُه «للنقاش في الجلسة»', 'إجابات الواجبات', 'ملاحظاتي']) {
      await user.click(await screen.findByRole('checkbox', { name }));
    }
    await user.click(screen.getByRole('button', { name: 'حفظ كملف PDF' }));
    expect(mockedPrint.mock.calls[0][0]).toContain('لم أختر ما يدخل في الملخّص');
  });

  it('nativePrintWaitsForReadyContent: waits for the fonts before printing', async () => {
    let release!: () => void;
    (document as { fonts?: unknown }).fonts = { ready: new Promise<void>((r) => (release = r)) };
    const { user } = setup(await seeded());
    await screen.findByText('ملاحظة ظاهرة');
    await user.click(screen.getByRole('button', { name: 'حفظ كملف PDF' }));
    expect(mockedPrint).not.toHaveBeenCalled();
    release();
    await vi.waitFor(() => expect(mockedPrint).toHaveBeenCalledTimes(1));
  });

  it('shows an Arabic error, keeps the theme, and allows a retry when printing fails', async () => {
    document.documentElement.dataset.theme = 'dark';
    mockedPrint.mockRejectedValueOnce(new Error('print failed'));
    const { user } = setup(await seeded());
    await screen.findByText('ملاحظة ظاهرة');
    await user.click(screen.getByRole('button', { name: 'حفظ كملف PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّرت الطباعة، يمكنني المحاولة مرة أخرى.');
    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'حفظ كملف PDF' }));
    expect(mockedPrint).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    delete document.documentElement.dataset.theme;
  });

  it('browserStillUsesWindowPrint', async () => {
    mockedAndroid.mockReturnValue(false);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: 'حفظ كملف PDF' }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(mockedPrint).not.toHaveBeenCalled();
    print.mockRestore();
  });
});
