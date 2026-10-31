import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import { RepoProvider } from '../../db/RepoContext';
import { dayKey } from '../../lib/dates';
import { QuickCheckin } from './QuickCheckin';

function setup() {
  const repo = createMemoryRepo();
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <QuickCheckin />
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

describe('QuickCheckin', () => {
  it('shows no save button until an emotion is chosen', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'حفظ' })).not.toBeInTheDocument();
  });

  it('saves one check-in with the chosen emotion and the default intensity of 5', async () => {
    const { repo, user } = setup();
    await user.click(screen.getByRole('button', { name: 'حزن' }));
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    const today = dayKey(new Date());
    const saved = await repo.listCheckins({ from: today, to: today });
    expect(saved).toHaveLength(1);
    expect(saved[0].emotions).toEqual(['sadness']);
    expect(saved[0].intensity).toBe(5);
    expect(await screen.findByText('تم الحفظ')).toBeInTheDocument();
  });
});
