import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import { App } from '../../App';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import type { Lang } from '../../i18n';
import { routes } from '../../routes';

/** A repo where the disclaimer is already accepted, so the screens behind it can be tested. */
async function acceptedRepo(language: Lang): Promise<Repo> {
  const repo = createMemoryRepo();
  await repo.saveSettings({
    id: 'settings',
    theme: 'system',
    language,
    disclaimerAcceptedAt: '2026-10-01T10:00:00.000Z',
  });
  return repo;
}

async function renderAt(path: string, repo: Repo, language: Lang) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<App router={router} repo={repo} persistent language={language} />);
  return router;
}

describe('English screens', () => {
  it('shows the tabs, the home screen and the step in English', async () => {
    await renderAt('/', await acceptedRepo('en'), 'en');
    const tabs = await screen.findByRole('navigation', { name: 'Navigation' });
    for (const label of ['Home', 'Journey', 'Tracker', 'My therapist', 'My library']) {
      expect(within(tabs).getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'How am I today?' })).toBeInTheDocument();
    expect(await screen.findByText('Step 1 of 10')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('shows the crisis page in English, with the Egypt numbers only where they apply', async () => {
    await renderAt('/calm', await acceptedRepo('en'), 'en');
    expect(await screen.findByRole('heading', { name: 'I need calm' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call: Mental health and psychological support hotline 16328/ })).toHaveAttribute('href', 'tel:16328');
    expect(screen.getByRole('link', { name: /Call: Ambulance 123/ })).toHaveAttribute('href', 'tel:123');
    expect(screen.getByRole('link', { name: /Call: Police 122/ })).toHaveAttribute('href', 'tel:122');
  });

  it('switches the whole app, and back, from Settings', async () => {
    const user = userEvent.setup();
    const repo = await acceptedRepo('ar');
    await renderAt('/settings', repo, 'ar');
    expect(await screen.findByRole('heading', { name: 'الإعدادات' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');
    expect((await repo.getSettings()).language).toBe('en');

    await user.click(screen.getByRole('radio', { name: 'العربية' }));
    expect(await screen.findByRole('heading', { name: 'الإعدادات' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
    expect((await repo.getSettings()).language).toBe('ar');
  });
});
