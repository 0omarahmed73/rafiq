import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { DisclaimerGate } from './DisclaimerGate';

function setup(repo: Repo, path = '/') {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter initialEntries={[path]}>
        <DisclaimerGate>
          <p>محتوى التطبيق</p>
        </DisclaimerGate>
      </MemoryRouter>
    </RepoProvider>,
  );
  return userEvent.setup();
}

describe('DisclaimerGate', () => {
  it('shows the disclaimer first and keeps the app hidden', async () => {
    setup(createMemoryRepo());
    expect(await screen.findByText(/ليس بديلًا عن العلاج/)).toBeInTheDocument();
    expect(screen.queryByText('محتوى التطبيق')).not.toBeInTheDocument();
  });

  it('stores the acceptance time and then shows the app', async () => {
    const repo = createMemoryRepo();
    const user = setup(repo);
    await user.click(await screen.findByRole('button', { name: 'أفهم، لنبدأ' }));

    expect(await screen.findByText('محتوى التطبيق')).toBeInTheDocument();
    expect((await repo.getSettings()).disclaimerAcceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('shows the app straight away once the disclaimer was accepted', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', disclaimerAcceptedAt: '2026-10-01T10:00:00.000Z' });
    setup(repo);
    expect(await screen.findByText('محتوى التطبيق')).toBeInTheDocument();
  });

  it('always offers the calming page from the disclaimer', async () => {
    setup(createMemoryRepo());
    expect(await screen.findByRole('link', { name: 'أحتاج تهدئة الآن' })).toHaveAttribute('href', '/calm');
  });

  it('never blocks the calm page, even before the disclaimer is accepted', async () => {
    setup(createMemoryRepo(), '/calm');
    expect(await screen.findByText('محتوى التطبيق')).toBeInTheDocument();
  });
});
