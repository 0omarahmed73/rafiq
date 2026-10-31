import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { HomeReminders } from './HomeReminders';

const documents = vi.hoisted(() => ({ isAndroidPlatform: vi.fn(() => false) }));
vi.mock('../../platform/documents', () => documents);

function setup(repo: Repo, now: Date) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <HomeReminders now={now} />
      </MemoryRouter>
    </RepoProvider>,
  );
  return userEvent.setup();
}

describe('HomeReminders', () => {
  it('shows nothing when there is no reminder and the backup is recent', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', lastBackupAt: '2026-10-25T10:00:00.000Z' });
    const { container } = render(
      <RepoProvider repo={repo}>
        <MemoryRouter>
          <HomeReminders now={new Date(2026, 9, 31, 21, 0)} />
        </MemoryRouter>
      </RepoProvider>,
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(container).toBeEmptyDOMElement();
  });

  it('reminds about a backup after 21 days and links to the settings', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', lastBackupAt: '2026-10-01T10:00:00.000Z' });
    setup(repo, new Date(2026, 9, 31, 12, 0));
    expect(await screen.findByText(/نسخة احتياطية/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'فتح الإعدادات' })).toHaveAttribute('href', '/settings');
  });

  it('counts the 21 days from the disclaimer when no backup was ever made', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', disclaimerAcceptedAt: '2026-10-01T10:00:00.000Z' });
    setup(repo, new Date(2026, 9, 31, 12, 0));
    expect(await screen.findByText(/نسخة احتياطية/)).toBeInTheDocument();
  });

  it('shows the daily reminder when due and stops showing it once dismissed for the day', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', reminderTime: '20:00', lastBackupAt: '2026-10-30T10:00:00.000Z' });
    const user = setup(repo, new Date(2026, 9, 31, 20, 30));

    expect(await screen.findByText('حان وقت تسجيل مشاعري اليوم.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'حسنًا' }));

    expect(screen.queryByText('حان وقت تسجيل مشاعري اليوم.')).not.toBeInTheDocument();
    expect((await repo.getSettings()).lastReminderDay).toBe('2026-10-31');
  });

  it('does not show the daily reminder before its time', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', reminderTime: '20:00', lastBackupAt: '2026-10-30T10:00:00.000Z' });
    setup(repo, new Date(2026, 9, 31, 19, 0));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText('حان وقت تسجيل مشاعري اليوم.')).not.toBeInTheDocument();
  });
});

describe('HomeReminders on Android', () => {
  afterEach(() => {
    documents.isAndroidPlatform.mockReturnValue(false);
    vi.unstubAllGlobals();
  });

  it('shows the banner but never creates a browser Notification, because the native reminder covers it', async () => {
    documents.isAndroidPlatform.mockReturnValue(true);
    const created = vi.fn();
    class FakeNotification {
      static permission = 'granted';
      constructor(...args: unknown[]) {
        created(...args);
      }
    }
    vi.stubGlobal('Notification', FakeNotification);
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', reminderTime: '08:00', lastBackupAt: '2026-10-30T10:00:00.000Z' });
    setup(repo, new Date(2026, 9, 31, 21, 0));
    expect(await screen.findByText('حان وقت تسجيل مشاعري اليوم.')).toBeInTheDocument();
    expect(created).not.toHaveBeenCalled();
  });
});
