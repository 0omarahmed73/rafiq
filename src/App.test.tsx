import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router-dom';
import { App } from './App';
import { createMemoryRepo } from './db/memoryRepo';
import { routes } from './routes';

function renderApp(path: string, persistent = true) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<App router={router} repo={createMemoryRepo()} persistent={persistent} />);
  return router;
}

describe('App', () => {
  it('redirects unknown routes to the home route', () => {
    const router = renderApp('/does-not-exist');
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
