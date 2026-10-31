import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TabBar } from './TabBar';

describe('TabBar', () => {
  it('links the four tabs to their routes', () => {
    render(
      <MemoryRouter>
        <TabBar />
      </MemoryRouter>,
    );
    const expected: Record<string, string> = {
      الرئيسية: '/',
      الرحلة: '/journey',
      التتبّع: '/tracker',
      لمعالجي: '/therapist',
    };
    for (const [name, href] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });
});
