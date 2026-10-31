import { render, screen } from '@testing-library/react';
import { createMemoryRepo } from './memoryRepo';
import { RepoProvider, useRepo } from './RepoContext';

function Probe() {
  const repo = useRepo();
  return <span>{typeof repo.addCheckin}</span>;
}

describe('RepoContext', () => {
  it('gives components the repo from the provider', () => {
    render(
      <RepoProvider repo={createMemoryRepo()}>
        <Probe />
      </RepoProvider>,
    );
    expect(screen.getByText('function')).toBeInTheDocument();
  });

  it('throws a clear error when used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('RepoProvider');
    spy.mockRestore();
  });
});
