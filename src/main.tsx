import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css';
import './styles/tokens.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { openDb } from './db/open';
import { routes } from './routes';

async function boot() {
  const { repo, persistent } = await openDb();
  const router = createBrowserRouter(routes);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App router={router} repo={repo} persistent={persistent} />
    </StrictMode>,
  );
}

void boot();
