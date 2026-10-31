import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CalmPage } from './CalmPage';

function renderCalm() {
  return render(
    <MemoryRouter>
      <CalmPage />
    </MemoryRouter>,
  );
}

describe('CalmPage', () => {
  it('guides a slow breath with an in-breath and a longer out-breath', () => {
    renderCalm();
    const section = screen.getByRole('region', { name: 'تنفّس هادئ' });
    expect(within(section).getByText(/شهيق/)).toBeInTheDocument();
    expect(within(section).getByText(/زفير/)).toBeInTheDocument();
  });

  it('offers the five-step grounding exercise as five items', () => {
    renderCalm();
    const list = screen.getByRole('list', { name: 'تمرين التأريض' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
  });

  it('tells the user to reach emergency help or a trusted person when in danger', () => {
    renderCalm();
    expect(
      screen.getByText(
        'إن شعرتُ بأنني قد أكون في خطر، أتواصل الآن مع خدمات الطوارئ في بلدي أو مع شخص أثق به.',
      ),
    ).toBeInTheDocument();
  });

  it('contains no phone number or other long digit sequence', () => {
    const { container } = renderCalm();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\d{3,}/);
    expect(text).not.toMatch(/[٠-٩]{3,}/);
  });

  it('can always lead back home', () => {
    renderCalm();
    expect(screen.getByRole('link', { name: /الرئيسية/ })).toHaveAttribute('href', '/');
  });
});
