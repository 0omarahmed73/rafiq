import './styles/tokens.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { openDb } from './db/open';
import { installAccents } from './lib/accents';
import { hideSplash } from './lib/splash';
import { routes } from './routes';

async function boot() {
  const { repo, persistent } = await openDb();
  installAccents((await repo.getSettings()).accent);
  const router = createBrowserRouter(routes);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App router={router} repo={repo} persistent={persistent} />
    </StrictMode>,
  );
  // Let the first screen paint underneath before the splash fades.
  requestAnimationFrame(() => requestAnimationFrame(() => hideSplash()));
}

void boot();
