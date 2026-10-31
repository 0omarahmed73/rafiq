import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { steps } from '../../content';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { JourneyPage } from './JourneyPage';

function renderJourney(repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <JourneyPage />
      </MemoryRouter>
    </RepoProvider>,
  );
}

describe('JourneyPage', () => {
  it('lists all ten steps as links to their pages', async () => {
    renderJourney();
    const list = await screen.findByRole('list', { name: 'خطوات الرحلة' });
    const links = within(list).getAllByRole('link');
    expect(links).toHaveLength(10);
    steps.forEach((s, i) => {
      expect(links[i]).toHaveAttribute('href', `/step/${s.id}`);
      expect(links[i]).toHaveTextContent(s.title);
    });
  });

  it('locks nothing: a later step is reachable while step 1 is not started', async () => {
    renderJourney();
    const link = await screen.findByRole('link', { name: /الثقة بالنفس/ });
    expect(link).toHaveAttribute('href', '/step/8');
    expect(link).not.toHaveAttribute('aria-disabled');
  });

  it('labels finished and in-progress steps', async () => {
    const repo = createMemoryRepo();
    await repo.saveStepProgress({ stepId: 1, status: 'done', daysPracticed: [] });
    await repo.saveStepProgress({ stepId: 2, status: 'inProgress', daysPracticed: ['2026-10-31'] });
    renderJourney(repo);

    expect(await screen.findByText('مكتملة')).toBeInTheDocument();
    expect(screen.getByText('قيد التمرين')).toBeInTheDocument();
  });

  it('marks the current step', async () => {
    const repo = createMemoryRepo();
    await repo.saveStepProgress({ stepId: 1, status: 'done', daysPracticed: [] });
    renderJourney(repo);

    const current = await screen.findByRole('link', { name: /تقبّل الذات/ });
    expect(current).toHaveAttribute('aria-current', 'step');
  });
});
