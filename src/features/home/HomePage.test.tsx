import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { HomePage } from './HomePage';

function renderHome(repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </RepoProvider>,
  );
}

describe('HomePage', () => {
  it('links the calming button to the calm page', () => {
    renderHome();
    expect(screen.getByRole('link', { name: 'أحتاج تهدئة' })).toHaveAttribute('href', '/calm');
  });

  it('starts on step 1 when nothing is done', async () => {
    renderHome();
    expect(await screen.findByText('الخطوة ١ من ١٠')).toBeInTheDocument();
    expect(screen.getByText('تصديق المشاعر')).toBeInTheDocument();
  });

  it('shows the first step that is not done', async () => {
    const repo = createMemoryRepo();
    await repo.saveStepProgress({ stepId: 1, status: 'done', daysPracticed: [] });
    await repo.saveStepProgress({ stepId: 2, status: 'done', daysPracticed: [] });
    renderHome(repo);
    expect(await screen.findByText('الخطوة ٣ من ١٠')).toBeInTheDocument();
    expect(screen.getByText('تنظيم الذات')).toBeInTheDocument();
  });

  it('has no streak wording', async () => {
    renderHome();
    await screen.findByText('الخطوة ١ من ١٠');
    expect(document.body.textContent).not.toMatch(/streak|سلسلة/i);
  });
});
