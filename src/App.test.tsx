import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import { App } from './App';
import { createMemoryRepo } from './db/memoryRepo';
import type { Lang } from './i18n';
import { routes } from './routes';

/** Arabic by default, so the Arabic copy checks below run as they always did. */
/** `null` means no language has been chosen yet. */
function renderApp(path: string, persistent = true, language: Lang | null = 'ar') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const repo = createMemoryRepo();
  render(<App router={router} repo={repo} persistent={persistent} language={language ?? undefined} />);
  return { router, repo };
}

describe('App', () => {
  it('redirects unknown routes to the home route', () => {
    const { router } = renderApp('/does-not-exist');
    expect(router.state.location.pathname).toBe('/');
  });

  it('sets Arabic language and right-to-left direction on the document', () => {
    renderApp('/');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('warns when storage is not persistent', () => {
    renderApp('/', false);
    expect(screen.getByRole('status')).toHaveTextContent('لن تُحفظ بياناتي');
  });

  it('shows no storage warning when storage is persistent', () => {
    renderApp('/', true);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('first run language', () => {
  it('asks for a language before anything else, with English preselected', () => {
    renderApp('/', true, null);
    expect(screen.getByRole('heading', { name: /Choose your language/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'العربية' })).not.toBeChecked();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('saves the chosen language and then shows the disclaimer in that language', async () => {
    const user = userEvent.setup();
    const { repo } = renderApp('/', true, null);
    await user.click(screen.getByRole('radio', { name: 'العربية' }));
    await user.click(screen.getByRole('button', { name: /متابعة/ }));
    expect((await repo.getSettings()).language).toBe('ar');
    expect(await screen.findByRole('heading', { name: 'مرحبًا في رفيق' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('keeps the calm page reachable behind the language screen', () => {
    renderApp('/calm', true, null);
    expect(screen.getByRole('heading', { name: 'I need calm' })).toBeInTheDocument();
    expect(within(document.body).queryByRole('radio')).not.toBeInTheDocument();
  });
});
