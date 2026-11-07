import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddItemRow } from './AddItemRow';

describe('AddItemRow', () => {
  it('adds the typed text, then clears the field and keeps it focused for the next item', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddItemRow label="عنصر" onAdd={onAdd} />);
    const field = screen.getByRole('textbox', { name: 'عنصر' });
    await user.type(field, 'أول عنصر');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));

    expect(onAdd).toHaveBeenCalledWith('أول عنصر');
    expect(field).toHaveValue('');
    expect(field).toHaveFocus();
  });

  it('takes several items in a row without the field being reopened', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddItemRow label="عنصر" onAdd={onAdd} />);
    await user.type(screen.getByRole('textbox', { name: 'عنصر' }), 'أول');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    await user.type(screen.getByRole('textbox', { name: 'عنصر' }), 'ثانٍ');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));

    expect(onAdd.mock.calls).toEqual([['أول'], ['ثانٍ']]);
  });

  it('ignores blank input', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddItemRow label="عنصر" onAdd={onAdd} />);
    await user.type(screen.getByRole('textbox', { name: 'عنصر' }), '   ');
    await user.click(screen.getByRole('button', { name: 'إضافة' }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows a done button that closes the row only when one is given', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<AddItemRow label="عنصر" onAdd={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'تم' })).not.toBeInTheDocument();

    rerender(<AddItemRow label="عنصر" onAdd={() => undefined} onDone={onDone} />);
    await user.click(screen.getByRole('button', { name: 'تم' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
