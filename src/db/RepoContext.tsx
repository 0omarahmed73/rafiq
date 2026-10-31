import { createContext, useContext, type ReactNode } from 'react';
import type { Repo } from './repo';

const RepoContext = createContext<Repo | null>(null);

export function RepoProvider({ repo, children }: { repo: Repo; children: ReactNode }) {
  return <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>;
}

/** The repo when a provider exists, else null (for components that only sometimes need storage). */
export function useOptionalRepo(): Repo | null {
  return useContext(RepoContext);
}

export function useRepo(): Repo {
  const repo = useContext(RepoContext);
  if (!repo) throw new Error('useRepo must be used inside a RepoProvider');
  return repo;
}
