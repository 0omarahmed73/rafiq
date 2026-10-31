import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { AccentPicker } from './AccentPicker';

function setup(repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <AccentPicker />
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

afterEach(() => document.documentElement.removeAttribute('data-accent'));

describe('AccentPicker', () => {
  it('offers the six colours by their Arabic names', async () => {
    setup();
    const group = await screen.findByRole('radiogroup', { name: 'اللون المفضّل' });
    const names = within(group)
      .getAllByRole('radio')
      .map((r) => r.getAttribute('aria-label'));
    expect(names).toEqual(['تركوازي', 'أزرق', 'بنفسجي', 'وردي', 'كهرماني', 'أخضر']);
  });

  it('has teal chosen by default', async () => {
    setup();
    expect(await screen.findByRole('radio', { name: 'تركوازي' })).toBeChecked();
  });

  it('shows the colour that was saved earlier', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', accent: 'rose' });
    setup(repo);
    expect(await screen.findByRole('radio', { name: 'وردي' })).toBeChecked();
  });

  it('falls back to teal for a saved colour it does not know', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', accent: 'nonsense' });
    setup(repo);
    expect(await screen.findByRole('radio', { name: 'تركوازي' })).toBeChecked();
  });

  it('saves the chosen colour and applies it at once', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByRole('radio', { name: 'أزرق' }));

    expect((await repo.getSettings()).accent).toBe('blue');
    expect(document.documentElement.dataset.accent).toBe('blue');
    expect(screen.getByRole('radio', { name: 'أزرق' })).toBeChecked();
  });

  it('keeps the other settings when it saves the colour', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'dark', reminderTime: '20:00' });
    const { user } = setup(repo);
    await user.click(await screen.findByRole('radio', { name: 'أخضر' }));

    const saved = await repo.getSettings();
    expect(saved).toMatchObject({ theme: 'dark', reminderTime: '20:00', accent: 'green' });
  });

  it('makes every option at least 44px', async () => {
    setup();
    await screen.findByRole('radiogroup', { name: 'اللون المفضّل' });
    for (const label of screen.getAllByRole('radio').map((r) => r.closest('label'))) {
      expect(label?.className).toMatch(/min-h-11/);
    }
  });
});
