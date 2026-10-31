import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import { RepoProvider } from '../../db/RepoContext';
import { PracticePage } from './PracticePage';

describe('PracticePage', () => {
  it('says so when the practice does not exist', () => {
    render(
      <RepoProvider repo={createMemoryRepo()}>
        <MemoryRouter initialEntries={['/practice/missing']}>
          <Routes>
            <Route path="/practice/:practiceId" element={<PracticePage />} />
          </Routes>
        </MemoryRouter>
      </RepoProvider>,
    );
    expect(screen.getByText('هذا التمرين غير موجود')).toBeInTheDocument();
  });
});
