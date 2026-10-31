import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TabBar } from './TabBar';

describe('TabBar icons', () => {
  function renderBar() {
    return render(
      <MemoryRouter>
        <TabBar />
      </MemoryRouter>,
    );
  }

  it('gives every tab its own decorative icon above the label', () => {
    const { container } = renderBar();
    const links = screen.getAllByRole('link');
    const shapes = links.map((a) => {
      const svg = a.querySelector('svg');
      expect(svg, a.textContent ?? '').not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      return svg!.innerHTML;
    });
    expect(new Set(shapes).size).toBe(links.length);
    expect(container.querySelectorAll('svg')).toHaveLength(4);
  });

  it('keeps each tab named by its text alone, not by its icon', () => {
    renderBar();
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'لمعالجي' })).toBeInTheDocument();
  });

  it('keeps the bar as wide as the app on a large screen', () => {
    renderBar();
    expect(screen.getByRole('navigation').className).toMatch(/max-w-xl/);
  });

  it('makes each tab at least 44px tall', () => {
    renderBar();
    for (const a of screen.getAllByRole('link')) expect(a.className).toMatch(/min-h-14|min-h-16/);
  });
});

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
