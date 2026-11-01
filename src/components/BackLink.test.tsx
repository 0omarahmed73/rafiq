import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BackLink } from './BackLink';

const routes = (
  <Routes>
    <Route path="/library/symptoms/anger" element={<div>صفحة العَرَض</div>} />
    <Route path="/" element={<div>الرئيسية الفعلية</div>} />
    <Route path="/calm" element={<BackLink fallback="/">الرجوع</BackLink>} />
  </Routes>
);

describe('BackLink', () => {
  it('returns to the page the reader came from, not always to the fallback', async () => {
    render(<MemoryRouter initialEntries={['/library/symptoms/anger', '/calm']} initialIndex={1}>{routes}</MemoryRouter>);
    await userEvent.setup().click(screen.getByRole('link', { name: /الرجوع/ }));
    expect(await screen.findByText('صفحة العَرَض')).toBeInTheDocument();
  });

  it('goes to the fallback when there is nothing to go back to (opened directly or after a reload)', async () => {
    render(<MemoryRouter initialEntries={['/calm']}>{routes}</MemoryRouter>);
    await userEvent.setup().click(screen.getByRole('link', { name: /الرجوع/ }));
    expect(await screen.findByText('الرئيسية الفعلية')).toBeInTheDocument();
  });

  it('keeps the fallback as the link address, so it still works without scripting', () => {
    render(<MemoryRouter initialEntries={['/calm']}>{routes}</MemoryRouter>);
    expect(screen.getByRole('link', { name: /الرجوع/ })).toHaveAttribute('href', '/');
  });

  it('is at least 44px tall and shows the arrow as decoration', () => {
    render(<MemoryRouter initialEntries={['/calm']}>{routes}</MemoryRouter>);
    const link = screen.getByRole('link', { name: /الرجوع/ });
    expect(link.className).toMatch(/min-h-11/);
  });
});
