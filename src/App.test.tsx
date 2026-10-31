import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router-dom';
import { App } from './App';
import { routes } from './routes';

describe('App', () => {
  it('redirects unknown routes to the home route', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/does-not-exist'] });
    render(<App router={router} />);
    expect(router.state.location.pathname).toBe('/');
  });

  it('sets Arabic language and right-to-left direction on the document', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(<App router={router} />);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });
});
