import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

function Stateful() {
  const [on, setOn] = useState(false);
  return <Switch label="للنقاش في الجلسة القادمة" checked={on} onChange={setOn} />;
}

describe('Switch', () => {
  it('toggles aria-checked on click', async () => {
    const user = userEvent.setup();
    render(<Stateful />);
    const sw = screen.getByRole('switch', { name: 'للنقاش في الجلسة القادمة' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles with the Space key', async () => {
    const user = userEvent.setup();
    render(<Stateful />);
    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('is at least 44px tall', () => {
    render(<Switch label="x" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch').className).toMatch(/min-h-11/);
  });
});
