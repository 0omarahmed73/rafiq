import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('links to the yearly plan, with its overall progress', async () => {
    const repo = createMemoryRepo();
    await repo.saveYearPlanEntry({ id: 't:0:0:0', value: true });
    renderHome(repo);
    const link = await screen.findByRole('link', { name: /عامي الخامس والعشرون/ });
    expect(link).toHaveAttribute('href', '/year');
    expect(link).toHaveTextContent('١ من');
  });

  it('names the yearly plan after the saved age', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', planAge: 30 });
    renderHome(repo);
    expect(await screen.findByRole('link', { name: /عامي الثلاثون/ })).toBeInTheDocument();
  });

  it('has no streak wording', async () => {
    renderHome();
    await screen.findByText('الخطوة ١ من ١٠');
    expect(document.body.textContent).not.toMatch(/streak|سلسلة/i);
  });

  describe('quick notes', () => {
    it('saves a note from the home page and says so', async () => {
      const repo = createMemoryRepo();
      renderHome(repo);
      const user = userEvent.setup();
      await user.type(await screen.findByLabelText('ملاحظة سريعة'), 'تذكّرتُ أن أسأل عن النوم');
      await user.click(screen.getByRole('button', { name: 'إضافة ملاحظة' }));

      expect(await screen.findByText('أضفتُ الملاحظة.')).toBeInTheDocument();
      expect(screen.getByLabelText('ملاحظة سريعة')).toHaveValue('');
      expect((await repo.listNotes()).map((n) => [n.text, n.archivedAt])).toEqual([['تذكّرتُ أن أسأل عن النوم', undefined]]);
    });

    it('keeps the save button off until there is text', async () => {
      renderHome();
      expect(await screen.findByRole('button', { name: 'إضافة ملاحظة' })).toBeDisabled();
    });

    it('links to all notes and counts only the current ones', async () => {
      const repo = createMemoryRepo();
      await repo.saveNote({ id: 'a', text: 'أ', createdAt: '2026-10-20T09:00:00.000Z' });
      await repo.saveNote({ id: 'b', text: 'ب', createdAt: '2026-10-21T09:00:00.000Z' });
      await repo.saveNote({ id: 'c', text: 'ج', createdAt: '2026-10-05T09:00:00.000Z', archivedAt: '2026-10-08T08:00:00.000Z' });
      renderHome(repo);
      const link = await screen.findByRole('link', { name: /كل ملاحظاتي/ });
      expect(link).toHaveAttribute('href', '/therapist/notes');
      expect(link).toHaveTextContent('٢');
    });

    it('updates the count after saving a note', async () => {
      renderHome();
      const user = userEvent.setup();
      await user.type(await screen.findByLabelText('ملاحظة سريعة'), 'واحدة');
      await user.click(screen.getByRole('button', { name: 'إضافة ملاحظة' }));
      expect(await screen.findByRole('link', { name: /كل ملاحظاتي/ })).toHaveTextContent('١');
    });
  });
});


it('makes the private trigger journal discoverable from Home', async () => {
  renderHome();
  expect(await screen.findByRole('link', { name: 'محفزاتي' })).toHaveAttribute('href', '/triggers');

});
