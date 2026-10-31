import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { ProfileCard } from './ProfileCard';

function setup(repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <ProfileCard />
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

describe('ProfileCard', () => {
  it('starts empty and says where the name and therapist appear', async () => {
    setup();
    expect(await screen.findByLabelText('اسمي')).toHaveValue('');
    expect(screen.getByText(/يظهران في أعلى الملخّص/)).toBeInTheDocument();
  });

  it('saves the four fields and keeps the other settings', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'dark', accent: 'rose' });
    const { user } = setup(repo);
    await user.type(await screen.findByLabelText('اسمي'), 'عمر');
    await user.type(screen.getByLabelText('اسم معالجي'), 'د. سارة');
    await user.type(screen.getByLabelText('شخص أثق به'), 'أحمد');
    await user.type(screen.getByLabelText('رقم هاتفه'), '0100');
    await user.click(screen.getByRole('button', { name: 'حفظ معلوماتي' }));

    expect(await screen.findByRole('status')).toHaveTextContent('تم الحفظ');
    expect(await repo.getSettings()).toMatchObject({
      theme: 'dark',
      accent: 'rose',
      displayName: 'عمر',
      therapistName: 'د. سارة',
      trustedName: 'أحمد',
      trustedPhone: '0100',
    });
  });

  it('shows what was saved before', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', displayName: 'عمر' });
    setup(repo);
    expect(await screen.findByLabelText('اسمي')).toHaveValue('عمر');
  });

  it('clearing a field removes it instead of saving an empty string', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', displayName: 'عمر' });
    const { user } = setup(repo);
    await user.clear(await screen.findByLabelText('اسمي'));
    await user.click(screen.getByRole('button', { name: 'حفظ معلوماتي' }));
    await screen.findByRole('status');
    expect((await repo.getSettings()).displayName).toBeUndefined();
  });
});
