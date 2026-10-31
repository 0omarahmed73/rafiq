import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chip } from './Chip';

function Stateful() {
  const [on, setOn] = useState(false);
  return <Chip label="حزن" selected={on} onToggle={() => setOn((v) => !v)} />;
}

describe('Chip', () => {
  it('toggles aria-pressed when pressed', async () => {
    const user = userEvent.setup();
    render(<Stateful />);
    const chip = screen.getByRole('button', { name: 'حزن' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('is at least 44px tall', () => {
    render(<Chip label="حزن" selected={false} onToggle={() => {}} />);
    expect(screen.getByRole('button').className).toMatch(/min-h-11/);
  });
});
