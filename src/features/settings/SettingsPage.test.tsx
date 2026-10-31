import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { exportBackup } from '../../db/backup';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { SettingsPage } from './SettingsPage';

function setup(repo: Repo = createMemoryRepo(), download = vi.fn()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <SettingsPage download={download} />
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, download, user: userEvent.setup() };
}

async function backupText(withSoothing: string) {
  const source = createMemoryRepo();
  await source.addSoothing(withSoothing, 'user');
  return JSON.stringify(await exportBackup(source));
}

const upload = (user: ReturnType<typeof userEvent.setup>, text: string) =>
  user.upload(
    screen.getByLabelText('اختيار ملف النسخة الاحتياطية'),
    new File([text], 'backup.json', { type: 'application/json' }),
  );

describe('SettingsPage profile', () => {
  it('has a «معلوماتي» section', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'معلوماتي' })).toBeInTheDocument();
  });
});

describe('SettingsPage backup', () => {
  it('downloads a dated backup file and remembers when', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('الرسم', 'user');
    const { user, download } = setup(repo);
    await user.click(await screen.findByRole('button', { name: 'تصدير نسخة احتياطية' }));

    expect(download).toHaveBeenCalledTimes(1);
    const [filename, text] = download.mock.calls[0];
    expect(filename).toMatch(/^rafiq-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(text).version).toBe(1);
    expect((await repo.getSettings()).lastBackupAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('shows the error and changes nothing when the chosen file is not a backup', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('قديم', 'user');
    const { user } = setup(repo);
    await upload(user, 'هذا ليس ملفًا صالحًا');
    await user.click(await screen.findByRole('button', { name: 'استيراد' }));
    await user.click(await screen.findByRole('button', { name: 'نعم، أستورد' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('الملف غير صالح');
    expect((await repo.listSoothing()).map((s) => s.text)).toEqual(['قديم']);
  });

  it('asks for confirmation before replacing, and replaces only after yes', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('قديم', 'user');
    const { user } = setup(repo);
    await upload(user, await backupText('جديد'));
    await user.click(await screen.findByRole('radio', { name: 'استبدال بياناتي الحالية' }));
    await user.click(screen.getByRole('button', { name: 'استيراد' }));

    expect(await screen.findByText(/سأستبدل كل بياناتي الحالية/)).toBeInTheDocument();
    expect((await repo.listSoothing()).map((s) => s.text)).toEqual(['قديم']);

    await user.click(screen.getByRole('button', { name: 'نعم، أستورد' }));
    expect(await screen.findByText('تم استيراد النسخة الاحتياطية.')).toBeInTheDocument();
    expect((await repo.listSoothing()).map((s) => s.text)).toEqual(['جديد']);
  });

  it('asks for confirmation before merging too, and keeps local data', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('قديم', 'user');
    const { user } = setup(repo);
    await upload(user, await backupText('جديد'));
    await user.click(await screen.findByRole('radio', { name: 'دمج مع بياناتي' }));
    await user.click(screen.getByRole('button', { name: 'استيراد' }));

    expect(await screen.findByText(/سأدمج ما في الملف مع بياناتي الحالية/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'نعم، أستورد' }));
    await screen.findByText('تم استيراد النسخة الاحتياطية.');
    expect((await repo.listSoothing()).map((s) => s.text).sort()).toEqual(['جديد', 'قديم']);
  });

  it('lets the user back out of the confirmation without importing', async () => {
    const repo = createMemoryRepo();
    const { user } = setup(repo);
    await upload(user, await backupText('جديد'));
    await user.click(await screen.findByRole('button', { name: 'استيراد' }));
    await user.click(await screen.findByRole('button', { name: 'تراجع' }));
    expect(await repo.listSoothing()).toHaveLength(0);
  });
});

describe('SettingsPage reminder', () => {
  it('saves the daily reminder time and clears it', async () => {
    const { repo, user } = setup();
    const input = await screen.findByLabelText('وقت التذكير اليومي');
    await user.type(input, '20:30');
    await user.click(screen.getByRole('button', { name: 'حفظ التذكير' }));
    expect((await repo.getSettings()).reminderTime).toBe('20:30');

    await user.click(screen.getByRole('button', { name: 'إيقاف التذكير' }));
    expect((await repo.getSettings()).reminderTime).toBeUndefined();
  });
});

describe('SettingsPage about', () => {
  it('repeats that the app does not replace therapy and links to the calm page', async () => {
    setup();
    expect(await screen.findByText(/ليس بديلًا عن العلاج/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'أحتاج تهدئة الآن' })).toHaveAttribute('href', '/calm');
  });
});
