import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Collapsible } from './Collapsible';

describe('Collapsible', () => {
  it('is closed by default, hides its content from assistive tech, and opens and closes by button', async () => {
    render(<Collapsible title="المصادر">محتوى مخفي</Collapsible>);
    const toggle = screen.getByRole('button', { name: 'المصادر' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'المصادر' })).toHaveTextContent('محتوى مخفي');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('can start open', () => {
    render(<Collapsible title="أ" defaultOpen>داخل</Collapsible>);
    expect(screen.getByRole('button', { name: 'أ' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region')).toHaveTextContent('داخل');
  });
});
